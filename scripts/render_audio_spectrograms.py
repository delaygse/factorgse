#!/usr/bin/env python3
"""Render missing demo spectrograms at the page's existing 760 × 220 size.

Requires ffmpeg, NumPy and Matplotlib. WAVs are decoded to mono 24 kHz for
visualization only; published audio stays byte-identical to the supplied WAVs.
Uses a 25-ms Hann window, 10-ms hop, and 80-dB range below the 99th percentile,
matching the existing demo visualization convention. Colors are normalized per
clip and must not be interpreted as a comparison of absolute signal levels.
"""

from pathlib import Path
import subprocess

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[1] / "examples/audio"


def render(source: Path) -> None:
    decoded = subprocess.check_output([
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(source),
        "-f", "f32le", "-ac", "1", "-ar", "24000", "pipe:1",
    ])
    samples = np.frombuffer(decoded, dtype="<f4")
    window_size, hop, rate = 600, 240, 24000
    if samples.size < window_size:
        raise ValueError(f"Audio too short: {source}")
    frames = np.lib.stride_tricks.sliding_window_view(samples, window_size)[::hop]
    window = np.hanning(window_size + 1)[:-1]
    spectrum = np.fft.rfft(frames * window, axis=1) / window.sum()
    power_db = 10 * np.log10(np.abs(spectrum.T) ** 2 + 1e-12)
    upper = np.percentile(power_db, 99)
    duration = samples.size / rate

    plt.rcParams.update({"font.size": 9, "text.color": "#444444",
                         "axes.labelcolor": "#444444", "xtick.color": "#555555",
                         "ytick.color": "#555555"})
    fig = plt.figure(figsize=(7.6, 2.2), dpi=100)
    ax = fig.add_axes([64 / 760, 45 / 220, 678 / 760, 161 / 220])
    ax.imshow(power_db, origin="lower", aspect="auto", cmap="inferno",
              extent=[0, duration, 0, 12], vmin=upper - 80, vmax=upper)
    ax.set(xlabel="Time [sec]", ylabel="Frequency [kHz]", yticks=[0, 4, 8, 12])
    ticks = np.linspace(0, duration, 5)
    ax.set_xticks(ticks, [f"{tick:.1f}" for tick in ticks])
    ax.tick_params(pad=2, length=3, width=0.6)
    for spine in ax.spines.values():
        spine.set_linewidth(0.5)
    fig.savefig(source.with_suffix(".png"), dpi=100)
    plt.close(fig)
    print(source.relative_to(ROOT))


if __name__ == "__main__":
    for source in sorted(ROOT.rglob("*.wav")):
        if not source.with_suffix(".png").exists():
            render(source)
