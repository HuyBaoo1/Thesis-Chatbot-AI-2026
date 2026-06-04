import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from src.core.config import settings


DEFAULT_PARSE_INSTRUCTIONS = (
    "Extract the document as high-quality markdown for downstream RAG use. "
    "Preserve headings, lists, tables, emphasis, links, and reading order. "
    "Keep Vietnamese text accurate. Do not summarize or omit content."
)


@dataclass
class DocumentParseResult:
    markdown: str
    page_count: int | None = None
    metadata: dict[str, Any] | None = None
    raw_status: dict[str, Any] | None = None


class DocumentParseError(RuntimeError):
    pass


class DocumentParserClient:
    def __init__(self) -> None:
        if not settings.OCR_PARSE_API_KEY:
            raise DocumentParseError("OCR parse provider is not configured")

        if not settings.OCR_PARSE_API_BASE_URL:
            raise DocumentParseError("OCR parse base URL is not configured")

        self.base_url = settings.OCR_PARSE_API_BASE_URL.rstrip("/")
        self.timeout = settings.OCR_PARSE_TIMEOUT_SECONDS
        self.poll_interval = settings.OCR_PARSE_POLL_INTERVAL_SECONDS
        self.headers = {
            "Authorization": f"Bearer {settings.OCR_PARSE_API_KEY}",
            "Accept": "application/json",
        }

    def parse_bytes(self, *, file_bytes: bytes, file_name: str) -> DocumentParseResult:
        job_id = self._submit_job(file_bytes=file_bytes, file_name=file_name)
        status_payload = self._wait_for_completion(job_id)
        markdown = self._fetch_markdown(job_id)
        metadata = self._fetch_json_result(job_id)
        page_count = self._extract_page_count(status_payload, metadata)
        return DocumentParseResult(
            markdown=markdown,
            page_count=page_count,
            metadata=metadata,
            raw_status=status_payload,
        )

    def _submit_job(self, *, file_bytes: bytes, file_name: str) -> str:
        data = {
            "result_type": "markdown",
            "parsing_instruction": DEFAULT_PARSE_INSTRUCTIONS,
        }
        files = {
            "file": (file_name, file_bytes, "application/octet-stream"),
        }
        url = f"{self.base_url}/api/parsing/upload"
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(url, headers=self.headers, data=data, files=files)
        if response.is_error:
            raise DocumentParseError(
                f"Document parse upload failed: {response.status_code} {response.text[:500]}"
            )

        payload = response.json()
        job_id = (
            payload.get("id")
            or payload.get("job_id")
            or payload.get("data", {}).get("id")
            or payload.get("data", {}).get("job_id")
        )
        if not job_id:
            raise DocumentParseError(
                f"Document parse upload response missing job id: {json.dumps(payload)[:500]}"
            )
        return str(job_id)

    def _wait_for_completion(self, job_id: str) -> dict[str, Any]:
        deadline = time.time() + self.timeout
        url = f"{self.base_url}/api/parsing/job/{job_id}"
        last_payload: dict[str, Any] | None = None

        with httpx.Client(timeout=self.timeout) as client:
            while time.time() < deadline:
                response = client.get(url, headers=self.headers)
                if response.is_error:
                    raise DocumentParseError(
                        f"Document parse status check failed: {response.status_code} {response.text[:500]}"
                    )

                payload = response.json()
                last_payload = payload
                status = self._normalize_status(payload)
                if status in {"success", "completed", "done"}:
                    return payload
                if status in {"error", "failed", "cancelled"}:
                    raise DocumentParseError(
                        f"Document parse job failed: {json.dumps(payload)[:500]}"
                    )

                time.sleep(self.poll_interval)

        raise DocumentParseError(
            f"Document parse job timed out after {self.timeout} seconds: {json.dumps(last_payload or {})[:500]}"
        )

    def _fetch_markdown(self, job_id: str) -> str:
        url = f"{self.base_url}/api/parsing/job/{job_id}/result/markdown"
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(url, headers=self.headers)
        if response.is_error:
            raise DocumentParseError(
                f"Document parse markdown fetch failed: {response.status_code} {response.text[:500]}"
            )

        content_type = response.headers.get("content-type", "").lower()
        if "application/json" in content_type:
            try:
                payload = response.json()
            except ValueError as exc:
                raise DocumentParseError(f"Document parse markdown response is invalid JSON: {exc}") from exc

            if isinstance(payload, dict):
                data_payload = payload.get("data") if isinstance(payload.get("data"), dict) else {}
                markdown = (
                    payload.get("markdown")
                    or payload.get("content")
                    or payload.get("result")
                    or data_payload.get("markdown")
                    or data_payload.get("content")
                )
                if isinstance(markdown, str) and markdown.strip():
                    return markdown

            raise DocumentParseError(
                f"Document parse markdown response missing markdown field: {json.dumps(payload)[:500]}"
            )

        return response.text

    def _fetch_json_result(self, job_id: str) -> dict[str, Any] | None:
        url = f"{self.base_url}/api/parsing/job/{job_id}/result/json"
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(url, headers=self.headers)
        if response.is_error:
            return None
        try:
            payload = response.json()
        except ValueError:
            return None
        if isinstance(payload, dict):
            return payload
        return {"result": payload}

    @staticmethod
    def _normalize_status(payload: dict[str, Any]) -> str:
        candidates = [
            payload.get("status"),
            payload.get("job_status"),
            payload.get("data", {}).get("status") if isinstance(payload.get("data"), dict) else None,
        ]
        for item in candidates:
            if isinstance(item, str) and item.strip():
                return item.strip().lower()
        return "pending"

    @staticmethod
    def _extract_page_count(status_payload: dict[str, Any], metadata: dict[str, Any] | None) -> int | None:
        candidates: list[Any] = [
            status_payload.get("pages"),
            status_payload.get("page_count"),
            status_payload.get("num_pages"),
        ]
        if metadata:
            candidates.extend(
                [
                    metadata.get("pages"),
                    metadata.get("page_count"),
                    metadata.get("num_pages"),
                    metadata.get("metadata", {}).get("pages") if isinstance(metadata.get("metadata"), dict) else None,
                ]
            )
        for item in candidates:
            if isinstance(item, int):
                return item
            if isinstance(item, str) and item.isdigit():
                return int(item)
        return None
