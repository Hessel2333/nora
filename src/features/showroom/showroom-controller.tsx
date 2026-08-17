"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { SHOWROOM_SCENES } from "./showroom-scenes";
import {
  INITIAL_SHOWROOM_STATE,
  overallProgress,
  scenePhase,
  scenePhaseProgress,
  sceneProgress,
  showroomPlaybackReducer,
} from "./showroom-controller-state";
import type { ShowroomOptions } from "./showroom-types";

const STARTUP_DELAY_MS = 3_000;
const HANDOFF_SETTLE_MS = 800;
const IDLE_HINT_MS = 26_000;
const IDLE_RESUME_MS = 30_000;
const CURSOR_IDLE_MS = 10_000;
const TICK_MS = 80;

export function useShowroomController(options: ShowroomOptions) {
  const [state, dispatch] = useReducer(showroomPlaybackReducer, INITIAL_SHOWROOM_STATE);
  const [started, setStarted] = useState(false);
  const [idleHint, setIdleHint] = useState(false);
  const [userInteracting, setUserInteracting] = useState(false);
  const [handoffActive, setHandoffActive] = useState(false);
  const [handoffLanded, setHandoffLanded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStartup = useCallback(() => {
    if (startupTimer.current) clearTimeout(startupTimer.current);
    startupTimer.current = null;
  }, []);

  const clearIdle = useCallback(() => {
    if (idleHintTimer.current) clearTimeout(idleHintTimer.current);
    if (idleResumeTimer.current) clearTimeout(idleResumeTimer.current);
    idleHintTimer.current = null;
    idleResumeTimer.current = null;
    setIdleHint(false);
  }, []);

  const clearHandoff = useCallback(() => {
    setHandoffActive(false);
  }, []);

  const resume = useCallback(() => {
    clearIdle();
    setStarted(true);
    setUserInteracting(false);
    setHandoffLanded(false);
    dispatch({ type: "idle-resume" });
  }, [clearIdle]);

  const pauseForInteraction = useCallback(() => {
    clearStartup();
    clearIdle();
    clearHandoff();
    setStarted(true);
    setUserInteracting(true);
    setHandoffLanded(false);
    dispatch({ type: "pause" });

    if (!options.autoplay) return;
    idleHintTimer.current = setTimeout(() => setIdleHint(true), IDLE_HINT_MS);
    idleResumeTimer.current = setTimeout(resume, IDLE_RESUME_MS);
  }, [clearHandoff, clearIdle, clearStartup, options.autoplay, resume]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!options.autoplay) return;
    startupTimer.current = setTimeout(() => {
      setStarted(true);
      dispatch({ type: "play" });
      startupTimer.current = null;
    }, STARTUP_DELAY_MS);
    return clearStartup;
  }, [clearStartup, options.autoplay]);

  useEffect(() => {
    if (!state.playing) return;
    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const deltaMs = now - lastTick;
      lastTick = now;
      dispatch({ type: "tick", deltaMs, loop: options.loop });
    }, TICK_MS);
    const resetClock = () => { lastTick = performance.now(); };
    document.addEventListener("visibilitychange", resetClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resetClock);
    };
  }, [options.loop, state.playing]);

  useEffect(() => {
    if (!handoffActive || state.playing || state.pauseAtSceneIndex !== null) return;
    const settleTimer = window.setTimeout(() => {
      pauseForInteraction();
      setHandoffLanded(true);
    }, HANDOFF_SETTLE_MS);
    return () => window.clearTimeout(settleTimer);
  }, [handoffActive, pauseForInteraction, state.pauseAtSceneIndex, state.playing]);

  useEffect(() => () => {
    clearStartup();
    clearIdle();
    clearHandoff();
  }, [clearHandoff, clearIdle, clearStartup]);

  useEffect(() => {
    if (!options.kiosk) return;
    const resetCursor = () => {
      setCursorHidden(false);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorHidden(true), CURSOR_IDLE_MS);
    };
    resetCursor();
    window.addEventListener("pointermove", resetCursor, { passive: true });
    return () => {
      window.removeEventListener("pointermove", resetCursor);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    };
  }, [options.kiosk]);

  const play = useCallback(() => {
    clearStartup();
    clearIdle();
    clearHandoff();
    setStarted(true);
    setUserInteracting(false);
    setHandoffLanded(false);
    dispatch({ type: "play" });
  }, [clearHandoff, clearIdle, clearStartup]);

  const togglePlayback = useCallback(() => {
    if (state.playing) {
      pauseForInteraction();
      return;
    }
    play();
  }, [pauseForInteraction, play, state.playing]);

  const goTo = useCallback((sceneIndex: number) => {
    pauseForInteraction();
    dispatch({ type: "go-to", sceneIndex });
  }, [pauseForInteraction]);

  const handoffToNext = useCallback(() => {
    clearStartup();
    clearIdle();
    clearHandoff();
    setStarted(true);
    setUserInteracting(true);
    setHandoffLanded(false);
    setHandoffActive(true);
    dispatch({ type: "begin-next-handoff" });
  }, [clearHandoff, clearIdle, clearStartup]);

  const next = useCallback(() => {
    pauseForInteraction();
    dispatch({ type: "next", loop: options.loop });
  }, [options.loop, pauseForInteraction]);

  const previous = useCallback(() => {
    pauseForInteraction();
    dispatch({ type: "previous" });
  }, [pauseForInteraction]);

  const replay = useCallback(() => {
    clearStartup();
    clearIdle();
    clearHandoff();
    setStarted(true);
    setUserInteracting(false);
    setHandoffLanded(false);
    dispatch({ type: "replay", playing: true });
  }, [clearHandoff, clearIdle, clearStartup]);

  return {
    state,
    scene: SHOWROOM_SCENES[state.sceneIndex],
    sceneProgress: sceneProgress(state),
    scenePhase: scenePhase(state),
    scenePhaseProgress: scenePhaseProgress(state),
    overallProgress: overallProgress(state),
    started,
    idleHint,
    userInteracting,
    handoffActive,
    handoffLanded,
    reducedMotion,
    cursorHidden,
    play,
    resume,
    togglePlayback,
    pauseForInteraction,
    goTo,
    handoffToNext,
    next,
    previous,
    replay,
  };
}
