import hashlib
from pathlib import Path
from uuid import uuid4


class DocumentFiles:
    def __init__(self, root: Path):
        self.root = root.resolve()

    def path(self, key: str) -> Path:
        candidate = (self.root / key).resolve()
        if not candidate.is_relative_to(self.root) or candidate == self.root:
            raise ValueError("Invalid document storage key")
        return candidate

    def put(self, content: bytes, suffix: str) -> tuple[str, str]:
        if suffix not in (".pdf", ".txt"):
            raise ValueError("Unsupported file extension")
        self.root.mkdir(parents=True, exist_ok=True)
        key = f"{uuid4()}{suffix}"
        try:
            with self.path(key).open("xb") as target:
                target.write(content)
        except Exception:
            self.remove(key)
            raise
        return key, hashlib.sha256(content).hexdigest()

    def remove(self, key: str):
        self.path(key).unlink(missing_ok=True)
