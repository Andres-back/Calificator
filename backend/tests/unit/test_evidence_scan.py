from io import BytesIO
import hashlib

import pytest
from PIL import Image, ImageOps
from pydantic import ValidationError

from app.services.evidence_scan import ScanRecipe, ScanPreparationError, prepare_evidence_scan
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture

FULL = [[0, 0], [1, 0], [1, 1], [0, 1]]


def recipe(width=800, height=1100, **changes):
    return ScanRecipe.model_validate({"width": width, "height": height, "corners": FULL, **changes})


@pytest.mark.parametrize("corners", [[], [[0, 0], [1, 1], [1, 0], [0, 1]], [[0, 0], [1, 0], [0.1, 0.1], [0, 1]], [[0, 0], [1.1, 0], [1, 1], [0, 1]], [[0, 0], [0.0001, 0], [0.0001, 0.0001], [0, 0.0001]]])
def test_invalid_corners_never_enter_warp(corners):
    with pytest.raises(ValidationError):
        recipe(corners=corners)


@pytest.mark.parametrize("extra", [{"path": "private"}, {"matrix": [[1]]}, {"rotation": True}, {"profile": "generative"}, {"width": "800"}])
def test_recipe_is_closed_and_typed(extra):
    with pytest.raises(ValidationError):
        recipe(**extra)


def test_natural_full_page_keeps_original_and_does_not_force_a4():
    source = make_scan_fixture(bank_cases()[2])
    prepared = prepare_evidence_scan(source.content, recipe(*source.oriented_size))
    assert prepared.source_sha256 == hashlib.sha256(source.content).hexdigest()
    assert (prepared.width, prepared.height) == source.oriented_size
    assert prepared.mime == "image/jpeg"
    assert prepared.source_to_prepared[0] == pytest.approx([1, 0, 0], abs=0.0001)
    with Image.open(BytesIO(prepared.content)) as image:
        assert image.mode == "RGB"
        assert not image.getexif()


def test_canonical_encoder_versions_its_higher_fidelity_without_subsampling():
    from app.services.evidence_scan import ALGORITHM, prepare_evidence_original
    assert ALGORITHM == 'opencv-4.13.0-scan2'
    source = make_scan_fixture(bank_cases()[0])
    expected = BytesIO()
    Image.new('RGB', (4, 4), 'white').save(expected, format='JPEG', quality=96, subsampling=0)
    with Image.open(BytesIO(expected.getvalue())) as sample:
        quantization = sample.quantization
    for result in (prepare_evidence_scan(source.content, recipe(*source.oriented_size)), prepare_evidence_original(source.content)):
        with Image.open(BytesIO(result.content)) as image:
            assert image.quantization == quantization
            assert all(band[1:3] == (1, 1) for band in image.layer)


def test_each_exif_variant_and_manual_rotation_has_the_expected_frame():
    for case in [item for item in bank_cases() if "exif" in item]:
        source = make_scan_fixture(case)
        prepared = prepare_evidence_scan(source.content, recipe(*source.oriented_size, rotation=90))
        assert (prepared.width, prepared.height) == tuple(reversed(source.oriented_size))
        assert prepared.source_to_prepared[0] == pytest.approx([0, -1, source.oriented_size[1] - 1], abs=0.0001)


def test_crop_uses_accepted_geometry_and_source_dimensions():
    source = make_scan_fixture(bank_cases()[10])
    prepared = prepare_evidence_scan(source.content, recipe(*source.oriented_size, corners=source.corners))
    assert prepared.width < source.oriented_size[0]
    assert prepared.height < source.oriented_size[1]
    assert len(prepared.source_to_prepared) == 3
    with pytest.raises(ScanPreparationError, match="dimensions"):
        prepare_evidence_scan(source.content, recipe(100, 100))


def test_oversize_or_corrupted_source_offers_a_recoverable_error():
    with pytest.raises(ScanPreparationError):
        prepare_evidence_scan(b"not an image", recipe())
    output = BytesIO()
    Image.new("RGB", (4100, 4000), "white").save(output, "PNG")
    with pytest.raises(ScanPreparationError, match="pixel_budget"):
        prepare_evidence_scan(output.getvalue(), recipe(4100, 4000))


def test_soft_profile_retains_color_and_is_optional():
    source = make_scan_fixture(bank_cases()[7])
    natural = prepare_evidence_scan(source.content, recipe(*source.oriented_size))
    gentle = prepare_evidence_scan(source.content, recipe(*source.oriented_size, profile="lectura_suave"))
    assert gentle.source_sha256 == natural.source_sha256
    with Image.open(BytesIO(gentle.content)) as image:
        colors = list(ImageOps.exif_transpose(image).resize((80, 110)).get_flattened_data())
    assert any(max(pixel) - min(pixel) > 20 for pixel in colors)


def test_output_budget_never_causes_silent_lossy_recompression(monkeypatch):
    from app.services import evidence_scan
    source = make_scan_fixture(bank_cases()[0])
    monkeypatch.setattr(evidence_scan, "MAX_PREPARED_BYTES", 100)
    with pytest.raises(ScanPreparationError, match="prepared_size_budget"):
        prepare_evidence_scan(source.content, recipe(*source.oriented_size))


def test_original_mode_does_not_apply_scan_pixel_budget_or_enhancement():
    from app.services.evidence_scan import prepare_evidence_original
    raw = BytesIO()
    # Over the local-scanner 16MP budget, but still a valid original photo.
    Image.new("RGB", (4100, 4000), (180, 150, 120)).save(raw, "JPEG", quality=95)
    prepared = prepare_evidence_original(raw.getvalue(), rotation=90)
    assert max(prepared.width, prepared.height) <= 2200
    assert prepared.source_sha256 == hashlib.sha256(raw.getvalue()).hexdigest()
    with Image.open(BytesIO(prepared.content)) as result:
        assert result.getpixel((100, 100)) == pytest.approx((180, 150, 120), abs=3)
        assert not result.getexif()


def test_original_mode_normalizes_exif_and_retains_full_frame_before_manual_turn():
    from app.services.evidence_scan import prepare_evidence_original
    source = make_scan_fixture(next(case for case in bank_cases() if case.get("exif") == 6))
    prepared = prepare_evidence_original(source.content, rotation=90)
    assert (prepared.width, prepared.height) == tuple(reversed(source.oriented_size))
    assert prepared.source_to_prepared[0] == pytest.approx([0, -1, source.oriented_size[1] - 1])


def test_scan_never_serializes_a_full_source_frame_to_a_temporary_rgb_byte_string(monkeypatch):
    source = make_scan_fixture(bank_cases()[0])
    original_tobytes = Image.Image.tobytes
    def bounded_tobytes(image, *args, **kwargs):
        if image.width * image.height > 800 * 64:
            raise AssertionError("Source RGB conversion must use bounded strips, not a whole-frame temporary")
        return original_tobytes(image, *args, **kwargs)
    monkeypatch.setattr(Image.Image, "tobytes", bounded_tobytes)
    prepared = prepare_evidence_scan(source.content, recipe(*source.oriented_size))
    assert prepared.source_sha256 == hashlib.sha256(source.content).hexdigest()


@pytest.mark.parametrize("mode", ["RGB", "RGBA", "L", "P"])
def test_conversion_keeps_the_exact_original_rgb_pixels_and_frame(monkeypatch, mode):
    import cv2
    import numpy as np
    output = BytesIO()
    with Image.new("RGBA", (83, 131), (100, 40, 80, 120)) as base:
        from PIL import ImageDraw
        ImageDraw.Draw(base).text((8, 50), "-0.5", fill=(20, 30, 40, 255), font_size=15)
        with base.convert(mode) as converted:
            if mode == "P":
                converted.info["transparency"] = 0
            converted.save(output, format="PNG")
    content = output.getvalue()
    with Image.open(BytesIO(content)) as source:
        with ImageOps.exif_transpose(source) as oriented:
            if "A" in oriented.getbands() or "transparency" in oriented.info:
                with oriented.convert("RGBA") as rgba, Image.new("RGBA", oriented.size, "white") as background:
                    with Image.alpha_composite(background, rgba) as merged:
                        expected = np.asarray(merged.convert("RGB"))
            else:
                expected = np.asarray(oriented.convert("RGB"))
    warp = cv2.warpPerspective
    checked = []
    def check_pixels(actual, *args, **kwargs):
        np.testing.assert_array_equal(actual, expected)
        assert actual.flags.c_contiguous
        checked.append(True)
        return warp(actual, *args, **kwargs)
    monkeypatch.setattr(cv2, "warpPerspective", check_pixels)
    prepare_evidence_scan(content, recipe(83, 131))
    assert checked == [True]


@pytest.mark.parametrize("case", bank_cases(), ids=lambda case: case["id"])
@pytest.mark.parametrize("profile", ["natural", "lectura_suave"])
def test_memory_fix_keeps_identical_canonical_bytes_on_the_frozen_bank(monkeypatch, case, profile):
    """Regression against the prior conversion, not proof of all glyph retention."""
    import numpy as np
    from app.services import evidence_scan
    source = make_scan_fixture(case)
    corners = source.corners if all(0 <= value <= 1 for point in source.corners for value in point) else FULL
    selected = recipe(*source.oriented_size, corners=corners, rotation=90, profile=profile)
    optimized = prepare_evidence_scan(source.content, selected)
    def prior_rgb_conversion(image):
        if "A" in image.getbands() or "transparency" in image.info:
            with image.convert("RGBA") as rgba, Image.new("RGBA", image.size, "white") as background:
                with Image.alpha_composite(background, rgba) as merged:
                    with merged.convert("RGB") as rgb:
                        return np.asarray(rgb)
        with image.convert("RGB") as rgb:
            return np.asarray(rgb)
    monkeypatch.setattr(evidence_scan, "_rgb_pixels", prior_rgb_conversion)
    reference = prepare_evidence_scan(source.content, selected)
    assert optimized.content == reference.content
    assert optimized.source_to_prepared == reference.source_to_prepared
    assert (optimized.width, optimized.height, optimized.source_sha256) == (reference.width, reference.height, reference.source_sha256)
