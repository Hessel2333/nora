import type { CSSProperties } from "react";
import { SHOWROOM_SCENES } from "../showroom-scenes";
import styles from "../showroom.module.css";

export function SceneProgress({
  currentIndex,
  progress,
  onSelect,
}: {
  currentIndex: number;
  progress: number;
  onSelect: (index: number) => void;
}) {
  const railScenes = SHOWROOM_SCENES.filter((scene) => scene.id !== "intro");
  return (
    <nav className={styles.progressRail} aria-label="演示章节" data-showroom-control>
      {railScenes.map((scene) => {
        const index = SHOWROOM_SCENES.findIndex((item) => item.id === scene.id);
        const fill = index < currentIndex ? 1 : index === currentIndex ? progress : 0;
        return (
          <button
            key={scene.id}
            type="button"
            aria-current={index === currentIndex ? "step" : undefined}
            onClick={() => onSelect(index)}
            className={index === currentIndex ? styles.progressActive : ""}
          >
            <span className={styles.progressTrack}><span style={{ "--scene-fill": fill } as CSSProperties} /></span>
            <small>{scene.label}</small>
          </button>
        );
      })}
    </nav>
  );
}
