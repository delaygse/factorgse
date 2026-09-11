#!/usr/bin/env python3
"""Render the paper's Fig. 2 as a wider, single-panel website SVG.

Chart contract
--------------
Question: how do DNSMOS and bilingual recognition compare across the paper's
systems and separately trained input-context configurations?
Family: relationship / labelled scatter with one four-point context path.
Grain: 12 fixed-checkpoint aggregate observations from URGENT 2025 (400
utterances: 300 English, 100 Chinese). All 12 points are intentionally labelled.
The four sweep models are connected; the separate 186.7-ms primary run is not.
Axes: x = 100 - Avg. WER/CER (%), y = DNSMOS; same limits as the paper's Fig. 2.
Surface: static SVG in the existing academic GitHub Pages results section,
1180 x 600, displayed in a centered 900-pixel card, with an 800-pixel
scrollable chart on mobile to retain legibility.
Palette: the paper's blue and orange plus neutral grey. Open circles, open
squares, filled circles and a star preserve distinctions without color.
QA: exported SVG/PNG at the website's displayed width; verify labels, exact
source coordinates, legend, metric names and the unchanged paper sources.

Requires Matplotlib. Run from the site repository:
    python scripts/render_results_web.py --preview /absolute/path/web-fig2.png

Source values are snapshotted below so the site remains independently buildable.
If the local paper is present, its plot data are checked read-only before export.
"""
from __future__ import annotations

import argparse
import ast
from dataclasses import asdict, dataclass
import json
from pathlib import Path
from xml.etree import ElementTree as ET

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

WIDTH, HEIGHT, DPI = 1180, 600, 100
SITE_ROOT = Path(__file__).resolve().parents[1]
PAPER_ROOT = SITE_ROOT.parents[1] / "edge_gse_paper"
SVG_NS = "http://www.w3.org/2000/svg"


@dataclass(frozen=True)
class Point:
    label: str
    avg_wer_cer: float
    dnsmos: float
    category: str
    context_ms: float | None = None
    inherited: bool = False

    @property
    def recognition_score(self) -> float:
        return 100.0 - self.avg_wer_cer


BASELINES = (
    Point("DelayGSE†", 16.95, 3.77, "offline", inherited=True),
    Point("Bridge", 33.20, 3.37, "offline"),
    Point("UniSE", 33.25, 3.85, "offline"),
    Point("CMGAN", 34.90, 3.22, "offline"),
    Point("DeepFilterNet3", 28.40, 3.32, "streaming"),
    Point("FastEnhancer-L", 33.90, 3.23, "streaming"),
    Point("Stream.FM", 43.60, 3.24, "streaming"),
)
SWEEP = (
    Point("26.7", 29.85, 3.54, "context sweep", 26.67),
    Point("80", 28.00, 3.58, "context sweep", 80.0),
    Point("160", 26.85, 3.61, "context sweep", 160.0),
    Point("240", 23.30, 3.62, "context sweep", 240.0),
)
PRIMARY = Point("186.7", 25.45, 3.62, "primary separate run", 186.7)
POINTS = (*BASELINES, *SWEEP, PRIMARY)
COLORS = {
    "blue": "#245C94", "orange": "#C56A14", "ink": "#20252B",
    "muted": "#66707A", "grid": "#D8DDE3", "guide": "#AEB6BF",
}


def validate_source() -> None:
    assert len(POINTS) == 12
    assert PRIMARY.context_ms not in {p.context_ms for p in SWEEP}
    assert PRIMARY.recognition_score == 74.55
    source = PAPER_ROOT / "figures/plot_dns_avgwer_tradeoff.py"
    if not source.exists():
        return
    assignments = {}
    for node in ast.parse(source.read_text()).body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in {
                    "OFFLINE_POINTS", "STREAMING_POINTS", "EDGE_SWEEP", "APPLICATION_POINT"
                }:
                    assignments[target.id] = ast.literal_eval(node.value)
    for key, category in [("OFFLINE_POINTS", "offline"), ("STREAMING_POINTS", "streaming")]:
        expected = [(p.label, p.avg_wer_cer, p.dnsmos) for p in BASELINES if p.category == category]
        assert [tuple(row[:3]) for row in assignments[key]] == expected, key
    assert assignments["EDGE_SWEEP"] == [(p.context_ms, p.avg_wer_cer, p.dnsmos) for p in SWEEP]
    assert assignments["APPLICATION_POINT"] == (PRIMARY.context_ms, PRIMARY.avg_wer_cer, PRIMARY.dnsmos)
    assert r"\newcommand{\avgwer}{Avg.\ WER/CER\xspace}" in (PAPER_ROOT / "main.tex").read_text()


def build_figure():
    plt.rcParams.update({
        "font.family": "sans-serif", "font.sans-serif": ["Arial", "DejaVu Sans"],
        "font.size": 13.5, "text.color": COLORS["ink"], "axes.labelcolor": COLORS["ink"],
        "xtick.color": COLORS["ink"], "ytick.color": COLORS["ink"],
        "svg.fonttype": "none", "svg.hashsalt": "factorgse-single-fig2-v1",
    })
    fig = plt.figure(figsize=(WIDTH / DPI, HEIGHT / DPI), dpi=DPI, facecolor="white")
    ax = fig.add_axes([0.09, 0.16, 0.88, 0.71])
    ax.set(xlim=(55, 85), ylim=(3.10, 3.90), xticks=range(55, 86, 5), yticks=[3.2, 3.4, 3.6, 3.8])
    ax.grid(color=COLORS["grid"], linewidth=0.75)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(COLORS["ink"])
        ax.spines[side].set_linewidth(1.1)
    ax.tick_params(length=5, width=1.0, pad=8, labelsize=13)
    ax.set_xlabel("Recognition score (%)  (higher is better)", fontsize=14.5, labelpad=15)
    ax.set_ylabel("DNSMOS  (higher is better)", fontsize=14.5, labelpad=20)

    for i, p in enumerate(BASELINES):
        offline = p.category == "offline"
        color = COLORS["muted" if offline else "orange"]
        mark, = ax.plot(p.recognition_score, p.dnsmos, marker="o" if offline else "s",
                        markersize=8.5, markerfacecolor="white", markeredgecolor=color,
                        markeredgewidth=1.8, linestyle="none", zorder=3)
        mark.set_gid(f"baseline-{i}")
        offset = (-11, 12) if p.inherited else (11, 0)
        align = "right" if p.inherited else "left"
        vertical = "bottom" if p.inherited else "center"
        if p.label == "CMGAN":
            offset, align, vertical = (0, -12), "center", "top"
        ax.annotate(p.label, (p.recognition_score, p.dnsmos), xytext=offset,
                    textcoords="offset points", ha=align,
                    va=vertical, fontsize=13.5, zorder=5)

    line, = ax.plot([p.recognition_score for p in SWEEP], [p.dnsmos for p in SWEEP],
                    color=COLORS["blue"], linewidth=1.9, marker="o", markersize=8.5,
                    markerfacecolor=COLORS["blue"], markeredgecolor=COLORS["blue"], zorder=3)
    line.set_gid("context-sweep-four-runs")
    for p in SWEEP[:2]:
        ax.text(p.recognition_score - (0.25 if p.context_ms == 26.67 else 0), 3.485,
                p.label, color=COLORS["blue"], fontsize=14.5, ha="center", va="center")
    for p, dx in [(SWEEP[2], -0.7), (SWEEP[3], 0.6)]:
        ax.annotate(p.label, (p.recognition_score, p.dnsmos),
                    xytext=(p.recognition_score + dx, 3.71), ha="center", va="center",
                    fontsize=14.5, color=COLORS["blue"],
                    arrowprops={"arrowstyle": "-", "color": COLORS["guide"],
                                "lw": 0.8, "shrinkA": 8, "shrinkB": 8})
    # Keep the star's true coordinate, with a white knockout to distinguish it
    # from the nearby line. The primary run is never added to the sweep path.
    ax.plot(PRIMARY.recognition_score, PRIMARY.dnsmos, marker="o", markersize=16,
            markerfacecolor="white", markeredgecolor="white", linestyle="none", zorder=4)
    star, = ax.plot(PRIMARY.recognition_score, PRIMARY.dnsmos, marker="*", markersize=14,
                    markerfacecolor=COLORS["blue"], markeredgecolor=COLORS["blue"],
                    linestyle="none", zorder=5)
    star.set_gid("primary-separate-run")
    ax.annotate(PRIMARY.label, (PRIMARY.recognition_score, PRIMARY.dnsmos),
                xytext=(PRIMARY.recognition_score, 3.71), ha="center", va="center",
                fontsize=14.5, fontweight="bold", color=COLORS["blue"],
                arrowprops={"arrowstyle": "-", "color": COLORS["guide"],
                            "lw": 0.8, "shrinkA": 8, "shrinkB": 9})

    legend = [
        Line2D([], [], marker="o", markersize=8.5, markerfacecolor="white",
               markeredgecolor=COLORS["muted"], markeredgewidth=1.8, linestyle="none", label="Offline"),
        Line2D([], [], marker="s", markersize=8.5, markerfacecolor="white",
               markeredgecolor=COLORS["orange"], markeredgewidth=1.8, linestyle="none", label="Streaming"),
        Line2D([], [], color=COLORS["blue"], marker="o", markersize=8.5,
               linewidth=1.9, label="FactorGSE"),
    ]
    fig.legend(handles=legend, loc="upper center", bbox_to_anchor=(0.53, 0.99),
               ncol=3, frameon=False, fontsize=14.5, columnspacing=3.8, handletextpad=0.65)
    return fig


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", type=Path, help="Optional PNG for visual QA")
    args = parser.parse_args()
    validate_source()
    fig = build_figure()
    output = SITE_ROOT / "static/images/results_tradeoff_web.svg"
    fig.savefig(output, format="svg", dpi=DPI, metadata={
        "Title": "DNSMOS–recognition trade-off on URGENT 2025",
        "Description": "Single-panel adaptation of the paper's Fig. 2. Recognition score is 100 minus Avg. WER/CER (%), not token accuracy. The blue curve connects four separately trained context configurations; the star is the separate 186.7-ms primary run.",
        "Creator": "FactorGSE", "Date": None,
    })
    ET.register_namespace("", SVG_NS)
    tree = ET.parse(output)
    root = tree.getroot()
    root.set("role", "img")
    root.set("aria-labelledby", "chart-title chart-desc")
    root.set("width", str(WIDTH))
    root.set("height", str(HEIGHT))
    # Matplotlib's vector viewBox is in points; width/height retain the same ratio.
    root.find(f"{{{SVG_NS}}}title").set("id", "chart-title")
    desc = ET.SubElement(root, f"{{{SVG_NS}}}desc", {"id": "chart-desc"})
    desc.text = "DNSMOS versus recognition score for seven baseline systems, including offline CMGAN, four FactorGSE context-sweep models and one independent primary model. Both axes improve toward the upper right."
    metadata = ET.SubElement(root, f"{{{SVG_NS}}}metadata", {"id": "figure-data"})
    metadata.text = json.dumps({
        "source": ["edge_gse_paper/main.tex", "edge_gse_paper/figures/plot_dns_avgwer_tradeoff.py"],
        "evaluation": "URGENT 2025 Non-blind test set: 400 utterances (300 English, 100 Chinese)",
        "metric": "Avg. WER/CER (%) = unweighted mean of English WER (%) and Chinese CER (%)",
        "x": "Recognition score (%) = 100 - Avg. WER/CER (%)", "y": "DNSMOS",
        "connected_contexts_ms": [p.context_ms for p in SWEEP],
        "points": [{**asdict(p), "recognition_score": p.recognition_score} for p in POINTS],
    }, sort_keys=True)
    tree.write(output, encoding="utf-8", xml_declaration=True)
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(args.preview, dpi=DPI)
    plt.close(fig)
    print(f"Wrote {output}: one panel, {len(POINTS)} source-verified points, {WIDTH} x {HEIGHT}.")


if __name__ == "__main__":
    main()
