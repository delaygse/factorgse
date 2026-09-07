#!/usr/bin/env python3
"""Render the wide, web-native FactorGSE results figure as deterministic SVG.

The values below are transcribed from the latest ``edge_gse_paper/main.tex``
and ``edge_gse_paper/figures/plot_dns_avgwer_tradeoff.py``.  The figure keeps
the paper's important provenance distinction: the four context-sweep records
are connected, while the 186.7-ms primary record is an independent run and is
therefore shown as a star without joining the sweep.

Only Python's standard library is required.  From the site repository, run:

    python3 scripts/render_results_web.py

The output is ``static/images/results_tradeoff_web.svg``.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
from typing import Iterable, Mapping, Optional, Sequence
from xml.etree import ElementTree as ET


WIDTH = 1180
HEIGHT = 700
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


@dataclass(frozen=True)
class SystemPoint:
    name: str
    macro_asr_error: float
    dnsmos: float
    category: str
    inherited: bool = False

    @property
    def recognition_score(self) -> float:
        return 100.0 - self.macro_asr_error


@dataclass(frozen=True)
class SweepPoint:
    context_ms: float
    macro_asr_error: float
    dnsmos: float

    @property
    def recognition_score(self) -> float:
        return 100.0 - self.macro_asr_error


# Aggregate URGENT 2025 values reported in Table 1 of main.tex.  Noisy input is
# deliberately omitted, matching the paper's trade-off figure.
SYSTEM_POINTS: tuple[SystemPoint, ...] = (
    SystemPoint("UniSE", 33.25, 3.85, "offline"),
    SystemPoint("DelayGSE", 16.95, 3.77, "offline", inherited=True),
    SystemPoint("Bridge", 33.20, 3.37, "offline"),
    SystemPoint("Stream.FM", 43.60, 3.24, "streaming"),
    SystemPoint("FastEnhancer-L", 33.90, 3.23, "streaming"),
    SystemPoint("DeepFilterNet3", 28.40, 3.32, "streaming"),
)

# The connected records in plot_dns_avgwer_tradeoff.py.
CONTEXT_SWEEP: tuple[SweepPoint, ...] = (
    SweepPoint(26.67, 29.85, 3.54),
    SweepPoint(80.0, 28.00, 3.58),
    SweepPoint(160.0, 26.85, 3.61),
    SweepPoint(240.0, 23.30, 3.62),
)

# The paper's N_LA=6 primary record.  It is not a fifth sweep observation.
PRIMARY = SweepPoint(186.7, 25.45, 3.62)


COLORS = {
    "ink": "#172033",
    "muted": "#61708A",
    "line": "#DCE4EF",
    "grid": "#E7EDF5",
    "soft": "#F7F9FC",
    "white": "#FFFFFF",
    "blue": "#2563EB",
    "blue_dark": "#1D4ED8",
    "blue_soft": "#EAF1FF",
    "orange": "#D97706",
    "orange_soft": "#FFF4E3",
    "neutral": "#7A879C",
}


def element(
    tag: str,
    attributes: Optional[Mapping[str, object]] = None,
    *,
    text: Optional[str] = None,
) -> ET.Element:
    node = ET.Element(
        f"{{{SVG_NS}}}{tag}",
        {key: str(value) for key, value in (attributes or {}).items()},
    )
    node.text = text
    return node


def add(
    parent: ET.Element,
    tag: str,
    attributes: Optional[Mapping[str, object]] = None,
    *,
    text: Optional[str] = None,
) -> ET.Element:
    child = element(tag, attributes, text=text)
    parent.append(child)
    return child


def add_text(
    parent: ET.Element,
    x: float,
    y: float,
    label: str,
    css_class: str,
    *,
    anchor: str = "start",
    fill: Optional[str] = None,
    transform: Optional[str] = None,
    extra: Optional[Mapping[str, object]] = None,
) -> ET.Element:
    attrs: dict[str, object] = {
        "x": compact(x),
        "y": compact(y),
        "class": css_class,
        "text-anchor": anchor,
    }
    if fill:
        attrs["fill"] = fill
    if transform:
        attrs["transform"] = transform
    if extra:
        attrs.update(extra)
    return add(parent, "text", attrs, text=label)


def compact(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def scale(
    value: float,
    domain_min: float,
    domain_max: float,
    range_min: float,
    range_max: float,
) -> float:
    return range_min + (value - domain_min) / (domain_max - domain_min) * (
        range_max - range_min
    )


def add_line(
    parent: ET.Element,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    css_class: str,
    **attributes: object,
) -> ET.Element:
    attrs: dict[str, object] = {
        "x1": compact(x1),
        "y1": compact(y1),
        "x2": compact(x2),
        "y2": compact(y2),
        "class": css_class,
    }
    attrs.update(attributes)
    return add(parent, "line", attrs)


def star_points(cx: float, cy: float, outer: float, inner: float) -> str:
    points = []
    for index in range(10):
        angle = math.radians(-90 + index * 36)
        radius = outer if index % 2 == 0 else inner
        points.append(
            f"{compact(cx + radius * math.cos(angle))},"
            f"{compact(cy + radius * math.sin(angle))}"
        )
    return " ".join(points)


def add_marker(
    parent: ET.Element,
    x: float,
    y: float,
    shape: str,
    color: str,
    *,
    filled: bool,
    size: float = 5.0,
    css_class: str = "mark",
    aria_label: Optional[str] = None,
) -> ET.Element:
    group_attrs: dict[str, object] = {"class": css_class}
    if aria_label:
        group_attrs.update({"role": "img", "aria-label": aria_label})
    group = add(parent, "g", group_attrs)
    common: dict[str, object] = {
        "fill": color if filled else COLORS["white"],
        "stroke": color,
        "stroke-width": 2.4,
    }
    if shape == "circle":
        add(group, "circle", {"cx": compact(x), "cy": compact(y), "r": size, **common})
    elif shape == "square":
        add(
            group,
            "rect",
            {
                "x": compact(x - size),
                "y": compact(y - size),
                "width": compact(size * 2),
                "height": compact(size * 2),
                "rx": 1.4,
                **common,
            },
        )
    elif shape == "star":
        add(
            group,
            "polygon",
            {"points": star_points(x, y, size * 1.35, size * 0.59), **common},
        )
    else:
        raise ValueError(f"Unsupported marker shape: {shape}")
    return group


def add_primary_star(
    parent: ET.Element,
    x: float,
    y: float,
    color: str,
    aria_label: str,
    *,
    size: float = 7.2,
) -> None:
    # The white knockout prevents the independent star from visually joining a
    # nearby sweep segment while preserving its true data coordinate.
    add(parent, "circle", {
        "cx": compact(x), "cy": compact(y), "r": compact(size + 4.3),
        "fill": COLORS["white"], "stroke": COLORS["white"], "stroke-width": 2,
        "aria-hidden": "true",
    })
    add_marker(
        parent,
        x,
        y,
        "star",
        color,
        filled=True,
        size=size,
        css_class="primary-mark",
        aria_label=aria_label,
    )


def add_polyline(
    parent: ET.Element,
    points: Iterable[tuple[float, float]],
    css_class: str,
    *,
    aria_label: str,
) -> ET.Element:
    point_list = list(points)
    return add(
        parent,
        "polyline",
        {
            "points": " ".join(f"{compact(x)},{compact(y)}" for x, y in point_list),
            "class": css_class,
            "role": "img",
            "aria-label": aria_label,
        },
    )


def add_label_pair(
    parent: ET.Element,
    x: float,
    y: float,
    name: str,
    value: str,
    *,
    anchor: str = "start",
    color: str = COLORS["ink"],
    inherited: bool = False,
) -> None:
    shown_name = f"{name}†" if inherited else name
    add_text(parent, x, y, shown_name, "method-label", anchor=anchor, fill=color)
    add_text(parent, x, y + 15, value, "value-label", anchor=anchor)


def draw_panel_heading(
    parent: ET.Element,
    x: float,
    letter: str,
    title: str,
    subtitle: str,
) -> None:
    add(
        parent,
        "rect",
        {"x": x, "y": 111, "width": 30, "height": 30, "rx": 9, "class": "panel-tag"},
    )
    add_text(parent, x + 15, 132, letter, "panel-letter", anchor="middle")
    add_text(parent, x + 42, 129, title, "panel-title")
    add_text(parent, x + 42, 153, subtitle, "panel-subtitle")


def draw_panel_a(root: ET.Element) -> None:
    panel = add(
        root,
        "g",
        {"id": "panel-a", "role": "group", "aria-label": "Panel A, system comparison"},
    )
    add(panel, "rect", {"x": 28, "y": 94, "width": 544, "height": 528, "rx": 18, "class": "card"})
    draw_panel_heading(
        panel,
        50,
        "A",
        "System-level trade-off",
        "DNSMOS vs macro recognition score · upper right is better",
    )

    plot_left, plot_right = 92.0, 548.0
    plot_top, plot_bottom = 198.0, 526.0
    x_min, x_max = 55.0, 85.0
    y_min, y_max = 3.10, 3.90

    def map_x(score: float) -> float:
        return scale(score, x_min, x_max, plot_left, plot_right)

    def map_y(dnsmos: float) -> float:
        return scale(dnsmos, y_min, y_max, plot_bottom, plot_top)

    for tick in (55, 60, 65, 70, 75, 80, 85):
        x = map_x(float(tick))
        add_line(panel, x, plot_top, x, plot_bottom, "grid-line")
        add_line(panel, x, plot_bottom, x, plot_bottom + 5, "axis-line")
        add_text(panel, x, plot_bottom + 21, str(tick), "tick-label", anchor="middle")

    for tick in (3.2, 3.4, 3.6, 3.8):
        y = map_y(tick)
        add_line(panel, plot_left, y, plot_right, y, "grid-line")
        add_line(panel, plot_left - 5, y, plot_left, y, "axis-line")
        add_text(panel, plot_left - 10, y + 4, f"{tick:.1f}", "tick-label", anchor="end")

    add_line(panel, plot_left, plot_top, plot_left, plot_bottom, "axis-line")
    add_line(panel, plot_left, plot_bottom, plot_right, plot_bottom, "axis-line")
    add_text(
        panel,
        (plot_left + plot_right) / 2,
        572,
        "Macro recognition score (%)  →",
        "axis-title",
        anchor="middle",
    )
    add_text(
        panel,
        49,
        (plot_top + plot_bottom) / 2,
        "DNSMOS  →",
        "axis-title",
        anchor="middle",
        transform=f"rotate(-90 49 {compact((plot_top + plot_bottom) / 2)})",
    )

    label_layout = {
        "UniSE": (12, -8, "start"),
        "DelayGSE": (-10, -19, "end"),
        "Bridge": (-11, -22, "end"),
        "Stream.FM": (12, -17, "start"),
        "FastEnhancer-L": (0, 25, "middle"),
        "DeepFilterNet3": (12, -7, "start"),
    }
    for point in SYSTEM_POINTS:
        x = map_x(point.recognition_score)
        y = map_y(point.dnsmos)
        if point.category == "offline":
            shape, color = "circle", COLORS["neutral"]
        else:
            shape, color = "square", COLORS["orange"]
        inherited_note = ", inherited record" if point.inherited else ""
        add_marker(
            panel,
            x,
            y,
            shape,
            color,
            filled=False,
            aria_label=(
                f"{point.name}{inherited_note}: DNSMOS {point.dnsmos:.2f}; "
                f"Macro ASR error {point.macro_asr_error:.2f} percent; "
                f"Macro recognition score {point.recognition_score:.2f} percent"
            ),
        )
        dx, dy, anchor = label_layout[point.name]
        add_label_pair(
            panel,
            x + dx,
            y + dy,
            point.name,
            f"{point.dnsmos:.2f} · {point.macro_asr_error:.2f}% error",
            anchor=anchor,
            inherited=point.inherited,
        )

    primary_x = map_x(PRIMARY.recognition_score)
    primary_y = map_y(PRIMARY.dnsmos)
    add_primary_star(
        panel,
        primary_x,
        primary_y,
        COLORS["blue"],
        (
            "FactorGSE primary, separate record: input context 186.7 milliseconds; "
            "DNSMOS 3.62; Macro ASR error 25.45 percent; "
            "Macro recognition score 74.55 percent"
        ),
        size=7.6,
    )
    add_label_pair(
        panel,
        primary_x + 15,
        primary_y - 15,
        "FactorGSE primary",
        "3.62 · 25.45% error · 186.7 ms",
        color=COLORS["blue_dark"],
    )

    legend_y = 600
    add_marker(panel, 92, legend_y - 4, "circle", COLORS["neutral"], filled=False, size=4)
    add_text(panel, 103, legend_y, "Offline", "legend-label")
    add_marker(panel, 174, legend_y - 4, "square", COLORS["orange"], filled=False, size=4)
    add_text(panel, 185, legend_y, "Streaming reference", "legend-label")
    add_marker(panel, 337, legend_y - 4, "star", COLORS["blue"], filled=True, size=4.6)
    add_text(panel, 349, legend_y, "FactorGSE primary", "legend-label")


def draw_metric_plot(
    parent: ET.Element,
    *,
    plot_top: float,
    plot_bottom: float,
    y_min: float,
    y_max: float,
    ticks: Sequence[float],
    values: Sequence[float],
    primary_value: float,
    color: str,
    soft_color: str,
    metric_label: str,
    value_format: str,
    marker_shape: str,
    polyline_class: str,
) -> None:
    plot_left, plot_right = 650.0, 1124.0
    x_min, x_max = 15.0, 250.0

    def map_x(context: float) -> float:
        return scale(context, x_min, x_max, plot_left, plot_right)

    def map_y(value: float) -> float:
        return scale(value, y_min, y_max, plot_bottom, plot_top)

    add(
        parent,
        "rect",
        {
            "x": plot_left,
            "y": plot_top,
            "width": plot_right - plot_left,
            "height": plot_bottom - plot_top,
            "rx": 10,
            "fill": soft_color,
            "fill-opacity": 0.38,
        },
    )
    for tick in ticks:
        y = map_y(tick)
        add_line(parent, plot_left, y, plot_right, y, "grid-line")
        add_text(parent, plot_left - 10, y + 4, value_format.format(tick), "tick-label", anchor="end")
    for record in CONTEXT_SWEEP:
        x = map_x(record.context_ms)
        add_line(parent, x, plot_top, x, plot_bottom, "vertical-grid")
    add_line(parent, plot_left, plot_top, plot_left, plot_bottom, "axis-line")
    add_line(parent, plot_left, plot_bottom, plot_right, plot_bottom, "axis-line")

    add(
        parent,
        "rect",
        {"x": 650, "y": plot_top - 27, "width": 176, "height": 23, "rx": 7, "fill": soft_color},
    )
    add_text(parent, 661, plot_top - 10, metric_label, "metric-label", fill=color)

    mapped = [
        (map_x(record.context_ms), map_y(value))
        for record, value in zip(CONTEXT_SWEEP, values)
    ]
    add_polyline(
        parent,
        mapped,
        polyline_class,
        aria_label=f"Connected context sweep for {metric_label}",
    )
    for record, value, (x, y) in zip(CONTEXT_SWEEP, values, mapped):
        add_marker(
            parent,
            x,
            y,
            marker_shape,
            color,
            filled=marker_shape == "circle",
            size=5.0,
            aria_label=(
                f"Context sweep: {record.context_ms:g} milliseconds, "
                f"{metric_label.replace(' ↑', '').replace(' ↓', '')} "
                f"{value_format.format(value)}"
            ),
        )

    primary_x = map_x(PRIMARY.context_ms)
    primary_y = map_y(primary_value)
    add_primary_star(
        parent,
        primary_x,
        primary_y,
        color,
        (
            f"Primary separate record: context {PRIMARY.context_ms:.1f} milliseconds; "
            f"{metric_label.replace(' ↑', '').replace(' ↓', '')} "
            f"{value_format.format(primary_value)}"
        ),
        size=6.6,
    )

    label_offsets = {
        26.67: (0, -11, "middle"),
        80.0: (0, -11, "middle"),
        160.0: (-5, 19, "end"),
        240.0: (0, -11, "middle"),
    }
    for record, value, (x, y) in zip(CONTEXT_SWEEP, values, mapped):
        dx, dy, anchor = label_offsets[record.context_ms]
        add_text(
            parent,
            x + dx,
            y + dy,
            value_format.format(value),
            "point-value",
            anchor=anchor,
            fill=color,
        )


def draw_panel_b(root: ET.Element) -> None:
    panel = add(
        root,
        "g",
        {"id": "panel-b", "role": "group", "aria-label": "Panel B, context sweep"},
    )
    add(panel, "rect", {"x": 588, "y": 94, "width": 564, "height": 528, "rx": 18, "class": "card"})
    draw_panel_heading(
        panel,
        610,
        "B",
        "Context sweep and primary point",
        "Four connected observations · star = independent primary record",
    )

    plot_left, plot_right = 650.0, 1124.0
    x_min, x_max = 15.0, 250.0

    def map_x(context: float) -> float:
        return scale(context, x_min, x_max, plot_left, plot_right)

    primary_x = map_x(PRIMARY.context_ms)
    add_line(
        panel,
        primary_x,
        172,
        primary_x,
        527,
        "primary-guide",
        **{"aria-label": "186.7 millisecond primary-record guide"},
    )
    add(
        panel,
        "rect",
        {"x": primary_x - 44, "y": 166, "width": 88, "height": 22, "rx": 11, "class": "primary-pill"},
    )
    add_text(panel, primary_x, 181, "186.7 ms", "primary-pill-text", anchor="middle")

    draw_metric_plot(
        panel,
        plot_top=211,
        plot_bottom=346,
        y_min=3.52,
        y_max=3.64,
        ticks=(3.54, 3.58, 3.62),
        values=tuple(record.dnsmos for record in CONTEXT_SWEEP),
        primary_value=PRIMARY.dnsmos,
        color=COLORS["blue"],
        soft_color=COLORS["blue_soft"],
        metric_label="DNSMOS ↑",
        value_format="{:.2f}",
        marker_shape="circle",
        polyline_class="dns-line",
    )
    draw_metric_plot(
        panel,
        plot_top=404,
        plot_bottom=527,
        y_min=22.0,
        y_max=31.0,
        ticks=(24.0, 27.0, 30.0),
        values=tuple(record.macro_asr_error for record in CONTEXT_SWEEP),
        primary_value=PRIMARY.macro_asr_error,
        color=COLORS["orange"],
        soft_color=COLORS["orange_soft"],
        metric_label="Macro ASR error (%) ↓",
        value_format="{:.2f}",
        marker_shape="square",
        polyline_class="error-line",
    )

    for context, label in ((26.67, "26.7"), (80.0, "80"), (160.0, "160"), (240.0, "240")):
        x = map_x(context)
        add_line(panel, x, 527, x, 532, "axis-line")
        add_text(panel, x, 549, label, "tick-label", anchor="middle")
    add_line(panel, primary_x, 527, primary_x, 534, "primary-tick")
    add_text(panel, primary_x, 551, "186.7", "primary-tick-label", anchor="middle")
    add_text(
        panel,
        (plot_left + plot_right) / 2,
        574,
        "Configured input context (ms)",
        "axis-title",
        anchor="middle",
    )
    add_marker(panel, 650, 596, "star", COLORS["blue"], filled=True, size=4.6)
    add_text(panel, 663, 600, "Primary (separate run):", "legend-label-strong")
    add_text(
        panel,
        802,
        600,
        "3.62 DNSMOS · 25.45% error",
        "legend-label",
    )


def validate_data() -> None:
    assert len(SYSTEM_POINTS) == 6
    assert len(CONTEXT_SWEEP) == 4
    assert PRIMARY.context_ms not in {point.context_ms for point in CONTEXT_SWEEP}
    assert math.isclose(PRIMARY.recognition_score, 74.55, abs_tol=1e-9)
    delaygse = next(point for point in SYSTEM_POINTS if point.name == "DelayGSE")
    assert delaygse.inherited
    assert [point.context_ms for point in CONTEXT_SWEEP] == [26.67, 80.0, 160.0, 240.0]
    assert [point.macro_asr_error for point in CONTEXT_SWEEP] == [29.85, 28.00, 26.85, 23.30]
    assert [point.dnsmos for point in CONTEXT_SWEEP] == [3.54, 3.58, 3.61, 3.62]


def build_svg() -> ET.Element:
    validate_data()
    root = element(
        "svg",
        {
            "width": WIDTH,
            "height": HEIGHT,
            "viewBox": f"0 0 {WIDTH} {HEIGHT}",
            "role": "img",
            "aria-labelledby": "chart-title chart-desc",
            "preserveAspectRatio": "xMidYMid meet",
        },
    )
    add(
        root,
        "title",
        {"id": "chart-title"},
        text="FactorGSE objective results and context trade-offs",
    )
    add(
        root,
        "desc",
        {"id": "chart-desc"},
        text=(
            "Panel A compares DNSMOS with 100 minus bilingual Macro ASR error for "
            "offline and streaming systems. Panel B shows four connected FactorGSE "
            "context-sweep observations for DNSMOS and Macro ASR error. The 186.7 "
            "millisecond primary result is a separate record and is marked by stars. "
            "DelayGSE is an inherited record."
        ),
    )
    add(
        root,
        "metadata",
        text=json.dumps(
            {
                "source": [
                    "edge_gse_paper/main.tex",
                    "edge_gse_paper/figures/plot_dns_avgwer_tradeoff.py",
                ],
                "evaluation": "URGENT 2025 nonblind_test, 400 utterances (300 English, 100 Chinese)",
                "systems": [point.__dict__ for point in SYSTEM_POINTS],
                "connected_context_sweep": [point.__dict__ for point in CONTEXT_SWEEP],
                "primary_separate_record": PRIMARY.__dict__,
            },
            sort_keys=True,
            separators=(",", ":"),
        ),
    )
    style = add(root, "style")
    style.text = f"""
      text {{ font-family: Inter, Arial, Helvetica, sans-serif; }}
      .canvas {{ fill: {COLORS['white']}; }}
      .card {{ fill: {COLORS['white']}; stroke: {COLORS['line']}; stroke-width: 1.5; }}
      .page-title {{ fill: {COLORS['ink']}; font-size: 27px; font-weight: 750; letter-spacing: -0.35px; }}
      .page-subtitle {{ fill: {COLORS['muted']}; font-size: 13.5px; font-weight: 500; }}
      .panel-tag {{ fill: {COLORS['blue_soft']}; stroke: #C8D8FF; stroke-width: 1; }}
      .panel-letter {{ fill: {COLORS['blue_dark']}; font-size: 14px; font-weight: 800; }}
      .panel-title {{ fill: {COLORS['ink']}; font-size: 17px; font-weight: 750; letter-spacing: -0.15px; }}
      .panel-subtitle {{ fill: {COLORS['muted']}; font-size: 11.5px; font-weight: 500; }}
      .grid-line {{ stroke: {COLORS['grid']}; stroke-width: 1; }}
      .vertical-grid {{ stroke: {COLORS['grid']}; stroke-width: 1; stroke-dasharray: 3 5; }}
      .axis-line {{ stroke: #9AA7BA; stroke-width: 1.15; }}
      .axis-title {{ fill: #445168; font-size: 11.5px; font-weight: 650; }}
      .tick-label {{ fill: {COLORS['muted']}; font-size: 10.5px; font-variant-numeric: tabular-nums; }}
      .method-label {{ font-size: 11.2px; font-weight: 750; }}
      .value-label {{ fill: {COLORS['muted']}; font-size: 9.5px; font-weight: 500; font-variant-numeric: tabular-nums; }}
      .legend-label {{ fill: {COLORS['muted']}; font-size: 10.5px; font-weight: 550; }}
      .legend-label-strong {{ fill: {COLORS['ink']}; font-size: 10.5px; font-weight: 750; }}
      .metric-label {{ font-size: 11px; font-weight: 750; }}
      .point-value {{ font-size: 9.5px; font-weight: 700; font-variant-numeric: tabular-nums; paint-order: stroke; stroke: white; stroke-width: 3px; stroke-linejoin: round; }}
      .dns-line {{ fill: none; stroke: {COLORS['blue']}; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }}
      .error-line {{ fill: none; stroke: {COLORS['orange']}; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 8 6; }}
      .primary-guide {{ stroke: #9CB4E9; stroke-width: 1.25; stroke-dasharray: 4 5; }}
      .primary-pill {{ fill: {COLORS['blue_dark']}; }}
      .primary-pill-text {{ fill: white; font-size: 10px; font-weight: 750; font-variant-numeric: tabular-nums; }}
      .primary-tick {{ stroke: {COLORS['blue_dark']}; stroke-width: 1.8; }}
      .primary-tick-label {{ fill: {COLORS['blue_dark']}; font-size: 10px; font-weight: 750; font-variant-numeric: tabular-nums; }}
      .footer-note {{ fill: {COLORS['muted']}; font-size: 11px; font-weight: 500; }}
      .footer-note-strong {{ fill: {COLORS['ink']}; font-size: 11px; font-weight: 700; }}
    """
    add(root, "rect", {"x": 0, "y": 0, "width": WIDTH, "height": HEIGHT, "class": "canvas"})
    add_text(root, 28, 40, "Objective results and context trade-offs", "page-title")
    add_text(
        root,
        28,
        67,
        "URGENT 2025 · 400 bilingual utterances (300 English / 100 Chinese) · aggregate point estimates",
        "page-subtitle",
    )
    draw_panel_a(root)
    draw_panel_b(root)
    add_text(
        root,
        28,
        654,
        "Macro recognition score = 100 − Macro ASR error; it is direction-aligned, not token accuracy.",
        "footer-note-strong",
    )
    add_text(
        root,
        28,
        678,
        "Noisy input omitted. † DelayGSE is inherited; external training data and latency definitions are not harmonized.",
        "footer-note",
    )
    return root


def main() -> None:
    output_path = Path(__file__).resolve().parents[1] / "static/images/results_tradeoff_web.svg"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    root = build_svg()
    ET.indent(root, space="  ")
    tree = ET.ElementTree(root)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
    print(f"Wrote {output_path}")
    print(f"sha256 {digest}")


if __name__ == "__main__":
    main()
