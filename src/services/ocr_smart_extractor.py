"""
Smart OCR Extractor - Tối ưu chi phí và tốc độ OCR

Three extraction strategies:
- FAST_TEXT: PyMuPDF for text-native PDFs (free, ~0.1s/page)
- VISION_API: Vision API for scanned/mixed documents (OpenAI or Gemini)
"""

import io
from enum import Enum
from dataclasses import dataclass
from typing import Optional

import fitz  # PyMuPDF
from PIL import Image, ImageFilter


class ExtractionStrategy(str, Enum):
    FAST_TEXT = "fast_text"      # PyMuPDF - text-native PDFs (free)
    VISION_API = "vision_api"    # Vision API - OpenAI or Gemini


@dataclass
class PageAnalysis:
    """Analysis result for a single page."""
    page_num: int
    char_count: int
    image_count: int
    text_coverage: float  # 0.0 to 1.0
    has_formulas: bool
    is_scanned: bool  # True if no extractable text
    extraction_recommended: ExtractionStrategy


@dataclass
class DocumentAnalysis:
    """Analysis result for entire document."""
    total_pages: int
    scanned_pages: int
    text_pages: int
    mixed_pages: int
    avg_chars_per_page: float
    has_formulas: bool
    recommended_strategy: ExtractionStrategy
    strategy_reason: str


class DocumentAnalyzer:
    """
    Analyzes PDF pages to determine optimal extraction strategy.

    Strategy decision:
    - >70% text coverage, >500 avg chars/page → FAST_TEXT
    - >50% scanned pages → VISION_API
    - Complex/mixed with formulas → VISION_API
    """

    FORMULA_CHARS = {'∑', '∫', '∂', '∇', '√', '∞', '±', '≤', '≥', '≠', '≈', 'π', 'θ'}
    FORMULA_PATTERNS = [
        r'\\frac', r'\\sum', r'\\int', r'\\partial',
        r'\{.*\}', r'\$.*\$', r'\(.*\)'
    ]

    SAMPLE_PAGES = 5  # Sample first N pages for analysis

    def analyze(self, file_bytes: bytes, file_name: str) -> DocumentAnalysis:
        """Analyze document and return recommended strategy."""
        suffix = file_name.lower().split('.')[-1]

        if suffix != 'pdf':
            return DocumentAnalysis(
                total_pages=1,
                scanned_pages=1,
                text_pages=0,
                mixed_pages=0,
                avg_chars_per_page=0,
                has_formulas=False,
                recommended_strategy=ExtractionStrategy.VISION_API,
                strategy_reason="Non-PDF file, using OCR"
            )

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        try:
            total_pages = len(doc)

            sample_indices = self._get_sample_indices(total_pages)
            page_analyses = []

            for idx in sample_indices:
                page = doc[idx]
                analysis = self._analyze_page(page, idx)
                page_analyses.append(analysis)

            if total_pages <= 10:
                for idx in range(total_pages):
                    if idx not in sample_indices:
                        page = doc[idx]
                        analysis = self._analyze_page(page, idx)
                        page_analyses.append(analysis)
        finally:
            doc.close()
        return self._aggregate_analysis(page_analyses, total_pages)

    def _get_sample_indices(self, total_pages: int) -> list[int]:
        """Get page indices to sample for analysis."""
        if total_pages <= self.SAMPLE_PAGES:
            return list(range(total_pages))
        return [0, 1, total_pages // 2, total_pages - 2, total_pages - 1]

    def _analyze_page(self, page: fitz.Page, page_num: int) -> PageAnalysis:
        """Analyze a single page."""
        text = page.get_text("text")
        char_count = len(text.strip())

        image_list = page.get_images(full=True)
        image_count = len(image_list)

        page_rect = page.rect
        page_area = page_rect.width * page_rect.height
        text_blocks = page.get_text("blocks")
        text_area = sum(abs((b[2] - b[0]) * (b[3] - b[1])) for b in text_blocks if (b[3] - b[1]) > 5)
        text_coverage = min(1.0, text_area / page_area) if page_area > 0 else 0

        has_formulas = self._detect_formulas(text)
        is_scanned = char_count < 100 and image_count > 0

        if char_count > 500 and text_coverage > 0.7 and image_count <= 1:
            strategy = ExtractionStrategy.FAST_TEXT
        else:
            strategy = ExtractionStrategy.VISION_API

        return PageAnalysis(
            page_num=page_num,
            char_count=char_count,
            image_count=image_count,
            text_coverage=text_coverage,
            has_formulas=has_formulas,
            is_scanned=is_scanned,
            extraction_recommended=strategy
        )

    def _detect_formulas(self, text: str) -> bool:
        """Detect if text contains mathematical formulas."""
        import re

        for char in self.FORMULA_CHARS:
            if char in text:
                return True

        for pattern in self.FORMULA_PATTERNS:
            if re.search(pattern, text):
                return True

        return False

    def _aggregate_analysis(self, page_analyses: list[PageAnalysis], total_pages: int) -> DocumentAnalysis:
        """Aggregate page analyses into document-level recommendation."""
        scanned_pages = sum(1 for p in page_analyses if p.is_scanned)
        text_pages = sum(1 for p in page_analyses if p.extraction_recommended == ExtractionStrategy.FAST_TEXT)
        avg_chars = sum(p.char_count for p in page_analyses) / len(page_analyses) if page_analyses else 0
        has_formulas = any(p.has_formulas for p in page_analyses)

        scanned_ratio = scanned_pages / len(page_analyses) if page_analyses else 0
        text_ratio = text_pages / len(page_analyses) if page_analyses else 0

        if text_ratio > 0.7 and avg_chars > 500 and not has_formulas:
            strategy = ExtractionStrategy.FAST_TEXT
            reason = f"Text-native document ({text_ratio:.0%} pages with good text extraction)"
        elif scanned_ratio > 0.5:
            strategy = ExtractionStrategy.VISION_API
            reason = f"Scanned document ({scanned_ratio:.0%} scanned pages)"
        elif has_formulas:
            strategy = ExtractionStrategy.VISION_API
            reason = "Document contains mathematical formulas"
        else:
            strategy = ExtractionStrategy.VISION_API
            reason = "Mixed content, using Vision API"

        return DocumentAnalysis(
            total_pages=total_pages,
            scanned_pages=int(scanned_ratio * total_pages),
            text_pages=int(text_ratio * total_pages),
            mixed_pages=total_pages - int(scanned_ratio * total_pages) - int(text_ratio * total_pages),
            avg_chars_per_page=avg_chars,
            has_formulas=has_formulas,
            recommended_strategy=strategy,
            strategy_reason=reason
        )


class FastTextExtractor:
    """Fast text extraction using PyMuPDF - for text-native PDFs."""

    def extract(self, file_bytes: bytes, file_name: str) -> str:
        """Extract text preserving layout using PyMuPDF."""
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        try:
            results = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text")
                cleaned = self._clean_text(text)
                results.append(f"## Page {page_num + 1}\n\n{cleaned}")

            return "\n\n".join(results)
        finally:
            doc.close()

    def _clean_text(self, text: str) -> str:
        """Clean and format extracted text."""
        import re

        text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)

        paragraphs = text.split('\n\n')
        cleaned_paragraphs = []

        for para in paragraphs:
            lines = para.split('\n')
            joined_lines = []
            current = ""

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue

                if current and current[-1] not in '.!?;:,':
                    current = current + " " + stripped
                else:
                    if current:
                        joined_lines.append(current)
                    current = stripped

            if current:
                joined_lines.append(current)

            cleaned_paragraphs.append('\n'.join(joined_lines))

        return '\n\n'.join(cleaned_paragraphs)


class VisionAPIExtractor:
    """Vision API extractor - highest quality but paid."""

    def __init__(self, provider: str = "openai"):
        self.provider = provider

    def extract(self, images: list[bytes], prompt: str = None) -> str:
        """Extract text using Vision API (Gemini or OpenAI)."""
        if prompt is None:
            prompt = """You are an OCR system. Extract ALL text from this document image exactly as shown.

RULES:
- Copy Vietnamese characters EXACTLY: ă, â, đ, ê, ô, ơ, ư, á, à, ả, ã, ạ, etc.
- Do NOT interpret or correct the text
- Keep line breaks and spacing as-is
- If text is garbled in the image, copy it as-is (don't fix it)
- Output ONLY the extracted text, no explanations"""

        if self.provider == 'openai':
            return self._extract_openai(images, prompt)
        else:
            return self._extract_gemini(images, prompt)

    def _fix_vietnamese_encoding(self, text: str) -> str:
        """
        Fix double-encoded Vietnamese text using comprehensive corrector.
        """
        from src.services.vietnamese_encoding_fixer import VietnameseEncodingCorrector
        corrector = VietnameseEncodingCorrector()
        return corrector.fix(text)

    def _parse_gemini_response(self, response_text: str, batch_size: int, batch_num: int) -> list[str]:
        """
        Parse per-page text from Gemini's combined response.
        Gemini often returns text structured as 'Page N: content' markers.
        Falls back to equal splits if no clear markers found.
        """
        if not response_text or not response_text.strip():
            return [""] * batch_size

        import re
        # Try to find per-page sections using pattern "Page N:" or similar
        page_pattern = re.compile(r'(?:Page\s*(\d+)|###\s*Page\s*(\d+)|##\s*Page\s*(\d+))[:\s]*(.+?)(?=(?:Page\s*\d+|###\s*Page\s*\d+|##\s*Page\s*\d+)|$)', re.DOTALL | re.IGNORECASE)

        matches = list(page_pattern.finditer(response_text))
        if matches and len(matches) >= batch_size:
            # Found clear per-page markers, use them
            page_texts = []
            for match in matches[:batch_size]:
                content = match.group(4)  # group(4) is always the content (.+?)
                if content is None:
                    content = ""
                page_texts.append(content.strip())
            # Fill remaining with empty if not enough
            while len(page_texts) < batch_size:
                page_texts.append("")
            return page_texts

        # Fallback: split by looking for "Page N:" markers without regex complexity
        lines = response_text.split('\n')
        page_sections = []
        current_section = []
        found_first_marker = False

        for line in lines:
            # Check if line starts a new page marker
            page_match = re.match(r'^(?:Page\s*)?(\d+)[\.:\s]', line.strip(), re.IGNORECASE)
            if page_match:
                if found_first_marker and current_section:
                    # Save current section when we encounter a new page marker
                    page_sections.append('\n'.join(current_section))
                    current_section = []
                found_first_marker = True
            current_section.append(line)

        if current_section:
            page_sections.append('\n'.join(current_section))

        if len(page_sections) >= batch_size:
            return page_sections[:batch_size]

        # Not enough sections found - return equal splits
        avg_len = len(response_text) // batch_size if batch_size > 0 else 1
        page_texts = []
        for i in range(batch_size):
            start = i * avg_len
            end = (i + 1) * avg_len if i < batch_size - 1 else len(response_text)
            page_texts.append(response_text[start:end].strip())

        return page_texts if page_texts else [""] * batch_size

    def _extract_openai(self, images: list[bytes], prompt: str) -> str:
        """Extract using OpenAI GPT-4o Vision with high quality settings."""
        import base64
        import time
        from openai import OpenAI
        from src.core.config import settings

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        MAX_RETRIES = 3
        RETRY_DELAY = 2

        def call_single_with_retry(page_num: int, image_data: bytes) -> str:
            for attempt in range(MAX_RETRIES):
                try:
                    response = client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/png;base64,{base64.b64encode(image_data).decode()}",
                                            "detail": "original"
                                        }
                                    },
                                    {"type": "text", "text": f"Page {page_num}. {prompt}"}
                                ]
                            }
                        ],
                        max_tokens=8192
                    )
                    raw_text = response.choices[0].message.content
                    fixed_text = self._fix_vietnamese_encoding(raw_text)
                    return f"## Page {page_num}\n\n{fixed_text}"
                except Exception as e:
                    if attempt == MAX_RETRIES - 1:
                        raise Exception(f"GPT-4o Vision failed: {str(e)[:200]}")
                    time.sleep(RETRY_DELAY * (attempt + 1))

        import concurrent.futures
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(call_single_with_retry, i+1, img): i for i, img in enumerate(images)}
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        import re
        def parse_page_num(text: str) -> int:
            """Parse page number from response text, with error handling."""
            try:
                # Try "## Page N" markdown format first
                match = re.search(r'##\s*Page\s*(\d+)', text[:100])
                if match:
                    return int(match.group(1))
                # Fallback: "Page N:" format anywhere in first 200 chars
                match = re.search(r'Page\s*(\d+)[\.:\s]', text[:200])
                if match:
                    return int(match.group(1))
                # Fallback: any leading number after markdown chars
                match = re.search(r'^[*#\-\s]*(\d+)', text.split('\n')[0])
                if match:
                    return int(match.group(1))
                return 0  # Will sort to front
            except (ValueError, IndexError):
                return 0

        results.sort(key=lambda x: parse_page_num(x))
        return "\n\n".join(results)

    def _extract_gemini(self, images: list[bytes], prompt: str) -> str:
        """Extract using Google Gemini Vision."""
        import time
        from google import genai
        from google.genai import types
        from src.core.config import settings

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        BATCH_SIZE = 10
        MAX_RETRIES = 3
        RETRY_DELAY = 2

        results = []
        for i in range(0, len(images), BATCH_SIZE):
            batch = images[i:i + BATCH_SIZE]
            batch_num = i + 1

            for attempt in range(MAX_RETRIES):
                try:
                    contents = []
                    for j, img_bytes in enumerate(batch):
                        page_num = batch_num + j
                        if len(img_bytes) < 100 or not img_bytes.startswith(b'\x89PNG'):
                            results.append((page_num, f"## Page {page_num}\n\n[Invalid image]"))
                            continue

                        image_part = types.Part(
                            inline_data=types.Blob(
                                mime_type="image/png",
                                data=img_bytes
                            )
                        )
                        text_part = types.Part(text=f"Page {page_num}: {prompt}")
                        contents.append(types.Content(parts=[image_part, text_part]))

                    if not contents:
                        # All images in batch were invalid - append placeholder, continue processing
                        for j in range(len(batch)):
                            page_num = batch_num + j
                            results.append((page_num, f"## Page {page_num}\n\n[Invalid image]"))
                        continue

                    response = client.models.generate_content(
                        model="gemini-1.5-flash",
                        contents=contents
                    )

                    response_text = response.text if hasattr(response, 'text') and response.text else ""
                    # Parse per-page content from combined response
                    # Gemini returns structured text we can split by page markers
                    page_texts = self._parse_gemini_response(response_text, len(batch), batch_num)
                    for j, text in enumerate(page_texts):
                        page_num = batch_num + j
                        results.append((page_num, text))
                    break
                except Exception as e:
                    if attempt == MAX_RETRIES - 1:
                        raise Exception(f"Gemini batch failed: {str(e)[:200]}")
                    time.sleep(RETRY_DELAY * (attempt + 1))

        formatted = []
        for page_num, text in sorted(results, key=lambda x: x[0]):
            fixed_text = self._fix_vietnamese_encoding(text) if text else text
            formatted.append(f"## Page {page_num}\n\n{fixed_text}")

        return "\n\n".join(formatted) if formatted else "[No text extracted]"


class ExtractionRouter:
    """Main router that orchestrates extraction based on analysis."""

    def __init__(self, force_strategy: Optional[ExtractionStrategy] = None):
        self.analyzer = DocumentAnalyzer()
        self.force_strategy = force_strategy

    def extract(self, file_bytes: bytes, file_name: str, use_vision_fallback: bool = True) -> tuple[str, DocumentAnalysis]:
        """Extract text from PDF using smart routing based on document analysis."""
        analysis = self.analyzer.analyze(file_bytes, file_name)
        strategy = self.force_strategy or analysis.recommended_strategy

        print(f"[DEBUG] OCR Strategy: {strategy.value} - {analysis.strategy_reason}")

        # Use smart routing - execute based on recommended strategy
        if strategy == ExtractionStrategy.FAST_TEXT:
            print(f"[DEBUG] Using FastTextExtractor (PyMuPDF) for text-native PDF")
            fast_extractor = FastTextExtractor()
            markdown = fast_extractor.extract(file_bytes, file_name)
            analysis.scanned_pages = 0
            return markdown, analysis

        # For VISION_API or when analysis recommends Vision
        print(f"[DEBUG] Using VisionAPIExtractor for scanned/mixed document")
        images = self._convert_to_images(file_bytes, file_name)
        total_pages = len(images)

        vision_extractor = VisionAPIExtractor()
        markdown = vision_extractor.extract(images)

        analysis.scanned_pages = total_pages
        return markdown, analysis

    def _convert_to_images(self, file_bytes: bytes, file_name: str) -> list[bytes]:
        """Convert PDF or image to list of high-quality PNG image bytes."""
        import tempfile
        import os

        suffix = file_name.lower().split('.')[-1]
        print(f"[DEBUG] Converting: {file_name}, suffix: {suffix}, size: {len(file_bytes)} bytes")

        if suffix == "pdf":
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            try:
                images = []
                num_pages = len(doc)
                print(f"[DEBUG] PDF has {num_pages} pages")

                with tempfile.TemporaryDirectory() as tmpdir:
                    for page_num in range(num_pages):
                        page = doc[page_num]

                        # Render at VERY high DPI for best OCR quality
                        # Use 600 DPI for Vietnamese text which can be small
                        pix = page.get_pixmap(dpi=600, colorspace=fitz.csRGB, alpha=False)

                        tmp_path = os.path.join(tmpdir, f"page_{page_num}.png")
                        pix.save(tmp_path)

                        # Load and enhance image for better OCR
                        img = Image.open(tmp_path)
                        try:
                            # Apply sharpening and contrast enhancement
                            from PIL import ImageEnhance
                            enhancer = ImageEnhance.Sharpness(img)
                            img = enhancer.enhance(2.0)
                            enhancer = ImageEnhance.Contrast(img)
                            img = enhancer.enhance(1.2)

                            # Save as high-quality PNG
                            img_bytes_io = io.BytesIO()
                            img.save(img_bytes_io, format='PNG', optimize=True)
                            img_bytes = img_bytes_io.getvalue()

                            is_png = img_bytes[:4] == b'\x89PNG'
                            print(f"[DEBUG] Page {page_num}: {len(img_bytes)} bytes, PNG: {is_png}, DPI: 600")

                            if is_png and len(img_bytes) > 1000:
                                images.append(img_bytes)
                            else:
                                # Fallback to JPEG
                                img_bytes_io = io.BytesIO()
                                img.convert('RGB').save(img_bytes_io, format='JPEG', quality=95)
                                images.append(img_bytes_io.getvalue())
                        finally:
                            img.close()

                return images
            finally:
                doc.close()
        else:
            print(f"[DEBUG] Non-PDF file, PIL conversion")
            try:
                from PIL import ImageEnhance

                img = Image.open(io.BytesIO(file_bytes))
                try:
                    enhancer = ImageEnhance.Sharpness(img)
                    img = enhancer.enhance(2.0)
                    img_bytes_io = io.BytesIO()
                    img.convert('RGB').save(img_bytes_io, format='PNG', optimize=True)
                    return [img_bytes_io.getvalue()]
                finally:
                    img.close()
            except Exception as e:
                print(f"[DEBUG] PIL conversion failed: {e}")
                return [file_bytes]
