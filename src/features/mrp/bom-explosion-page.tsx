"use client";

import Image from "next/image";
import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  Layers3,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  EXPLOSION_MODES,
  FINISHED_PRODUCT,
  RECIPE_LAYERS,
  TOTAL_RAW_INPUT,
  TOTAL_RAW_MATERIALS,
  type ExplosionMode,
  type MaterialStatus,
  type RawMaterial,
  type RecipeLayer,
} from "./bom-explosion-data";

const modeHelp: Record<ExplosionMode, string> = {
  finished: "成品视图 · 点击菜品开始拆解",
  semi: "半成品视图 · 点击任一层查看组成",
  raw: "原料视图 · 按加工组追踪毛料",
};

const modeIndex: Record<ExplosionMode, number> = {
  finished: 0,
  semi: 1,
  raw: 2,
};

const statusStyles: Record<MaterialStatus, { label: string; dot: string; text: string }> = {
  normal: { label: "库存充足", dot: "bg-[#36d39a]", text: "text-[#80e1bc]" },
  tight: { label: "库存偏紧", dot: "bg-[#f5b84c]", text: "text-[#f6c975]" },
  shortage: { label: "需要补货", dot: "bg-[#ff6b6b]", text: "text-[#ff9292]" },
};

export function BomExplosionPage() {
  const [mode, setMode] = useState<ExplosionMode>("finished");
  const [selectedLayerId, setSelectedLayerId] = useState(RECIPE_LAYERS[1].id);
  const [selectedMaterialId, setSelectedMaterialId] = useState(RECIPE_LAYERS[1].rawMaterials[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const selectedLayer = useMemo(
    () => RECIPE_LAYERS.find((layer) => layer.id === selectedLayerId) ?? RECIPE_LAYERS[0],
    [selectedLayerId],
  );

  const clearPlayback = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (!isPlaying) return;

    setMode("finished");
    setSelectedLayerId(RECIPE_LAYERS[0].id);
    setSelectedMaterialId(RECIPE_LAYERS[0].rawMaterials[0].id);
    const activeTimers = [
      setTimeout(() => setMode("semi"), 700),
      setTimeout(() => {
        setSelectedLayerId(RECIPE_LAYERS[1].id);
        setSelectedMaterialId(RECIPE_LAYERS[1].rawMaterials[0].id);
      }, 2500),
      setTimeout(() => setMode("raw"), 3400),
      setTimeout(() => {
        setMode("finished");
        setIsPlaying(false);
      }, 6000),
    ];
    timers.current = activeTimers;

    return () => {
      activeTimers.forEach(clearTimeout);
      if (timers.current === activeTimers) timers.current = [];
    };
  }, [isPlaying]);

  const chooseLayer = (layer: RecipeLayer, targetMode: ExplosionMode = mode === "finished" ? "semi" : mode) => {
    clearPlayback();
    setIsPlaying(false);
    setSelectedLayerId(layer.id);
    setSelectedMaterialId(layer.rawMaterials[0].id);
    setMode(targetMode);
  };

  const chooseMode = (nextMode: ExplosionMode) => {
    clearPlayback();
    setIsPlaying(false);
    setMode(nextMode);
  };

  const reset = () => {
    clearPlayback();
    setIsPlaying(false);
    setMode("finished");
    setSelectedLayerId(RECIPE_LAYERS[1].id);
    setSelectedMaterialId(RECIPE_LAYERS[1].rawMaterials[0].id);
  };

  const play = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
  };

  return (
    <section className="flex min-h-[max(720px,calc(100vh-112px))] flex-col overflow-hidden rounded-[18px] border border-[#2e2527] bg-[#120d0e] shadow-[0_18px_60px_rgba(25,15,17,.16)]">
      <header className="relative z-30 flex min-h-[76px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#171112] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-lg font-semibold tracking-[-0.025em] text-white sm:text-[20px]">宫保鸡丁 · 配方爆炸图</h1>
            <span className="rounded-md border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/72">BOM {FINISHED_PRODUCT.bomVersion}</span>
            <span className="text-xs text-white/55">{FINISHED_PRODUCT.quantity} {FINISHED_PRODUCT.unit}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#77d9b6]"><span className="h-1.5 w-1.5 rounded-full bg-[#37c993]" />已生效</span>
          </div>
          <p key={mode} className="explosion-detail-enter mt-1 text-[11px] text-white/40">{modeHelp[mode]}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative inline-grid grid-cols-3 rounded-[10px] border border-white/10 bg-white/[0.055] p-1" aria-label="拆解层级">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-[7px] bg-[#f3eee8] shadow-[0_5px_18px_rgba(0,0,0,.24)] transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
              style={{
                width: "calc((100% - 8px) / 3)",
                transform: `translateX(${modeIndex[mode] * 100}%)`,
              }}
            />
            {EXPLOSION_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseMode(item.id)}
                aria-pressed={mode === item.id}
                className={cn(
                  "focus-ring relative z-10 h-8 min-w-16 rounded-[7px] px-3 text-xs font-medium transition-colors duration-300",
                  mode === item.id ? "text-[#251d1e]" : "text-white/58 hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={reset} className="focus-ring hidden h-10 w-10 items-center justify-center rounded-[10px] border border-white/10 text-white/55 transition hover:bg-white/[0.07] hover:text-white sm:inline-flex" aria-label="重置拆解视图">
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      <div className="grid flex-1 xl:grid-cols-[minmax(0,1fr)_304px]">
        <ExplosionStage
          mode={mode}
          selectedLayer={selectedLayer}
          isPlaying={isPlaying}
          onChooseLayer={chooseLayer}
          onModeChange={chooseMode}
          onPlay={play}
          onReset={reset}
        />
        <RecipeInspector
          mode={mode}
          selectedLayer={selectedLayer}
          selectedMaterialId={selectedMaterialId}
          onSelectMaterial={setSelectedMaterialId}
          onChooseLayer={chooseLayer}
        />
      </div>
    </section>
  );
}

function ExplosionStage({
  mode,
  selectedLayer,
  isPlaying,
  onChooseLayer,
  onModeChange,
  onPlay,
  onReset,
}: {
  mode: ExplosionMode;
  selectedLayer: RecipeLayer;
  isPlaying: boolean;
  onChooseLayer: (layer: RecipeLayer, mode?: ExplosionMode) => void;
  onModeChange: (mode: ExplosionMode) => void;
  onPlay: () => void;
  onReset: () => void;
}) {
  return (
    <div className="relative min-h-[650px] overflow-hidden bg-[#0e0a0b] sm:min-h-[700px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_53%_43%,rgba(112,19,25,.5),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(114,32,31,.26),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-x-[14%] top-[10%] h-[74%] rounded-[50%] border border-white/[0.035]" />
      <div className="pointer-events-none absolute left-1/2 top-[47%] h-[470px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 text-[10px] text-white/36 sm:left-5 sm:top-5">
        <span className="font-semibold tracking-[0.08em] text-white/58">CP0001</span>
        <span className="h-3 w-px bg-white/15" />
        <span>标准份量 500 g</span>
        <span className="hidden sm:inline">· 原料毛重 {TOTAL_RAW_INPUT.toFixed(1)} g</span>
      </div>

      <button
        type="button"
        onClick={() => onModeChange("semi")}
        className={cn(
          "focus-ring absolute left-1/2 top-1/2 z-10 h-[54%] w-[112%] -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform,filter] duration-[920ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] sm:w-[min(76%,690px)]",
          mode === "finished" ? "scale-100 opacity-100 blur-0" : "pointer-events-none scale-[.94] opacity-0 blur-[3px]",
        )}
        aria-label="拆解宫保鸡丁成品"
        aria-hidden={mode !== "finished"}
        tabIndex={mode === "finished" ? 0 : -1}
      >
        <Image src={FINISHED_PRODUCT.image} alt="宫保鸡丁成品" fill priority sizes="(min-width:1280px) 680px, 70vw" className="object-contain drop-shadow-[0_30px_38px_rgba(0,0,0,.52)]" />
      </button>

      <div className={cn("pointer-events-none absolute left-1/2 top-[81%] z-[2] h-[23%] w-[86%] -translate-x-1/2 transition-[opacity,transform,filter] duration-[920ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] sm:w-[min(58%,610px)]", mode === "finished" ? "translate-y-9 scale-95 opacity-0 blur-[2px]" : "translate-y-0 scale-100 opacity-90 blur-0")}>
        <Image src={FINISHED_PRODUCT.bowlImage} alt="" fill sizes="(min-width:1280px) 600px, 58vw" className="object-contain drop-shadow-[0_28px_30px_rgba(0,0,0,.5)]" />
      </div>

      {RECIPE_LAYERS.map((layer, index) => (
        <SemiLayerNode
          key={layer.id}
          layer={layer}
          index={index}
          visible={mode === "semi"}
          selected={selectedLayer.id === layer.id}
          onSelect={() => onChooseLayer(layer, "semi")}
        />
      ))}

      {RECIPE_LAYERS.map((layer, index) => (
        <RawGroupNode
          key={layer.id}
          layer={layer}
          index={index}
          visible={mode === "raw"}
          selected={selectedLayer.id === layer.id}
          onSelect={() => onChooseLayer(layer, "raw")}
        />
      ))}

      {mode !== "finished" ? RECIPE_LAYERS.map((layer, index) => (
        <LayerCallout
          key={`${mode}-${layer.id}`}
          layer={layer}
          index={index}
          mode={mode}
          selected={selectedLayer.id === layer.id}
          onSelect={() => onChooseLayer(layer, mode)}
        />
      )) : (
        <>
          <div className="pointer-events-none absolute left-[5%] top-[33%] hidden w-[30%] items-center gap-3 md:flex">
            <div><p className="text-sm font-semibold text-white">标准成品</p><p className="mt-1 text-xs text-white/48">净重 500 g · 1 份</p></div><span className="h-px flex-1 bg-white/28" /><span className="h-2 w-2 rounded-full border-2 border-white bg-[#d88e6a]" />
          </div>
          <div className="pointer-events-none absolute right-[5%] top-[61%] hidden w-[29%] flex-row-reverse items-center gap-3 text-right md:flex">
            <div><p className="text-sm font-semibold text-white">4 个配方层</p><p className="mt-1 text-xs text-white/48">向内聚合为一道成品</p></div><span className="h-px flex-1 bg-white/28" /><span className="h-2 w-2 rounded-full border-2 border-white bg-[#d88e6a]" />
          </div>
        </>
      )}

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#211a1b]/92 p-1.5 shadow-[0_14px_35px_rgba(0,0,0,.34)] backdrop-blur-xl">
        <button type="button" onClick={onPlay} className="focus-ring inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-[#f3eee8] px-3 text-xs font-semibold text-[#251d1e] shadow-[0_6px_18px_rgba(0,0,0,.18)] transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-white sm:px-4">
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {isPlaying ? "暂停" : "演示拆解"}
        </button>
        <button type="button" onClick={onReset} className="focus-ring inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-2.5 text-xs font-medium text-white/65 transition hover:bg-white/[0.07] hover:text-white sm:px-3">
          <RotateCcw size={14} />重置
        </button>
      </div>

      <div className="absolute bottom-5 left-5 z-20 hidden items-center gap-3 text-[10px] text-white/35 lg:flex">
        {EXPLOSION_MODES.map((item, index) => <span key={item.id} className={cn("inline-flex items-center gap-1.5 transition-colors duration-300", mode === item.id && "text-white/72")}><span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[9px] transition-[background-color,border-color,color] duration-300", mode === item.id ? "border-[#f3eee8] bg-[#f3eee8] text-[#251d1e]" : "border-white/15")}>{index + 1}</span>{item.label}</span>)}
      </div>
    </div>
  );
}

function SemiLayerNode({ layer, index, visible, selected, onSelect }: { layer: RecipeLayer; index: number; visible: boolean; selected: boolean; onSelect: () => void }) {
  const collapsedShift = [150, 55, -55, -145][index];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`查看${layer.name}`}
      aria-pressed={selected}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn("focus-ring absolute left-1/2 z-10 h-[24%] w-[82%] transition-[opacity,transform,filter] duration-[940ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] sm:w-[min(50%,520px)]", visible ? "pointer-events-auto opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[3px]", selected ? "drop-shadow-[0_0_20px_rgba(216,142,106,.34)]" : "hover:brightness-110")}
      style={{
        top: `${layer.stageTop}%`,
        transform: visible ? "translate(-50%, 0) scale(1)" : `translate(-50%, ${collapsedShift}px) scale(.76)`,
        transitionDelay: `${index * 65}ms`,
      }}
    >
      <Image src={layer.image} alt={layer.name} fill sizes="(min-width:1280px) 510px, 48vw" className="object-contain drop-shadow-[0_20px_24px_rgba(0,0,0,.52)]" />
    </button>
  );
}

function RawGroupNode({ layer, index, visible, selected, onSelect }: { layer: RecipeLayer; index: number; visible: boolean; selected: boolean; onSelect: () => void }) {
  const widthClasses = ["sm:w-[44%]", "sm:w-[39%]", "sm:w-[44%]", "sm:w-[34%]"];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`查看${layer.name}原料组`}
      aria-pressed={selected}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn("focus-ring absolute left-1/2 z-10 h-[22%] w-[76%] transition-[opacity,transform,filter] duration-[940ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]", widthClasses[index], visible ? "pointer-events-auto translate-x-[-50%] scale-100 opacity-100 blur-0" : "pointer-events-none translate-x-[-50%] scale-[.86] opacity-0 blur-[3px]", selected ? "drop-shadow-[0_0_20px_rgba(216,142,106,.34)]" : "hover:brightness-110")}
      style={{ top: `${layer.rawStageTop}%`, transitionDelay: `${index * 65}ms` }}
    >
      <Image src={layer.rawImage} alt={`${layer.name}原料`} fill sizes="(min-width:1280px) 440px, 42vw" className="object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.5)]" />
    </button>
  );
}

function LayerCallout({ layer, index, mode, selected, onSelect }: { layer: RecipeLayer; index: number; mode: ExplosionMode; selected: boolean; onSelect: () => void }) {
  const top = mode === "raw" ? layer.rawStageTop + 7 : layer.stageTop + 8;
  const isLeft = layer.labelSide === "left";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("explosion-callout-enter focus-ring absolute z-20 hidden w-[38%] items-center gap-3 rounded-lg p-1 text-left transition-colors duration-300 md:flex", isLeft ? "left-[4%]" : "right-[4%] flex-row-reverse text-right", selected ? "text-white" : "text-white/64 hover:text-white")}
      style={{ top: `${top}%`, animationDelay: `${140 + index * 65}ms` }}
    >
      <span className="min-w-[112px] sm:min-w-[132px]">
        <span className="block text-[13px] font-semibold sm:text-sm">{mode === "raw" ? `${layer.name}原料` : layer.name}</span>
        <span className="mt-0.5 block text-[10px] text-white/42 sm:text-[11px]">{mode === "raw" ? `${layer.rawMaterials.length} 项 · 毛重 ${layer.rawInput} g` : `${layer.ratio.toFixed(1)}% · ${layer.quantity} ${layer.unit}`}</span>
      </span>
      <span className={cn("h-px min-w-5 flex-1 transition-colors duration-300", selected ? "bg-[#d88e6a]" : "bg-white/28")} />
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-[background-color,box-shadow,border-color] duration-300", selected ? "border-white bg-[#d88e6a] shadow-[0_0_0_4px_rgba(216,142,106,.14)]" : "border-white/80 bg-[#3a2b2d]")} />
    </button>
  );
}

function RecipeInspector({ mode, selectedLayer, selectedMaterialId, onSelectMaterial, onChooseLayer }: { mode: ExplosionMode; selectedLayer: RecipeLayer; selectedMaterialId: string; onSelectMaterial: (id: string) => void; onChooseLayer: (layer: RecipeLayer, mode?: ExplosionMode) => void }) {
  const selectedMaterial = selectedLayer.rawMaterials.find((material) => material.id === selectedMaterialId) ?? selectedLayer.rawMaterials[0];
  return (
    <aside className="border-t border-white/[0.08] bg-[#181314] xl:border-l xl:border-t-0">
      {mode === "finished" ? (
        <FinishedInspector onChooseLayer={onChooseLayer} />
      ) : (
      <div key={`${mode}-${selectedLayer.id}`} className="explosion-inspector-enter">
      <div className="border-b border-white/[0.08] p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[10px] border border-white/10 bg-black/25">
            <Image src={mode === "raw" ? selectedLayer.rawImage : selectedLayer.image} alt="" fill sizes="80px" className="object-contain p-1" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/38">{mode === "raw" ? "原料加工组" : "当前半成品"}</p>
            <h2 className="mt-1 truncate text-base font-semibold text-white">{selectedLayer.name}</h2>
            <p className="mt-0.5 text-[11px] text-white/42">{selectedLayer.code} · {selectedLayer.station}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.08] rounded-[10px] border border-white/[0.08] bg-white/[0.025] py-2.5 text-center">
          <InspectorMetric label="净用量" value={`${selectedLayer.quantity} g`} />
          <InspectorMetric label="毛料" value={`${selectedLayer.rawInput} g`} />
          <InspectorMetric label="出成率" value={`${selectedLayer.yieldRate}%`} />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div><h3 className="text-xs font-semibold text-white/86">原料组成</h3><p className="mt-0.5 text-[10px] text-white/34">选择原料查看库存状态</p></div>
        <span className="text-[10px] font-medium text-white/42">{selectedLayer.rawMaterials.length} 项</span>
      </div>

      <div className="nora-scrollbar max-h-[346px] space-y-1 overflow-y-auto px-3 pb-3">
        {selectedLayer.rawMaterials.map((material, index) => (
          <MaterialRow
            key={material.id}
            layer={selectedLayer}
            material={material}
            selected={material.id === selectedMaterial.id}
            onSelect={() => onSelectMaterial(material.id)}
            index={index}
          />
        ))}
      </div>

      <div key={selectedMaterial.id} className="explosion-detail-enter m-3 mt-0 rounded-[12px] border border-white/[0.08] bg-white/[0.025] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] text-white/38">当前原料</p><p className="mt-1 text-sm font-semibold text-white/88">{selectedMaterial.name}</p><p className="mt-0.5 text-[10px] text-white/35">{selectedMaterial.code} · {selectedMaterial.storage}</p></div>
          <span className={cn("mt-0.5 inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-medium", statusStyles[selectedMaterial.status].text)}><span className={cn("h-1.5 w-1.5 rounded-full", statusStyles[selectedMaterial.status].dot)} />{statusStyles[selectedMaterial.status].label}</span>
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-white/[0.07] pt-3">
          <span className="text-[10px] text-white/35">单份需求</span>
          <strong className="text-lg font-semibold tracking-[-0.03em] text-white">{selectedMaterial.quantity} <small className="text-[10px] font-medium text-white/38">{selectedMaterial.unit}</small></strong>
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-4 py-3 text-[10px] leading-5 text-white/35">
        毛料需求按半成品出成率反算，库存状态来自 2026-08-06 生产快照。
      </div>
      </div>
      )}
    </aside>
  );
}

function FinishedInspector({ onChooseLayer }: { onChooseLayer: (layer: RecipeLayer, mode?: ExplosionMode) => void }) {
  return (
    <div className="explosion-inspector-enter">
      <div className="border-b border-white/[0.08] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/38">成品配方</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{FINISHED_PRODUCT.name}</h2>
        <p className="mt-1 text-[11px] text-white/42">{FINISHED_PRODUCT.code} · BOM {FINISHED_PRODUCT.bomVersion}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3"><Gauge size={15} className="text-[#dfa17f]" /><p className="mt-2 text-[10px] text-white/35">标准净重</p><p className="mt-0.5 text-sm font-semibold text-white">500 g/份</p></div>
          <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-3"><Layers3 size={15} className="text-[#dfa17f]" /><p className="mt-2 text-[10px] text-white/35">配方深度</p><p className="mt-0.5 text-sm font-semibold text-white">3 层 · {TOTAL_RAW_MATERIALS} 项</p></div>
        </div>
      </div>

      <div className="px-4 pb-2 pt-4"><h3 className="text-xs font-semibold text-white/86">半成品构成</h3><p className="mt-0.5 text-[10px] text-white/34">选择一层开始拆解</p></div>
      <div className="space-y-1 px-3 pb-3">
        {RECIPE_LAYERS.map((layer) => (
          <button key={layer.id} type="button" onClick={() => onChooseLayer(layer, "semi")} className="focus-ring group flex w-full items-center gap-3 rounded-[10px] border border-transparent px-2 py-2 text-left transition hover:border-white/[0.08] hover:bg-white/[0.04]">
            <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-black/25"><Image src={layer.image} alt="" fill sizes="48px" className="object-contain p-0.5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white/82">{layer.name}</span><span className="mt-0.5 block text-[10px] text-white/34">{layer.code} · {layer.station}</span></span>
            <span className="text-right"><b className="block text-xs text-white/76">{layer.quantity} g</b><small className="text-[9px] text-white/32">{layer.ratio}%</small></span>
          </button>
        ))}
      </div>

      <div className="m-3 rounded-[12px] border border-[#56b18b]/25 bg-[#56b18b]/[0.07] p-3.5">
        <div className="flex items-start gap-2.5"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#72c9a4]" /><div><p className="text-xs font-semibold text-white/84">配方校验通过</p><p className="mt-1 text-[10px] leading-5 text-white/38">半成品净用量合计 500 g，当前 BOM 已覆盖全部原料路径。</p></div></div>
      </div>

      <div className="border-t border-white/[0.08] px-4 py-3 text-[10px] leading-5 text-white/35">
        生效时间 {FINISHED_PRODUCT.effectiveAt} · 维护人 {FINISHED_PRODUCT.owner}
      </div>
    </div>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return <span><span className="block text-[9px] text-white/32">{label}</span><b className="mt-0.5 block text-[11px] font-semibold text-white/76">{value}</b></span>;
}

function MaterialRow({ layer, material, selected, onSelect, index }: { layer: RecipeLayer; material: RawMaterial; selected: boolean; onSelect: () => void; index: number }) {
  const status = statusStyles[material.status];
  const imageSize = layer.id === "kung-pao-sauce" ? "210% 285%" : layer.id === "marinated-chicken" ? "205% 155%" : layer.id === "diced-vegetables" ? "190% 150%" : "150% 150%";
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={cn("explosion-material-enter focus-ring flex w-full items-center gap-2.5 rounded-[10px] border px-2 py-2 text-left transition-[background-color,border-color,box-shadow] duration-300", selected ? "border-[#d7ad98]/25 bg-[#ead5c9]/[0.07] shadow-[inset_2px_0_0_#d88e6a]" : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.035]")} style={{ animationDelay: `${90 + index * 42}ms` }}>
      <span className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-black/30 bg-no-repeat" style={{ backgroundImage: `url(${layer.rawImage})`, backgroundPosition: material.cropPosition, backgroundSize: imageSize }} />
      <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><b className="truncate text-[11px] font-medium text-white/82">{material.name}</b>{material.status !== "normal" ? <CircleAlert size={11} className={status.text} /> : null}</span><span className="mt-0.5 block truncate text-[9px] text-white/30">{material.code}</span></span>
      <span className="text-right"><b className="block text-[11px] font-semibold tabular-nums text-white/76">{material.quantity} {material.unit}</b><small className={cn("inline-flex items-center gap-1 text-[9px]", status.text)}><span className={cn("h-1 w-1 rounded-full", status.dot)} />{status.label}</small></span>
    </button>
  );
}
