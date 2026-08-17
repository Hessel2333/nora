import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const cadSvg = readFileSync(join(projectRoot, "public/cad/factory-plan.svg"), "utf8");
const componentSource = readFileSync(
  join(projectRoot, "src/features/digital-twin/factory-schematic.tsx"),
  "utf8",
);
const pageSource = readFileSync(
  join(projectRoot, "src/features/digital-twin/digital-twin-page.tsx"),
  "utf8",
);
const geometrySource = readFileSync(
  join(projectRoot, "src/features/digital-twin/factory-geometry.ts"),
  "utf8",
);
const model3DSource = readFileSync(
  join(projectRoot, "src/features/digital-twin/factory-model-3d.tsx"),
  "utf8",
);

describe("factory CAD architecture provenance", () => {
  it("keeps the target CAD entities in one coordinate system", () => {
    expect(cadSvg).toContain('viewBox="0 0 1240 670"');
    expect(cadSvg.match(/<path /g)?.length).toBe(483);
    expect(cadSvg.match(/data-layer="门"/g)?.length).toBeGreaterThanOrEqual(10);
    expect(cadSvg.match(/data-layer="门套"/g)?.length).toBeGreaterThanOrEqual(10);
    expect(cadSvg.match(/data-layer="02新建墙体"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(cadSvg.match(/data-layer="01现有不拆墙体\+"/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the CAD vector layer without hand-drawn doors or raster plans", () => {
    expect(componentSource).toContain('href="/cad/factory-plan.svg"');
    expect(componentSource).not.toContain("function Door(");
    expect(componentSource).not.toMatch(/\.png|\.jpg|data:image/);
    expect(cadSvg).not.toMatch(/<image|data:image/);
  });

  it("keeps zoom animation on a composited HTML wrapper", () => {
    expect(componentSource).toContain('className="factory-map-compositor"');
    expect(componentSource).toContain("translate3d(");
    expect(componentSource).not.toContain("<filter");
    expect(componentSource).not.toContain("<feDropShadow");
    expect(componentSource).not.toContain("transition-opacity");
    expect(pageSource).not.toContain("transition-[width]");
  });

  it("opens monitoring details on room double click without hijacking map focus", () => {
    expect(componentSource).toContain("onDoubleClick={(event) =>");
    expect(componentSource).toContain("onOpenRoom();");
    expect(componentSource).not.toContain("onDoubleClick={onFocusRoom}");
    expect(pageSource).toContain("<RoomMonitorDialog");
  });

  it("offers a single-click monitoring shortcut on every room label", () => {
    expect(componentSource).toContain('aria-label={`打开 ${room.id} ${room.name}摄像头监控`}');
    expect(componentSource).toContain("<ChartNoAxesCombined");
    expect(componentSource).toContain("onMonitor();");
    expect(pageSource).toContain("onMonitorRoom={openRoomCamera}");
    expect(pageSource).toContain("onOpenCamera={() => openRoomCamera(selectedRoom.id)}");
    expect(pageSource).toContain("<RoomCameraDialog");
  });

  it("uses restrained rounded rectangles for room labels", () => {
    expect(componentSource).toContain("const labelCornerRadius = compact ? 3 : 4");
    expect(componentSource).toContain("rx={labelCornerRadius}");
    expect(componentSource).not.toContain("rx={pillHeight / 2}");
  });

  it("removes isolated diagonal CAD fragments without stripping equipment symbols", () => {
    expect(cadSvg).not.toContain("M 535.41 149.58 L 543.15 152.00");
    expect(cadSvg).not.toContain("M 674.00 149.58 L 681.98 152.00");
    expect(cadSvg).not.toContain("M 831.45 149.58 L 839.43 152.00");
    expect(cadSvg).toContain("M 644.25 208.36 L 650.30 219.24");
    expect(cadSvg).toContain("M 777.27 208.36 L 783.32 219.24");
  });

  it("uses numbered CAD room geometry without the previous business-zone masks", () => {
    expect(componentSource).toContain("CAD_ROOM_GEOMETRIES");
    expect(componentSource).toContain('variant === "showroom" ? "130 35 986 385" : "0 0 1116 430"');
    expect(componentSource).toContain('mask="url(#factory-footprint-mask)"');
    expect(geometrySource.match(/rectangularRoom\("R\d{2}"/g)?.length).toBe(13);
    expect(geometrySource).toContain('room("R03+R06", "蔬菜内包装间"');
    expect(geometrySource).toContain('room("R05+R07", "肉类内包装间"');
    expect(geometrySource).toContain("left: 361.75, right: 526.7");
    expect(geometrySource).not.toContain('rectangularRoom("R22"');
    for (const removedRoom of ["R16", "R17", "R18", "R19"]) {
      expect(geometrySource).not.toContain(`rectangularRoom("${removedRoom}"`);
    }
    expect(componentSource).not.toContain("ROOM_LAYOUT");
    expect(componentSource).not.toContain("TwinZone");
  });

  it("builds the 3D model from the same CAD room geometry", () => {
    expect(model3DSource).toContain("CAD_ROOM_GEOMETRIES.forEach");
    expect(model3DSource).toContain("cadPointToWorld");
    expect(model3DSource).toContain("OrbitControls");
    expect(model3DSource).toContain("CSS2DRenderer");
    expect(pageSource).toContain('<FactoryModel3D ref={model3DRef}');
    expect(pageSource).toContain('aria-label="地图显示模式"');
  });

  it("uses the prototype-aligned front camera without horizontal yaw", () => {
    expect(model3DSource).toContain("new THREE.Vector3(0, 36, 31)");
    expect(model3DSource).not.toContain("new THREE.Vector3(4.5, 36, 31)");
  });
});
