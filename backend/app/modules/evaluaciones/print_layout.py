"""Conservative print-only layout decisions, shared by PDF and Word."""


def option_columns(options: list[str]) -> int:
    return 2 if 1 < len(options) <= 4 and max(map(len, options), default=0) <= 90 and sum(map(len, options)) <= 240 else 1
