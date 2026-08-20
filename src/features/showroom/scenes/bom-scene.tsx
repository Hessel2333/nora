"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { RecipeLayer } from "@/features/mrp/bom-explosion-data";
import { BOM_PROCESS_ROUTES, SHOWROOM_BOM } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const ROUTE_PHASES = [
  { layerId: "marinated-chicken", start: 0.38, end: 0.62 },
  { layerId: "kung-pao-sauce", start: 0.62, end: 0.70 },
  { layerId: "cucumber-dice", start: 0.70, end: 0.78 },
  { layerId: "chili-segments", start: 0.78, end: 0.85 },
  { layerId: "scallion-garnish", start: 0.85, end: 0.92 },
  { layerId: "peanut-pack", start: 0.92, end: 0.98 },
] as const;

function getRoutePhase(progress: number) {
  for (let index = ROUTE_PHASES.length - 1; index >= 0; index -= 1) {
    if (progress >= ROUTE_PHASES[index].start) return { ...ROUTE_PHASES[index], index };
  }
  return { ...ROUTE_PHASES[0], index: 0 };
}

export function BomScene({ progress, autoAdvance, onInteract }: { progress: number; autoAdvance: boolean; onInteract: () => void }) {
  const [selectedLayerId, setSelectedLayerId] = useState(SHOWROOM_BOM.layers[0].id);
  const phase = getRoutePhase(progress);
  const automaticLayerId = phase.layerId;
  const activeLayerId = autoAdvance ? automaticLayerId : selectedLayerId;
  const selectedLayer = useMemo(
    () => SHOWROOM_BOM.layers.find((layer) => layer.id === activeLayerId) ?? SHOWROOM_BOM.layers[0],
    [activeLayerId],
  );
  const route = BOM_PROCESS_ROUTES[selectedLayer.id];
  const showLayers = progress > 0.16;
  const showProcess = progress > 0.38;
  const routeProgress = autoAdvance
    ? Math.max(0, Math.min(1, (progress - phase.start) / (phase.end - phase.start)))
    : 1;
  const activeStep = Math.min(route.steps.length - 1, Math.floor(routeProgress * route.steps.length));
  const selectedLayerIndex = SHOWROOM_BOM.layers.findIndex((layer) => layer.id === selectedLayer.id);

  const selectLayer = (layer: RecipeLayer) => {
    onInteract();
    setSelectedLayerId(layer.id);
  };

  return (
    <section className={`${styles.scene} ${styles.bomScene}`}>
      <SceneTitle
        eyebrow="03 · FOOD DIGITAL DNA"
        title="系统不仅知道配方，也知道每一步如何加工"
        description={`Recipe + BOM + Routing + Yield + Specification · ${SHOWROOM_BOM.finished.bomVersion}`}
      />

      <div className={styles.bomSignature}>
        <div className={`${styles.bomProduct} ${showLayers ? styles.bomProductShifted : ""}`}>
          <span className={styles.bomProductImage} data-shared-dish-target>
            <span className={styles.dishHalo} />
            <Image src={SHOWROOM_BOM.finished.image} alt={`${SHOWROOM_BOM.finished.name}成品`} fill priority sizes="(max-width: 2200px) 420px, 760px" />
          </span>
          <div><small>标准成品 · {SHOWROOM_BOM.finished.quantity} g</small><strong>{SHOWROOM_BOM.finished.name}</strong></div>
        </div>

        <svg className={`${styles.bomConnections} ${showLayers ? styles.isVisible : ""}`} viewBox="0 0 760 520" aria-hidden="true">
          <path d="M225 250 C310 250 330 36 470 36" />
          <path d="M225 250 C310 250 330 125 470 125" />
          <path d="M225 250 C310 250 330 214 470 214" />
          <path d="M225 250 C310 250 330 303 470 303" />
          <path d="M225 250 C310 250 330 392 470 392" />
          <path d="M225 250 C310 250 330 481 470 481" />
        </svg>

        <div className={`${styles.bomLayerNodes} ${showLayers ? styles.isVisible : ""}`}>
          {SHOWROOM_BOM.layers.map((layer, index) => (
            <button
              key={layer.id}
              type="button"
              data-showroom-control
              data-position={index}
              aria-pressed={selectedLayer.id === layer.id}
              onClick={() => selectLayer(layer)}
              className={selectedLayer.id === layer.id ? styles.bomLayerActive : ""}
            >
              <span><Image src={layer.image} alt={layer.name} fill sizes="110px" /></span>
              <i><strong>{layer.name}</strong><small>{layer.quantity} {layer.unit} · 出成率 {layer.yieldRate}%</small></i>
            </button>
          ))}
        </div>

        <div className={`${styles.processWorkbench} ${showProcess ? styles.isVisible : ""}`}>
          <header key={`route-header-${selectedLayer.id}`} className={styles.processPageEnter}>
            <p>PROCESS ROUTING · {selectedLayer.code} · {String(selectedLayerIndex + 1).padStart(2, "0")} / {String(SHOWROOM_BOM.layers.length).padStart(2, "0")}</p>
            <h2>{route.sourceLabel} → {selectedLayer.name}</h2>
            <span>{selectedLayer.station}</span>
          </header>

          <div key={`materials-${selectedLayer.id}`} className={`${styles.rawMaterialCloud} ${styles.processPageEnter}`}>
            {selectedLayer.rawMaterials.map((material, index) => (
              <span key={material.id} style={{ "--raw-index": index } as CSSProperties}>
                <i data-status={material.status} />
                <strong>{material.name}</strong>
                <small>{material.quantity} {material.unit}</small>
              </span>
            ))}
          </div>

          <div key={`rail-${selectedLayer.id}`} className={`${styles.processRail} ${styles.processPageEnter}`} style={{ "--process-progress": routeProgress } as CSSProperties}>
            <span className={styles.processRailLine}><i /></span>
            {route.steps.map((step, index) => (
              <div key={step.id} className={index <= activeStep ? styles.processStepActive : ""}>
                <span>{index + 1}</span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            ))}
          </div>

          <div key={`yield-${selectedLayer.id}`} className={`${styles.yieldTransformation} ${styles.processPageEnter}`}>
            <span><small>毛料重量</small><strong>{route.inputWeight.toFixed(1)} g</strong></span>
            <i>→</i>
            <span className={styles.yieldLive}><small>当前工序</small><strong>{route.steps[activeStep].outputWeight.toFixed(1)} g</strong></span>
            <i>→</i>
            <span><small>净料重量</small><strong>{route.outputWeight.toFixed(1)} g</strong></span>
            <em><small>当前出成率</small><strong>{selectedLayer.yieldRate.toFixed(1)}%</strong></em>
          </div>
        </div>
      </div>
    </section>
  );
}
