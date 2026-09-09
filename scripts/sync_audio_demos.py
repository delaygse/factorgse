"""Copy the paper demo WAV files into GitHub Pages-safe paths.

The source folder is kept outside the site repository and contains Chinese
directory names, spaces, parentheses, and a few historical `edge-ges` typos.
This script makes the explicit mapping reviewable and avoids URL-dependent
filename handling in the published page.
"""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
SOURCE_ROOT = WORKSPACE_ROOT / "audio_demos"
TARGET_ROOT = SITE_ROOT / "examples" / "audio"

BASELINE_DIR = SOURCE_ROOT / "baseline对比"
FACTORIZATION_DIR = SOURCE_ROOT / "消融实验1对比-不同结构"
CONTEXT_DIR = SOURCE_ROOT / "消融实验2对比-不同延迟"

BASELINE_FILES = {
    "clean.wav": "urgent_{lang}_clean.wav",
    "clean-codec.wav": "urgent_{lang}_clean_reconstruction.wav",
    "noisy.wav": "urgent_{lang}_noisy.wav",
    "unise.wav": "urgent_{lang}_unise.wav",
    "delaygse.wav": "urgent_{lang}_delaygse.wav",
    "bridge.wav": "urgent_{lang}_bridge.wav",
    "streamfm.wav": "urgent_{lang}_streamfm.wav",
    "fastenhancer-l.wav": "urgent_{lang}_fastenhancer_l.wav",
    "deepfilternet3.wav": "urgent_{lang}_deepfilternet3.wav",
    "factorgse-small-186p7ms.wav": "urgent_{lang}_edge-gse-186.7ms_small.wav",
}

FACTORIZATION_FILES = {
    "time-ar-delayed-grid.wav": "urgent_{lang}_edge-ges-Time-AR + delayed-grid.wav",
    "time-ar-parallel.wav": "urgent_{lang}_edge-gse-Time-AR + parallel residuals.wav",
    "time-nar-parallel.wav": "urgent_{lang}_edge-ges-Time-NAR + parallel residuals.wav",
    "time-nar-depth-ar.wav": "urgent_{lang}_edge-ges-Time-NAR + depth-AR.wav",
}

CONTEXT_FILES = {
    "26p7ms.wav": "urgent_{lang}_edge-gse-26.7ms.wav",
    "80ms.wav": "urgent_{lang}_edge-gse-80ms.wav",
    "160ms.wav": "urgent_{lang}_edge-gse-160ms.wav",
    "240ms.wav": "urgent_{lang}_edge-gse-240ms.wav",
}


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def copy_group(source_dir: Path, scope: str, mapping: dict[str, str]) -> int:
    copied = 0
    for language in ("en", "zh"):
        destination_dir = TARGET_ROOT / scope / language
        destination_dir.mkdir(parents=True, exist_ok=True)
        for destination_name, source_pattern in mapping.items():
            source = source_dir / source_pattern.format(lang=language)
            destination = destination_dir / destination_name
            if not source.is_file():
                raise FileNotFoundError(source)
            shutil.copy2(source, destination)
            copied += 1
    return copied


def copy_shared_primary() -> int:
    copied = 0
    for language in ("en", "zh"):
        candidates = [
            BASELINE_DIR / f"urgent_{language}_edge-gse-186.7ms.wav",
            FACTORIZATION_DIR
            / f"urgent_{language}_edge-gse-Edge-GSE (+ residual GRU).wav",
            CONTEXT_DIR / f"urgent_{language}_edge-gse-186.7ms.wav",
        ]
        if len({digest(path) for path in candidates}) != 1:
            raise ValueError(
                f"The {language.upper()} 186.7-ms FactorGSE files are not identical"
            )

        destination_dir = TARGET_ROOT / "shared" / language
        destination_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(candidates[0], destination_dir / "factorgse-186p7ms.wav")
        copied += 1
    return copied


def main() -> None:
    copied = 0
    copied += copy_group(BASELINE_DIR, "main", BASELINE_FILES)
    copied += copy_group(
        FACTORIZATION_DIR, "factorization", FACTORIZATION_FILES
    )
    copied += copy_group(CONTEXT_DIR, "context", CONTEXT_FILES)
    copied += copy_shared_primary()
    print(f"Synced {copied} canonical WAV files to {TARGET_ROOT}")


if __name__ == "__main__":
    main()
