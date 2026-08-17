"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";
import { SHOWROOM_BOM, SHOWROOM_ORDER } from "../showroom-data";
import type { ShowroomSceneId, ShowroomScenePhase } from "../showroom-types";
import { sharedJourneyVisibility } from "../shared-journey-state";
import styles from "../showroom.module.css";

type DishGeometry = {
  sourceX: number;
  sourceY: number;
  sourceScaleX: number;
  sourceScaleY: number;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
};

const sameGeometry = (left: DishGeometry | null, right: DishGeometry) => left
  && Object.keys(right).every((key) => Math.abs(left[key as keyof DishGeometry] - right[key as keyof DishGeometry]) < 0.5);

export function SharedJourneyLayer({
  scene,
  progress,
  phase,
  active,
}: {
  scene: ShowroomSceneId;
  progress: number;
  phase: ShowroomScenePhase;
  active: boolean;
}) {
  const visibility = sharedJourneyVisibility(scene, phase, progress);
  const [dishGeometry, setDishGeometry] = useState<DishGeometry | null>(null);

  useLayoutEffect(() => {
    if (scene !== "order") return;
    const stage = document.querySelector<HTMLElement>("#showroom-stage");
    if (!stage) return;

    let animationFrame = 0;
    const measure = () => {
      const source = stage.querySelector<HTMLElement>("[data-shared-dish-source]");
      const target = stage.querySelector<HTMLElement>("[data-shared-dish-target]");
      const targetLayer = target?.closest<HTMLElement>("[data-layer-state]");
      if (!source || !target || !targetLayer) return;

      targetLayer.dataset.sharedMeasuring = "true";
      const stageRect = stage.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      delete targetLayer.dataset.sharedMeasuring;

      const nextGeometry: DishGeometry = {
        sourceX: sourceRect.left - stageRect.left,
        sourceY: sourceRect.top - stageRect.top,
        sourceScaleX: sourceRect.width / Math.max(1, targetRect.width),
        sourceScaleY: sourceRect.height / Math.max(1, targetRect.height),
        targetX: targetRect.left - stageRect.left,
        targetY: targetRect.top - stageRect.top,
        targetWidth: targetRect.width,
        targetHeight: targetRect.height,
      };
      setDishGeometry((current) => sameGeometry(current, nextGeometry) ? current : nextGeometry);
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(stage);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [scene]);

  const dishStyle = dishGeometry ? {
    "--dish-source-x": `${dishGeometry.sourceX}px`,
    "--dish-source-y": `${dishGeometry.sourceY}px`,
    "--dish-source-scale-x": dishGeometry.sourceScaleX,
    "--dish-source-scale-y": dishGeometry.sourceScaleY,
    "--dish-target-x": `${dishGeometry.targetX}px`,
    "--dish-target-y": `${dishGeometry.targetY}px`,
    "--dish-target-width": `${dishGeometry.targetWidth}px`,
    "--dish-target-height": `${dishGeometry.targetHeight}px`,
  } as CSSProperties : undefined;

  return (
    <div
      className={styles.sharedJourney}
      data-scene={scene}
      data-phase={phase}
      style={{ "--journey-progress": progress, opacity: active ? 1 : 0 } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.sharedOrder} data-visible={visibility.order}>
        <span>销售订单</span>
        <strong>#{SHOWROOM_ORDER.code}</strong>
        <em>{SHOWROOM_ORDER.portions}<small>份</small></em>
        <i>{SHOWROOM_ORDER.deliveryAt} 配送</i>
      </div>

      <div
        className={styles.sharedDishMorph}
        data-ready={Boolean(dishGeometry)}
        data-visible={visibility.dish && Boolean(dishGeometry)}
        style={dishStyle}
      >
        {dishGeometry ? (
          <Image src={SHOWROOM_BOM.finished.image} alt="" fill priority sizes="(max-width: 2200px) 420px, 760px" />
        ) : null}
      </div>
    </div>
  );
}
