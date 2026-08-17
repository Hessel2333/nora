import type { FactoryRoomSnapshot } from "@/features/digital-twin/room-monitoring";
import type { WorkOrder } from "@/lib/types";
import type { ShowroomSceneDefinition } from "../showroom-types";
import { IntroScene } from "../scenes/intro-scene";
import { ForecastScene } from "../scenes/forecast-scene";
import { OrderScene } from "../scenes/order-scene";
import { BomScene } from "../scenes/bom-scene";
import { MrpScene } from "../scenes/mrp-scene";
import { ProductionScene } from "../scenes/production-scene";
import { TraceabilityScene } from "../scenes/traceability-scene";
import { ProcurementScene } from "../scenes/procurement-scene";
import { BusinessScene } from "../scenes/business-scene";
import { PlatformScene } from "../scenes/platform-scene";
import { SharedJourneyLayer } from "./shared-journey-layer";
import { SHOWROOM_SCENES } from "../showroom-scenes";
import { DISH_HANDOFF_SETTLE_PROGRESS } from "../shared-journey-state";
import type { ShowroomScenePhase } from "../showroom-types";
import styles from "../showroom.module.css";

export function ShowroomStage({
  scene,
  sceneIndex,
  phase,
  progress,
  playbackProgress,
  started,
  autoplay,
  autoAdvance,
  journeyActive,
  rooms,
  workOrders,
  onInteract,
  onHandoffNext,
}: {
  scene: ShowroomSceneDefinition;
  sceneIndex: number;
  phase: ShowroomScenePhase;
  progress: number;
  playbackProgress: number;
  started: boolean;
  autoplay: boolean;
  autoAdvance: boolean;
  journeyActive: boolean;
  rooms: FactoryRoomSnapshot[];
  workOrders: WorkOrder[];
  onInteract: () => void;
  onHandoffNext: () => void;
}) {
  const dishHandoffSettling = scene.id === "bom"
    && playbackProgress < DISH_HANDOFF_SETTLE_PROGRESS
    && journeyActive;

  const renderScene = (definition: ShowroomSceneDefinition, sceneProgress: number) => {
    switch (definition.id) {
    case "intro":
      return <IntroScene progress={sceneProgress} started={started} autoplay={autoplay} />;
    case "forecast":
      return <ForecastScene progress={sceneProgress} onInteract={onInteract} />;
    case "order":
      return <OrderScene progress={sceneProgress} onInteract={onInteract} onOpenBom={onHandoffNext} />;
    case "bom":
      return <BomScene progress={sceneProgress} autoAdvance={definition.id === scene.id && autoAdvance} onInteract={onInteract} />;
    case "mrp":
      return <MrpScene progress={sceneProgress} />;
    case "production":
      return <ProductionScene progress={definition.id === scene.id ? playbackProgress : sceneProgress} rooms={rooms} workOrders={workOrders} onInteract={onInteract} />;
    case "traceability":
      return <TraceabilityScene progress={sceneProgress} onInteract={onInteract} />;
    case "procurement":
      return <ProcurementScene progress={sceneProgress} onInteract={onInteract} />;
    case "business":
      return <BusinessScene progress={sceneProgress} onInteract={onInteract} />;
    case "platform":
      return <PlatformScene progress={sceneProgress} />;
    }
  };

  return (
    <main
      className={styles.stage}
      id="showroom-stage"
      data-scene={scene.id}
      data-phase={phase}
      data-shared-dish-settling={dishHandoffSettling}
    >
      {SHOWROOM_SCENES.map((definition, index) => {
        const layerState = index === sceneIndex
          ? "current"
          : index === sceneIndex + 1
            ? "next"
            : index === sceneIndex - 1
              ? "previous"
              : "hidden";
        const layerProgress = index < sceneIndex ? 1 : index === sceneIndex ? progress : 0;
        return (
          <div key={definition.id} className={styles.sceneLayer} data-layer-state={layerState} aria-hidden={layerState !== "current"}>
            {definition.backgroundVideo ? (
              <video className={styles.backgroundVideo} src={definition.backgroundVideo} autoPlay muted loop playsInline aria-hidden="true" />
            ) : null}
            <div className={styles.stageContent}>{renderScene(definition, layerProgress)}</div>
          </div>
        );
      })}
      <SharedJourneyLayer scene={scene.id} progress={playbackProgress} phase={phase} active={journeyActive} />
    </main>
  );
}
