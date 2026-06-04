"""
Vietnamese Encoding Corrector
Fixes Vietnamese text corruption from OCR/PDF processing.

Root cause: PDF text layer encoding corruption when saved from web pages,
or Vision API output issues with Vietnamese characters.

Solution: Comprehensive pattern matching and encoding conversion.
"""

import re
from typing import Optional


class VietnameseEncodingCorrector:
    """
    Fixes double-encoded or mojibake Vietnamese text.

    Common patterns that need fixing:
    - 'Tá»«' → 'Từ' (UTF-8 bytes as Latin-1)
    - 'chÆ°Æ¡ng' → 'chương'
    - 'nhÃ¢n' → 'nhân'
    """

    # Ordered regex patterns (longer/complex first)
    REGEX_PATTERNS: list[tuple[str, str]] = [
        # 3-char patterns
        (r'Ã¡', 'á'), (r'Ã ', 'à'), (r'Ã£', 'ã'), (r'Ã¢', 'â'),
        (r'Ã©', 'é'), (r'Ã¨', 'è'), (r'Ãª', 'ê'),
        (r'Ã­', 'í'), (r'Ã¬', 'ì'), (r'Ã®', 'î'),
        (r'Ã³', 'ó'), (r'Ã²', 'ò'), (r'Ãµ', 'õ'), (r'Ã´', 'ô'),
        (r'Ã¹', 'ú'), (r'Ã»', 'û'), (r'Ã½', 'ý'),
        # 2-char patterns
        (r'Æ°', 'ư'), (r'Æ¡', 'ơ'),
        (r'Ã', 'ă'),
        # Quote patterns
        (r'â€™', "'"), (r'â€˜', "'"), (r'â€œ', '"'), (r'â€', '"'),
        (r'â€"', '—'), (r'â€"', '–'),
    ]

    # Direct character mappings
    CHAR_MAPPINGS: dict[str, str] = {
        'ï¿½': 'ư',  # UTF-8 as Latin-1 for 'ư'
        'áº¡': 'ạ', 'áº£': 'ả', 'áº©': 'ẹ', 'áº«': 'ẻ',
        'áº­': 'ệ', 'áº±': 'đ', 'á»': 'ụ', 'á»¡': 'ỉ',
        'á»¥': 'ứ', 'á»§': 'ử', 'á»‰': 'ĩ', 'á»': 'ờ',
        'á»': 'ợ', 'á»§': 'ừ',
    }

    def __init__(self):
        self._regex = None
        self._build_regex()

    def _build_regex(self):
        """Build combined regex for efficiency."""
        patterns = [re.escape(p) for p, _ in self.REGEX_PATTERNS]
        if patterns:
            self._regex = re.compile('|'.join(patterns))

    def fix(self, text: str) -> str:
        """
        Main entry point - fix encoding in text.

        Args:
            text: Input text with possible encoding issues

        Returns:
            Fixed text with correct Vietnamese encoding
        """
        if not text:
            return text

        result = text

        # Step 1: Apply regex patterns
        if self._regex:
            result = self._regex.sub(
                lambda m: self._get_replacement(m.group()),
                result
            )

        # Step 2: Apply character mappings
        for garbled, correct in self.CHAR_MAPPINGS.items():
            result = result.replace(garbled, correct)

        # Step 3: Try encoding conversion (last resort)
        result = self._try_encoding_fix(result)

        return result

    def _get_replacement(self, match: str) -> str:
        """Get replacement for matched pattern."""
        for pattern, replacement in self.REGEX_PATTERNS:
            if match == pattern:
                return replacement
        return match

    def _try_encoding_fix(self, text: str) -> str:
        """
        Try to recover text using encoding conversion.

        Double encoding: UTF-8 → Latin-1 → UTF-8
        To recover: encode as Latin-1 (get raw bytes) → decode as UTF-8
        """
        # First try: filter out non-Latin-1 chars, encode, decode
        filtered = ''.join(c for c in text if ord(c) < 256 or c in 'ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ')

        try:
            # Encode as Latin-1 to get raw bytes, then decode as UTF-8
            converted = filtered.encode('latin-1', errors='replace').decode('utf-8', errors='replace')

            # Check if conversion improved things
            if self._is_valid_vietnamese(converted):
                return converted
        except Exception:
            pass

        # Second try: CP1252 (Windows Vietnamese)
        try:
            converted = text.encode('cp1252', errors='replace').decode('utf-8', errors='replace')
            if self._is_valid_vietnamese(converted) and converted != text:
                return converted
        except Exception:
            pass

        return text

    def _is_valid_vietnamese(self, text: str) -> bool:
        """
        Check if text is valid Vietnamese using heuristics.

        Returns True if text appears to be correctly encoded Vietnamese.
        """
        if not text:
            return False

        # Count replacement characters
        if text.count('') > len(text) * 0.15:
            return False

        # Check for Vietnamese diacritical marks
        vietnamese_chars = set('ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ')
        vn_count = sum(1 for c in text if c in vietnamese_chars)

        if vn_count > 5:
            return True

        # Check for common Vietnamese words
        common = ['và', 'của', 'là', 'có', 'được', 'trong', 'cho', 'với', 'này', 'không']
        text_lower = text.lower()
        if any(word in text_lower for word in common):
            return True

        return False


def fix_vietnamese_text(text: str) -> str:
    """Convenience function to fix Vietnamese encoding."""
    corrector = VietnameseEncodingCorrector()
    return corrector.fix(text)


def fix_ocr_output(markdown_text: str) -> str:
    """
    Fix encoding in full OCR markdown output.

    Handles page markers (## Page N) and processes content.
    """
    corrector = VietnameseEncodingCorrector()

    # Split by page markers
    parts = re.split(r'(## Page \d+)', markdown_text)

    fixed_parts = []
    for part in parts:
        if part.startswith('## Page'):
            fixed_parts.append(part)
        else:
            fixed_parts.append(corrector.fix(part))

    return ''.join(fixed_parts)