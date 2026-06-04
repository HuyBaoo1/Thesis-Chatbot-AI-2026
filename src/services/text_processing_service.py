from pathlib import Path
import re

from fastapi import HTTPException
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter


_NEWLINE_PATTERN = re.compile(r"\n{3,}")
_CODE_BLOCK_PATTERN = re.compile(r"```.*?```", re.DOTALL)


def extract_text(*, file_name: str, file_bytes: bytes) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix != ".md":
        raise HTTPException(status_code=400, detail="Only .md files are supported")

    decoded = file_bytes.decode("utf-8", errors="replace")
    return clean_text(decoded)


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00A0", " ")

    text = "\n".join(line.rstrip() for line in text.split("\n"))
    text = _NEWLINE_PATTERN.sub("\n\n", text)

    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = 1200,
    chunk_overlap: int = 200,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")
    if chunk_overlap < 0:
        raise ValueError("chunk_overlap must be greater than or equal to 0")
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")
    if not text.strip():
        return []
    return _chunk_markdown_text(
        text,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

def _chunk_markdown_text(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[str]:
    chunk_dicts = _chunk_markdown_text_with_metadata(
        text,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    results: list[str] = []
    for item in chunk_dicts:
        header_markdown = item["header_markdown"]
        content = item["content"]

        if header_markdown and not content.lstrip().startswith("#"):
            results.append(f"{header_markdown}\n\n{content}".strip())
        else:
            results.append(content.strip())

    return results


def _chunk_markdown_text_with_metadata(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[dict]:
    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "h1"),
            ("##", "h2"),
            ("###", "h3"),
            ("####", "h4"),
        ],
        strip_headers=False,
    )

    header_docs: list[Document] = header_splitter.split_text(text)
    splitter = _build_recursive_splitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    chunks: list[dict] = []

    for doc in header_docs:
        section = clean_text(doc.page_content)
        if not section:
            continue

        metadata = dict(doc.metadata)
        header_path = _build_header_path(metadata)
        header_markdown = _build_header_markdown(metadata)

        if _is_small_enough(section, chunk_size):
            chunks.append(
                {
                    "content": section,
                    "header_path": header_path,
                    "header_markdown": header_markdown,
                }
            )
            continue

        protected_parts = _split_with_code_block_protection(section)
        for part in protected_parts:
            part = clean_text(part)
            if not part:
                continue

            if _is_fenced_code_block(part):
                sub_chunks = _split_large_code_block(
                    part,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                )
            else:
                sub_chunks = splitter.split_text(part)

            for chunk in sub_chunks:
                chunk = clean_text(chunk)
                if not chunk:
                    continue

                chunks.append(
                    {
                        "content": chunk,
                        "header_path": header_path,
                        "header_markdown": header_markdown,
                    }
                )

    return chunks


def _build_recursive_splitter(
    chunk_size: int,
    chunk_overlap: int,
) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n- ",
            "\n* ",
            "\n1. ",
            "\n",
            ". ",
            " ",
            "",
        ],
        keep_separator=True,
    )


def _build_header_path(metadata: dict) -> str:
    parts: list[str] = []
    for key in ("h1", "h2", "h3", "h4"):
        value = metadata.get(key)
        if value:
            parts.append(str(value).strip())
    return " > ".join(parts)


def _build_header_markdown(metadata: dict) -> str:
    lines: list[str] = []
    for level, key in enumerate(("h1", "h2", "h3", "h4"), start=1):
        value = metadata.get(key)
        if value:
            lines.append(f'{"#" * level} {str(value).strip()}')
    return "\n".join(lines)


def _split_with_code_block_protection(text: str) -> list[str]:
    parts: list[str] = []
    last_end = 0

    for match in _CODE_BLOCK_PATTERN.finditer(text):
        before = text[last_end:match.start()]
        code_block = match.group(0)

        if before.strip():
            parts.append(before)
        if code_block.strip():
            parts.append(code_block)

        last_end = match.end()

    tail = text[last_end:]
    if tail.strip():
        parts.append(tail)

    return parts


def _split_large_code_block(
    code_block: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[str]:
    if _is_small_enough(code_block, chunk_size):
        return [code_block]

    line_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n", " ", ""],
        keep_separator=True,
    )
    return line_splitter.split_text(code_block)


def _is_fenced_code_block(text: str) -> bool:
    stripped = text.strip()
    return stripped.startswith("```") and stripped.endswith("```")


def _is_small_enough(text: str, chunk_size: int) -> bool:
    return len(text) <= chunk_size