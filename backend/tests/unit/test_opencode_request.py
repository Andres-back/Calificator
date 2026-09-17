from app.services.opencode_request import new_opencode_session_id, opencode_headers


def test_seeded_session_is_stable_opaque_and_header_safe() -> None:
    first = new_opencode_session_id("calificacion-personal-identifiable-value")
    second = new_opencode_session_id("calificacion-personal-identifiable-value")

    assert first == second
    assert first.startswith("xca-")
    assert "personal" not in first


def test_headers_cover_chat_and_messages_protocols() -> None:
    session_id = new_opencode_session_id("pipeline-1")
    chat = opencode_headers("secret", session_id=session_id)
    messages = opencode_headers(
        "secret",
        session_id=session_id,
        messages_api=True,
    )

    assert chat["Authorization"] == "Bearer secret"
    assert "x-api-key" not in chat
    assert messages["x-api-key"] == "secret"
    assert "Authorization" not in messages
    assert chat["x-opencode-session"] == messages["x-opencode-session"]
    assert chat["User-Agent"] == messages["User-Agent"] == "XCalificator/1.0"
