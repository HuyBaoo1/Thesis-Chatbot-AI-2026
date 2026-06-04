def format_chat_history(history: list[dict], limit: int = 10) -> str:
    if not history:
        return "No recent history."

    lines: list[str] = []
    for item in history[-limit:]:
        role = str(item.get("role", "user")).upper()
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        lines.append(f"{role}: {content}")
    return "\n".join(lines) if lines else "No recent history."
