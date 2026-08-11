"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { ProductionVisualizer, type ProductionVisualizerHandle } from "./production-visualizer";

type ProcessJourneyProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStepChange?: (step: number) => void;
};

const visualStages = [
  { label: "原料进入", progress: 0.03 },
  { label: "切配", progress: 0.31 },
  { label: "腌制", progress: 0.47 },
  { label: "烹饪", progress: 0.68 },
  { label: "装盒封装", progress: 0.93 },
] as const;

export function ProcessJourney({ open, onOpenChange, onStepChange }: ProcessJourneyProps) {
  const visualizerRef = useRef<ProductionVisualizerHandle>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    visualizerRef.current?.seek(0);
    setProgress(0);
    setPlaying(!reducedMotion);
    window.setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 20);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const updateProgress = useCallback((nextProgress: number) => {
    setProgress(nextProgress);
    onStepChange?.(Math.min(5, Math.floor(nextProgress * 6)));
  }, [onStepChange]);

  if (!open) return null;

  const fadeOpacity = progress < 0.022
    ? 1 - progress / 0.022
    : progress > 0.95
      ? (progress - 0.95) / 0.05
      : 0;

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[2147483647] overflow-clip bg-[#030508] text-white outline-none" role="dialog" aria-modal="true" aria-label="食物加工过程可视化">
      <ProductionVisualizer ref={visualizerRef} playing={playing} onProgress={updateProgress} />

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_120px_100px_-100px_rgba(0,0,0,.8),inset_0_-130px_110px_-100px_rgba(0,0,0,.82)]" />
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: fadeOpacity }} />

      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="focus-ring absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/24 text-white/72 backdrop-blur-md transition hover:bg-black/50 hover:text-white sm:right-8 sm:top-7"
        aria-label="退出加工过程可视化"
        title="退出"
      >
        <X size={19} />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-4 pb-5 pl-20 pr-5 sm:pb-7 sm:pl-20 sm:pr-8">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#111827] shadow-[0_12px_34px_rgba(0,0,0,.34)] transition hover:bg-[#edf3ff]"
          aria-label={playing ? "暂停动画" : "播放动画"}
          title={playing ? "暂停" : "播放"}
        >
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="relative h-8 min-w-0 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/18">
            <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
          {visualStages.map((stage) => (
            <button
              key={stage.label}
              type="button"
              onClick={() => {
                visualizerRef.current?.seek(stage.progress);
                setProgress(stage.progress);
              }}
              className="focus-ring absolute top-1/2 z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ left: `${stage.progress * 100}%` }}
              aria-label={`跳转到${stage.label}`}
              title={stage.label}
            >
              <span className="h-1.5 w-1.5 rounded-full border border-white/45 bg-[#10161d]" />
            </button>
          ))}
          <span className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,.13)]" style={{ left: `${progress * 100}%` }} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              visualizerRef.current?.seek(next);
              setProgress(next);
            }}
            className="focus-ring absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="加工过程进度"
          />
        </div>
      </div>
    </div>
  );
}
