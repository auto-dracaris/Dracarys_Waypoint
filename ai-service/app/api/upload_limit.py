from fastapi import HTTPException


class UploadBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope.get("path", "").startswith("/api/v1/documents"):
            return await self.app(scope, receive, send)
        total = 0

        async def limited_receive():
            nonlocal total
            message = await receive()
            if message["type"] == "http.request":
                total += len(message.get("body", b""))
                if total > 21 * 1024 * 1024:
                    raise HTTPException(413, "Document request exceeds 21 MiB")
            return message

        return await self.app(scope, limited_receive, send)
