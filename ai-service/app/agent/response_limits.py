"""A shared size guard for generated answers and deterministic fallbacks."""

MAX_REPLY_WORDS = 120
MAX_REPLY_CHARACTERS = 900


def limit_reply(result):
    answer = result["answer"]
    if len(answer.split()) <= MAX_REPLY_WORDS and len(answer) <= MAX_REPLY_CHARACTERS:
        return result
    # Never clip record facts or policy text mid-sentence: doing so can remove a
    # negation, qualification or citation. Keep the full evidence in source cards.
    # An oversized answer is evidence-only, not a claimed complete answer.
    return {
        **result,
        "answer": (
            "I found more information than fits in a short reply.\n\n"
            "Ask about one order, date, policy or step, and I’ll focus on that part. "
            "You can review the available sources below for the full context. "
            "Additional details may be missing."
        ),
        "status": "sources_only",
    }
