from app.guardrails.policy import contains_secret


def input_rejection(message, token=None):
    if not message.strip():
        return "Please enter a question about your orders, trips or team guidance."
    if contains_secret(message) or (token and len(token) >= 16 and token in message):
        return "Please remove passwords, access tokens or API keys from your message and try again."
    return None
