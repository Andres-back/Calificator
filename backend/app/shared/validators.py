from decimal import Decimal


def ensure_positive_decimal(value: Decimal, field_name: str) -> None:
    if value <= 0:
        raise ValueError(f"{field_name} must be greater than zero")
