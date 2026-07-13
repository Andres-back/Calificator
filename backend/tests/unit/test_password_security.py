import bcrypt

from app.core.security import get_password_hash, verify_password


def test_new_passwords_use_argon2() -> None:
    password = "Correct-Horse-Battery-Staple"

    password_hash = get_password_hash(password)

    assert password_hash.startswith("$argon2")
    assert verify_password(password, password_hash) is True
    assert verify_password("wrong-password", password_hash) is False


def test_existing_bcrypt_passwords_remain_valid() -> None:
    password = "LegacyPassword123!"
    legacy_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    assert verify_password(password, legacy_hash) is True
