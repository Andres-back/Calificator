import secrets

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_matricula_code(prefix: str = "XCA", length: int = 8) -> str:
    suffix = "".join(secrets.choice(ALPHABET) for _ in range(length))
    return f"{prefix}-{suffix}"
