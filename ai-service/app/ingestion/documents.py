import io
import re
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


@dataclass(frozen=True)
class Chunk:
    page: int
    number: int
    text: str


def extract(path: Path, content: bytes | None = None) -> list[tuple[int, str]]:
    if content is None and path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError("Document exceeds the 20 MiB development limit")
    content = path.read_bytes() if content is None else content
    if len(content) > 20 * 1024 * 1024:
        raise ValueError("Document exceeds the 20 MiB development limit")
    if path.suffix.lower() == ".txt":
        pages = [(1, content.decode("utf-8"))]
    elif path.suffix.lower() == ".pdf":
        if not content.startswith(b"%PDF-"):
            raise ValueError("File does not have a PDF signature")
        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are unsupported")
        if len(reader.pages) > 200:
            raise ValueError("Document exceeds 200 pages")
        pages = []
        total = 0
        for number, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            total += len(text)
            if total > 500_000:
                raise ValueError("Extracted text exceeds 500,000 characters")
            pages.append((number, text))
    else:
        raise ValueError("Only UTF-8 .txt and text-based .pdf files are supported")
    if sum(len(text) for _, text in pages) > 500_000:
        raise ValueError("Extracted text exceeds 500,000 characters")
    if not any(text.strip() for _, text in pages):
        raise ValueError("No extractable text; scanned PDFs need OCR in a later phase")
    return pages


def chunk(pages: list[tuple[int, str]], size: int, overlap: int) -> list[Chunk]:
    if not 100 <= size <= 4000 or not 0 <= overlap < size // 2:
        raise ValueError("Invalid chunk size or overlap")
    result = []
    for page, text in pages:
        text = re.sub(r"[ \t]+", " ", text.replace("\r\n", "\n")).strip()
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):
                # Prefer paragraph/sentence boundaries, then words, near the end.
                lower = start + size * 3 // 4
                for separator in ("\n\n", ". ", " "):
                    boundary = text.rfind(separator, lower, end)
                    if boundary != -1:
                        end = boundary + len(separator)
                        break
            value = text[start:end].strip()
            if value:
                result.append(Chunk(page=page, number=len(result), text=value))
            if end == len(text):
                break
            start = end - overlap
    if len(result) > 600:
        raise ValueError("Document exceeds 600 chunks")
    return result
