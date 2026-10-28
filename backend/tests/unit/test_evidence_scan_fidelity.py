"""Negative controls: an excellent whole-image average must not hide a lost sign."""
import numpy as np
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import pytest

from tests.helpers.evidence_scan_fidelity import compare_reference_marks, reference_marks
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
from app.services.evidence_scan import ScanRecipe, prepare_evidence_scan


def test_individual_decimal_is_detected_when_global_image_difference_is_tiny():
    reference = np.full((100, 100, 3), 255, dtype=np.uint8)
    reference[40:43, 40:43] = 120
    prepared = reference.copy()
    prepared[40:43, 40:43] = 255
    assert np.abs(reference.astype(float) - prepared).mean() < 0.13
    marks = [{"id": "decimal", "bounds": [37, 37, 46, 46]}]
    result = compare_reference_marks(reference, prepared, marks)
    assert result[0]["status"] == "lost"
    assert compare_reference_marks(reference, reference, marks)[0]["status"] == "retained"


def test_changing_ink_color_or_cropping_a_reference_is_not_a_success():
    reference = np.full((40, 40, 3), 255, dtype=np.uint8)
    reference[10:25, 10:16] = [20, 20, 130]
    changed = reference.copy()
    changed[10:25, 10:16] = [130, 20, 20]
    assert compare_reference_marks(reference, changed, [{"id": "blue-ink", "bounds": [8, 8, 28, 28]}])[0]["status"] == "lost"
    assert compare_reference_marks(reference, reference, [{"id": "edge", "bounds": [-8, 8, 28, 28]}])[0]["status"] == "cropped"


def test_unavailable_detail_is_reported_not_invented_or_claimed_restored():
    glare = np.full((20, 20, 3), 255, dtype=np.uint8)
    result = compare_reference_marks(glare, glare, [{"id": "saturated", "bounds": [1, 1, 19, 19]}])
    assert result[0]["status"] == "unobservable_source"


def test_all_frozen_photos_have_per_sign_references_without_changing_source_bytes():
    for case in bank_cases():
        fixture = make_scan_fixture(case)
        marks = reference_marks(case, fixture, np.eye(3))
        assert len(marks) >= 60
        assert any(item["id"].endswith(":-") for item in marks)
        assert any(item["id"].endswith(":.") for item in marks)
        assert fixture.content == make_scan_fixture(case).content


@pytest.mark.parametrize('profile', ['natural', 'lectura_suave'])
def test_supplemental_faint_fractions_superscript_and_drawing_strokes(profile):
    # Additional challenge, not a replacement or re-selection of the frozen30.
    image = Image.new('RGB', (600, 800), 'white')
    draw, marks = ImageDraw.Draw(image), []
    font = ImageFont.load_default(size=28)
    def text(x, y, value, *, size=28, ink=(210, 210, 210), label='math'):
        selected = font if size == 28 else ImageFont.load_default(size=size)
        draw.text((x, y), value, font=selected, fill=ink)
        for index, char in enumerate(value):
            if char.isspace():
                continue
            advance = selected.getlength(value[:index + 1]) - selected.getlength(char)
            left, top, right, bottom = selected.getbbox(char)
            marks.append({'id': f'{label}:{index}:{char}', 'bounds': [int(x + advance + left - 3), y + top - 3, int(x + advance + right + 4), y + bottom + 4]})
    text(40, 60, '-0.5 + 1.25 = 0.75', label='decimal')
    text(40, 150, '1/2 + 3/4 = 5/4', label='fractions')
    text(40, 250, '3', label='base')
    text(60, 242, '2', size=18, label='superscript')
    text(80, 250, '= 9', label='result')
    text(40, 350, '1', label='numerator')
    draw.line((42, 385, 60, 385), fill=(210, 210, 210), width=2)
    marks.append({'id': 'fraction-bar', 'bounds': [38, 381, 65, 391]})
    text(40, 392, '2', label='denominator')
    text(180, 350, 'V (X) F ( )', ink=(20, 60, 130), label='blue-mark')
    draw.line((180, 390, 320, 390), fill=(130, 20, 20), width=2)
    marks.append({'id': 'red-crossout', 'bounds': [177, 387, 324, 394]})
    draw.line((190, 480, 270, 560, 350, 480), fill=(210, 210, 210), width=2)
    marks.extend([{'id': 'drawing-left', 'bounds': [187, 477, 274, 564]}, {'id': 'drawing-right', 'bounds': [267, 477, 354, 564]}])
    original = np.asarray(image)
    stream = BytesIO()
    image.save(stream, format='PNG')
    recipe = ScanRecipe(width=600, height=800, corners=((0., 0.), (1., 0.), (1., 1.), (0., 1.)), profile=profile)
    result = prepare_evidence_scan(stream.getvalue(), recipe)
    with Image.open(BytesIO(result.content)) as prepared:
        compared = compare_reference_marks(original, np.asarray(prepared.convert('RGB')), marks)
    assert all(row['status'] == 'retained' for row in compared), [row for row in compared if row['status'] != 'retained']
    assert np.array_equal(original, np.asarray(image))
