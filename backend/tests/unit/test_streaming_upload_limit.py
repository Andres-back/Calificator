import pytest

from app.services.storage_service import UploadTooLargeError, read_upload_limited


class ChunkedUpload:
    def __init__(self, chunks: list[bytes]) -> None:
        self.chunks = iter(chunks)
        self.read_calls = 0

    async def read(self, _size: int) -> bytes:
        self.read_calls += 1
        return next(self.chunks, b"")


@pytest.mark.anyio
async def test_read_upload_limited_returns_content_below_limit() -> None:
    upload = ChunkedUpload([b"abc", b"def"])

    content = await read_upload_limited(upload, 6)  # type: ignore[arg-type]

    assert content == b"abcdef"


@pytest.mark.anyio
async def test_read_upload_limited_stops_after_limit_is_exceeded() -> None:
    upload = ChunkedUpload([b"abcd", b"efgh", b"unused"])

    with pytest.raises(UploadTooLargeError):
        await read_upload_limited(upload, 6)  # type: ignore[arg-type]

    assert upload.read_calls == 2
