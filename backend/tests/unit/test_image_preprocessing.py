from io import BytesIO

from PIL import Image, ImageDraw, ImageFilter

from app.services.image_preprocessing import (
    assess_image_quality,
    prepare_orientation_variants,
)


def _document(*, background="white", ink="black", blur=0, size=(800, 1000)) -> bytes:
    image = Image.new("RGB", size, background)
    draw = ImageDraw.Draw(image)
    for y in range(100, size[1] - 100, 50):
        draw.line((80, y, size[0] - 80, y), fill=ink, width=3)
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    output = BytesIO()
    image.save(output, format="JPEG", quality=90)
    return output.getvalue()


def test_clear_document_is_ready_without_manual_corners() -> None:
    result = assess_image_quality(_document(), "image/jpeg")

    assert result.status == "good"
    assert result.warnings == ()


def test_dark_and_blurred_documents_are_warned_but_kept() -> None:
    dark = assess_image_quality(
        _document(background=(25, 25, 25), ink=(80, 80, 80)),
        "image/jpeg",
    )
    blurred = assess_image_quality(_document(blur=8), "image/jpeg")

    assert dark.status == "warning"
    assert "dark" in dark.warnings
    assert blurred.status == "warning"
    assert "blurry" in blurred.warnings
    assert len(prepare_orientation_variants(_document(blur=8), "image/jpeg")) == 3


def test_blank_tiny_and_corrupted_images_are_unusable() -> None:
    blank = Image.new("RGB", (800, 1000), "white")
    output = BytesIO()
    blank.save(output, format="PNG")

    assert assess_image_quality(output.getvalue(), "image/png").status == "unusable"
    assert assess_image_quality(_document(size=(80, 80)), "image/jpeg").status == "unusable"
    assert assess_image_quality(b"not-an-image", "image/png").status == "unusable"


def test_prepared_copy_keeps_faint_pencil_and_color() -> None:
    original = Image.new("RGB", (800, 1000), "white")
    draw = ImageDraw.Draw(original)
    draw.line((100, 300, 700, 300), fill=(215, 215, 215), width=6)
    draw.rectangle((100, 400, 200, 500), fill=(20, 100, 220))
    buffer = BytesIO()
    original.save(buffer, format="PNG")

    prepared = prepare_orientation_variants(buffer.getvalue(), "image/png")[0]
    with Image.open(BytesIO(prepared.data)) as result:
        background = result.getpixel((400, 250))
        pencil = result.getpixel((400, 300))
        blue = result.getpixel((150, 450))

    assert sum(pencil) < sum(background) - 30
    assert blue[2] > blue[0] + 40
    assert blue[2] > blue[1] + 40
