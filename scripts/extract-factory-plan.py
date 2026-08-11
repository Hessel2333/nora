#!/usr/bin/env python3
"""Extract the target factory plan from a QCAD-converted DXF into a clean SVG.

The output keeps every selected entity in one CAD-to-SVG transform. It is used
as the architectural layer under the React status overlays; no raster CAD image
or independently positioned web door geometry is involved.
"""

from __future__ import annotations

import argparse
import html
import math
from pathlib import Path

import ezdxf


CAD_BOUNDS = (-1127438.26, -667260.68, -1113083.20, -637635.10)
VIEW_WIDTH = 1240.0
VIEW_HEIGHT = 670.0
PADDING_X = 20.0
SCALE = 1200.0 / (CAD_BOUNDS[3] - CAD_BOUNDS[1])
PADDING_Y = (VIEW_HEIGHT - (CAD_BOUNDS[2] - CAD_BOUNDS[0]) * SCALE) / 2.0

EXPLICIT_LAYERS = {
    "01现有不拆墙体+",
    "01现有柱子",
    "02新建墙体",
    "02铺装分割",
    "04装修完成面2350",
    "WALL-MOVE",
    "门",
    "门套",
    "平面-家具层",
    "设备",
}


def transform(x: float, y: float) -> tuple[float, float]:
    return (
        PADDING_X + (CAD_BOUNDS[3] - y) * SCALE,
        PADDING_Y + (CAD_BOUNDS[2] - x) * SCALE,
    )


def in_target(x: float, y: float) -> bool:
    # Main production/cold-chain body, receiving/changing wing and dispatch bay.
    return (
        (-1122500 <= x <= -1112950 and -665000 <= y <= -640450)
        or (-1127600 <= x <= -1121900 and -646000 <= y <= -640450)
        or (-1122600 <= x <= -1112950 and -668000 <= y <= -664000)
        or (-1117100 <= x <= -1112950 and -640900 <= y <= -637500)
    )


def style(entity) -> tuple[str, float, float]:
    layer = entity.dxf.layer
    color = entity.dxf.color
    if layer in {"01现有不拆墙体+", "02新建墙体", "WALL-MOVE"}:
        return "#718094", 1.55, 1.0
    if layer in {"门", "门套"} or color == 4:
        return "#8192a5", 1.15, 0.96
    if layer == "01现有柱子":
        return "#718094", 1.35, 1.0
    if color == 6:
        return "#8291a4", 1.25, 0.96
    if color == 3:
        return "#9aa8b7", 0.95, 0.9
    return "#a8b4c2", 0.85, 0.78


def points_for(entity) -> list[tuple[float, float]]:
    kind = entity.dxftype()
    if kind == "LINE":
        return [(entity.dxf.start.x, entity.dxf.start.y), (entity.dxf.end.x, entity.dxf.end.y)]
    if kind == "LWPOLYLINE":
        return [(point[0], point[1]) for point in entity.get_points("xy")]
    if kind == "POLYLINE":
        return [(vertex.dxf.location.x, vertex.dxf.location.y) for vertex in entity.vertices]
    if kind in {"ARC", "CIRCLE"}:
        center = entity.dxf.center
        radius = entity.dxf.radius
        start = entity.dxf.start_angle if kind == "ARC" else 0.0
        end = entity.dxf.end_angle if kind == "ARC" else 360.0
        if end <= start:
            end += 360.0
        steps = max(12, math.ceil((end - start) / 6.0))
        return [
            (
                center.x + radius * math.cos(math.radians(start + (end - start) * index / steps)),
                center.y + radius * math.sin(math.radians(start + (end - start) * index / steps)),
            )
            for index in range(steps + 1)
        ]
    return []


def selected(entity, points: list[tuple[float, float]]) -> bool:
    if not points or not any(in_target(x, y) for x, y in points):
        return False
    layer = entity.dxf.layer
    if layer in EXPLICIT_LAYERS:
        return True
    if layer != "0" or entity.dxf.color not in {3, 4, 6}:
        return False
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    width = max(xs) - min(xs)
    height = max(ys) - min(ys)
    # Repeated three-stroke slash symbols are CAD annotations for movable
    # openings, not architectural wall or equipment geometry.
    short_side, long_side = sorted((width, height))
    if entity.dxf.color == 6 and len(points) == 2 and 250 <= short_side <= 450 and 450 <= long_side <= 750:
        return False
    extent = max(width, height)
    return extent >= 180.0


def geometry_key(points: list[tuple[float, float]], closed: bool) -> tuple:
    rounded = tuple((round(x, 2), round(y, 2)) for x, y in points)
    if closed and len(rounded) > 1 and rounded[0] == rounded[-1]:
        rounded = rounded[:-1]
    if not closed:
        return min(rounded, tuple(reversed(rounded)))
    if len(rounded) <= 64:
        variants = []
        for sequence in (rounded, tuple(reversed(rounded))):
            variants.extend(sequence[index:] + sequence[:index] for index in range(len(sequence)))
        return min(variants)
    return min(rounded, tuple(reversed(rounded)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    document = ezdxf.readfile(args.input)
    paths: dict[tuple, tuple[float, str]] = {}
    for entity in document.modelspace():
        if entity.dxftype() not in {"LINE", "LWPOLYLINE", "POLYLINE", "ARC", "CIRCLE"}:
            continue
        source_points = points_for(entity)
        if not selected(entity, source_points):
            continue
        transformed = [transform(x, y) for x, y in source_points]
        if len(transformed) < 2:
            continue
        commands = [f"M {transformed[0][0]:.2f} {transformed[0][1]:.2f}"]
        commands.extend(f"L {x:.2f} {y:.2f}" for x, y in transformed[1:])
        closed = bool(getattr(entity, "closed", False) or entity.dxftype() == "CIRCLE")
        if closed:
            commands.append("Z")
        stroke, width, opacity = style(entity)
        layer = html.escape(entity.dxf.layer, quote=True)
        markup = (
            f'<path d="{html.escape(" ".join(commands))}" stroke="{stroke}" '
            f'stroke-width="{width}" opacity="{opacity}" data-layer="{layer}" '
            f'data-type="{entity.dxftype()}" data-color="{entity.dxf.color}"/>'
        )
        key = geometry_key(transformed, closed)
        previous = paths.get(key)
        if previous is None or width > previous[0]:
            paths[key] = (width, markup)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "\n".join(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 670" fill="none" '
                'stroke-linecap="round" stroke-linejoin="round">',
                '<rect width="1240" height="670" fill="transparent"/>',
                *(markup for _, markup in paths.values()),
                "</svg>",
            ]
        ),
        encoding="utf-8",
    )
    print(f"wrote {len(paths)} unique CAD entities to {args.output}")


if __name__ == "__main__":
    main()
