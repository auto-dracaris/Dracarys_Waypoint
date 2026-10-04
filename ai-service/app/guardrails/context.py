from app.guardrails.policy import redact_secrets

SECRET_KEYS = {"password", "passwd", "apikey", "accesstoken", "refreshtoken"}


def safe_context(value):
    """Redact content without converting evidence into executable instructions."""
    if isinstance(value, str):
        return redact_secrets(value)
    if isinstance(value, list):
        return [safe_context(item) for item in value]
    if isinstance(value, dict):
        return {
            key: "[REDACTED]"
            if isinstance(key, str)
            and "".join(char for char in key.lower() if char.isalpha()) in SECRET_KEYS
            else safe_context(item)
            for key, item in value.items()
        }
    return value


def safe_sources(sources):
    return [
        source.model_copy(
            update={
                field: redact_secrets(value)
                for field in type(source).model_fields
                if isinstance(value := getattr(source, field), str)
            }
        )
        for source in sources
    ]
