"""Compare the four fixed synthetic exports; never certifies real school data."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def compare(directory: Path) -> None:
    old, new = directory / 'fpdf-2.8.2', directory / 'fpdf-2.8.8'
    reports = [json.loads((path / 'report.json').read_text(encoding='utf8')) for path in (old, new)]
    assert all(report['synthetic_only'] is True and report['real_ai_calls'] == 0 for report in reports)
    before = {sample['name']: sample['pages'] for sample in reports[0]['samples']}
    after = {sample['name']: sample['pages'] for sample in reports[1]['samples']}
    assert before.keys() == after.keys() and len(before) == 4
    rows = []
    for name, pages in before.items():
        assert pages == after[name], f'Pagination/text changed in {name}'
        for page in pages:
            filename = f'{name}-pagina-{page["page"]}.png'
            with Image.open(old / filename) as first, Image.open(new / filename) as second:
                a, b = np.asarray(first.convert('RGB')), np.asarray(second.convert('RGB'))
            assert a.shape == b.shape
            difference = np.abs(a.astype(np.int16) - b.astype(np.int16))
            mae = float(difference.mean())
            rows.append({'sample': name, 'page': page['page'], 'pixels_identical': bool(np.array_equal(a, b)),
                'mean_channel_error': round(mae, 6), 'changed_pixel_fraction': round(float(np.any(a != b, axis=2).mean()), 6)})
            assert mae <= 2, f'Visual difference requires review: {filename}'
    report = {'synthetic_only': True, 'real_ai_calls': 0, 'exports': 4, 'pages': len(rows),
        'text_and_pagination_unchanged': True, 'results': rows}
    with (directory / 'comparison.json').open('x', encoding='utf8') as stream:
        json.dump(report, stream, indent=2)
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    compare(parser.parse_args().directory)
