"use client";

import { Expand, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import styles from "../showroom.module.css";

export function PlaybackControls({
  playing,
  onPrevious,
  onTogglePlayback,
  onNext,
  onReplay,
  onFullscreen,
}: {
  playing: boolean;
  onPrevious: () => void;
  onTogglePlayback: () => void;
  onNext: () => void;
  onReplay: () => void;
  onFullscreen: () => void;
}) {
  return (
    <nav className={styles.playbackControls} aria-label="演示播放控制" data-showroom-control>
      <button type="button" onClick={onPrevious} aria-label="上一幕"><SkipBack size={16} /></button>
      <button type="button" onClick={onTogglePlayback} aria-label={playing ? "暂停演示" : "播放演示"} className={styles.playButton}>
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      <button type="button" onClick={onNext} aria-label="下一幕"><SkipForward size={16} /></button>
      <span className={styles.controlDivider} />
      <button type="button" onClick={onReplay} aria-label="重新播放"><RotateCcw size={15} /></button>
      <button type="button" onClick={onFullscreen} aria-label="进入全屏"><Expand size={15} /></button>
    </nav>
  );
}
