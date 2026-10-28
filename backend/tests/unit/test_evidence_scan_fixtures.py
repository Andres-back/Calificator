from io import BytesIO

from PIL import Image, ImageOps

from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture


def test_bank_is_fixed_and_declares_subset_before_detector_calibration():
    cases = bank_cases()
    assert len(cases) == 30
    assert len({case["id"] for case in cases}) == 30
    assert sum(case["automatic_subset"] for case in cases) == 20
    assert {case["exif"] for case in cases if "exif" in case} == set(range(1, 9))


def test_all_cases_have_repeatable_photo_bytes_and_reference_marks():
    for case in bank_cases():
        fixture = make_scan_fixture(case)
        assert fixture.content == make_scan_fixture(case).content
        assert fixture.marks
        with Image.open(BytesIO(fixture.content)) as photo:
            assert ImageOps.exif_transpose(photo).size == fixture.oriented_size


def test_exif_variants_recover_identical_oriented_pixels():
    cases = [case for case in bank_cases() if "exif" in case]
    reference = None
    for case in cases:
        fixture = make_scan_fixture(case)
        with Image.open(BytesIO(fixture.content)) as source:
            pixels = ImageOps.exif_transpose(source).tobytes()
        if reference is None:
            reference = pixels
        assert pixels == reference
