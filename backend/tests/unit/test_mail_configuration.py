from app.services.ai_credentials_service import decrypt_ai_secret, encrypt_ai_secret
from app.services.mail_service import EffectiveMailConfig, send_mail_sync


class FakeSMTP:
    last = None

    def __init__(self, host, port, timeout):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.started_tls = False
        self.login_args = None
        self.message = None
        FakeSMTP.last = self

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def ehlo(self):
        return None

    def starttls(self, context):
        assert context is not None
        self.started_tls = True

    def login(self, username, password):
        self.login_args = (username, password)

    def send_message(self, message):
        self.message = message


def test_smtp_secret_is_encrypted_and_never_plaintext():
    encrypted = encrypt_ai_secret("app-password-example")
    assert encrypted != "app-password-example"
    assert "app-password-example" not in encrypted
    assert decrypt_ai_secret(encrypted) == "app-password-example"


def test_mail_sender_uses_starttls_and_authenticated_sender(monkeypatch):
    monkeypatch.setattr("app.services.mail_service.smtplib.SMTP", FakeSMTP)
    config = EffectiveMailConfig(
        host="smtp.example.test",
        port=587,
        use_starttls=True,
        username="sender@example.test",
        from_email="sender@example.test",
        password="secret",
        source="database",
    )
    latency = send_mail_sync(
        config,
        recipient="recipient@example.test",
        subject="Test",
        text_body="Plain",
        html_body="<p>HTML</p>",
    )
    assert latency >= 0
    assert FakeSMTP.last.started_tls is True
    assert FakeSMTP.last.login_args == ("sender@example.test", "secret")
    assert FakeSMTP.last.message["To"] == "recipient@example.test"