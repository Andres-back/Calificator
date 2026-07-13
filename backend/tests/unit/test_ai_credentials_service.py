from app.services.ai_credentials_service import decrypt_ai_secret, encrypt_ai_secret


def test_ai_secret_round_trip_is_encrypted_at_rest(monkeypatch) -> None:
    monkeypatch.setattr("app.services.ai_credentials_service.settings.SECRET_KEY", "unit-test-secret")
    raw = "sk-sensitive-value"

    stored = encrypt_ai_secret(raw)

    assert stored.startswith("enc:v1:")
    assert raw not in stored
    assert decrypt_ai_secret(stored) == raw


def test_legacy_plaintext_secret_remains_readable_during_migration() -> None:
    assert decrypt_ai_secret("legacy-provider-key") == "legacy-provider-key"


def test_empty_ai_secret_is_rejected() -> None:
    try:
        encrypt_ai_secret("   ")
    except ValueError as exc:
        assert "vacia" in str(exc)
    else:  # pragma: no cover - explicit assertion for readability
        raise AssertionError("An empty credential must not be persisted")
