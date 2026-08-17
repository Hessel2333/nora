"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildFactoryRoomSnapshots } from "@/features/digital-twin/room-monitoring";
import { useNoraStore } from "@/lib/store";
import type { ShowroomOptions } from "./showroom-types";
import { useShowroomController } from "./showroom-controller";
import { ShowroomStage } from "./components/showroom-stage";
import { PlaybackControls } from "./components/playback-controls";
import { SceneProgress } from "./components/scene-progress";
import styles from "./showroom.module.css";

export function ShowroomPage({ options }: { options: ShowroomOptions }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const zones = useNoraStore((state) => state.zones);
  const workOrders = useNoraStore((state) => state.workOrders);
  const rooms = useMemo(() => buildFactoryRoomSnapshots(zones, workOrders), [workOrders, zones]);
  const controller = useShowroomController(options);
  const presentationProgress = controller.userInteracting && !controller.handoffActive && !controller.handoffLanded
    ? Math.max(controller.sceneProgress, 0.82)
    : controller.sceneProgress;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await rootRef.current?.requestFullscreen?.();
  };

  const handleBackgroundPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-showroom-control]")) return;
    controller.pauseForInteraction();
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.viewport} ${options.kiosk ? styles.kiosk : ""} ${controller.cursorHidden ? styles.cursorHidden : ""}`}
      data-reduced-motion={controller.reducedMotion ? "true" : "false"}
      onPointerDown={handleBackgroundPointer}
    >
      <a className={styles.skipLink} href="#showroom-stage">跳到演示内容</a>
      <div className={styles.shell}>
        <header className={styles.brandBar}>
          <div className={styles.brandMark}><span>N</span><strong>NORA</strong><small>数字展厅</small></div>
          <div className={styles.brandStatus}>
            <span>{controller.userInteracting ? "互动浏览" : controller.state.playing ? "自动演示" : controller.started ? "演示已暂停" : "即将开始"}</span>
            <i className={controller.state.playing ? styles.statusPlaying : ""} />
          </div>
        </header>

        <ShowroomStage
          scene={controller.scene}
          sceneIndex={controller.state.sceneIndex}
          phase={controller.scenePhase}
          progress={presentationProgress}
          playbackProgress={controller.sceneProgress}
          started={controller.started}
          autoplay={options.autoplay}
          autoAdvance={!controller.userInteracting && controller.state.playing}
          journeyActive={!controller.userInteracting || controller.handoffActive}
          rooms={rooms}
          workOrders={workOrders}
          onInteract={controller.pauseForInteraction}
          onHandoffNext={controller.handoffToNext}
        />

        {controller.idleHint ? (
          <button type="button" data-showroom-control className={styles.idleHint} onClick={controller.resume}>
            <span />继续自动演示
          </button>
        ) : null}

        <SceneProgress currentIndex={controller.state.sceneIndex} progress={controller.sceneProgress} onSelect={controller.goTo} />
        <PlaybackControls
          playing={controller.state.playing}
          onPrevious={controller.previous}
          onTogglePlayback={controller.togglePlayback}
          onNext={controller.next}
          onReplay={controller.replay}
          onFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
