import pytest

from app.core.config import Settings


def production_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "ENV": "production",
        "SECRET_KEY": "s" * 48,
        "JWT_SECRET": "",
        "ENABLE_API_DOCS": None,
        "DATABASE_URL": "postgresql+asyncpg://app:strong-password@postgres:5432/app",
        "REDIS_URL": "redis://:strong-redis-password@redis:6379/0",
        "PRESENTON_AUTH_PASSWORD": "strong-presenton-password",
        "TRUSTED_HOSTS": "app.example.com,localhost,127.0.0.1,testserver",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_production_settings_accept_non_default_secrets() -> None:
    settings = production_settings()

    assert settings.ENV == "production"
    assert settings.cookie_secure is True
    assert settings.ENABLE_API_DOCS is False
    assert "app.example.com" in settings.trusted_hosts


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"SECRET_KEY": "change-me"}, "SECRET_KEY"),
        ({"DATABASE_URL": "postgresql+asyncpg://app:change-me@postgres:5432/app"}, "DATABASE_URL"),
        ({"REDIS_URL": "redis://redis:6379/0"}, "REDIS_URL"),
        ({"PRESENTON_AUTH_PASSWORD": "change-me"}, "PRESENTON_AUTH_PASSWORD"),
        ({"TRUSTED_HOSTS": "*"}, "TRUSTED_HOSTS"),
    ],
)
def test_production_settings_reject_insecure_defaults(
    override: dict[str, object],
    message: str,
) -> None:
    with pytest.raises(ValueError, match=message):
        production_settings(**override)
