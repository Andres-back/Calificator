"""Static generated motifs: alpha, modest transfer size and distinct originals."""
import hashlib
from pathlib import Path

from PIL import Image


def test_twenty_local_motifs_are_transparent_distinct_and_compact():
    directory = Path(__file__).resolve().parents[3] / 'frontend/public/assets/feedback-motifs'
    # The production backend image intentionally does not contain frontend assets.
    # This cross-tree assertion runs in the checkout/CI, not runtime-only images.
    files = sorted(directory.glob('*.png'))
    assert len(files) == 20
    hashes = set()
    for path in files:
        hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
        with Image.open(path) as picture:
            assert picture.mode == 'RGBA'
            assert max(picture.size) <= 320
            alpha = picture.getchannel('A')
            assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] > 0
            for point in ((0, 0), (picture.width - 1, 0), (0, picture.height - 1), (picture.width - 1, picture.height - 1)):
                assert alpha.getpixel(point) == 0
        assert path.stat().st_size < 150_000
    assert len(hashes) == 20
    assert sum(path.stat().st_size for path in files) < 1_500_000
