"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Boxes,
  CalendarClock,
  Clock3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GitBranch,
  History,
  Layers3,
  ListFilter,
  MapPin,
  PackagePlus,
  PencilLine,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Thermometer,
  Trash2,
  Undo2,
  Workflow,
  X,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { useNoraIdentity } from "@/features/auth/nora-identity-provider";
import {
  Badge,
  Button,
  Card,
  Field,
  Modal,
  inputClass,
} from "@/components/ui";
import {
  buildBomStructure,
  calculateRecipeUsageTrial,
  flattenBomStructure,
  type BomStructureNode,
  type ExplodedMaterial,
} from "@/lib/bom-structure";
import { findLatestBomDraft, getBomVersionValidityState, nextAvailableBomVersion, toLocalDateTimeInput } from "@/lib/bom-validity";
import {
  detectPreprocessTemplate,
  editablePreprocessKinds,
  instantiatePreprocessTemplate,
  preprocessTemplates,
  suggestPreprocessOperationCode,
  type PreprocessTemplateId,
} from "@/lib/preprocess-templates";
import { useNoraStore } from "@/lib/store";
import type { Bom, BomItem, BomOperation, BomOperationKind, BomVersionValidityState, Product, StatusTone } from "@/lib/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

type WorkbenchView = "structure" | "process" | "explosion" | "versions";

const viewOptions: Array<{ id: WorkbenchView; label: string; icon: typeof Workflow }> = [
  { id: "structure", label: "配方与流程", icon: ListFilter },
  { id: "process", label: "工序说明", icon: Workflow },
  { id: "explosion", label: "用量试算", icon: Layers3 },
  { id: "versions", label: "版本记录", icon: History },
];

const validityMeta: Record<BomVersionValidityState, { label: string; tone: StatusTone }> = {
  current: { label: "当前生效", tone: "success" },
  scheduled: { label: "计划生效", tone: "purple" },
  draft: { label: "草稿", tone: "neutral" },
  historical: { label: "历史版本", tone: "warning" },
};

const typeMeta: Record<string, { label: string; tone: StatusTone; color: string }> = {
  finished: { label: "产出品", tone: "info", color: "#0875e1" },
  semi: { label: "半成品", tone: "purple", color: "#6554d9" },
  processed: { label: "加工品", tone: "purple", color: "#6554d9" },
  raw: { label: "原料", tone: "neutral", color: "#607089" },
  combo: { label: "组合品", tone: "info", color: "#0875e1" },
};

const operationKindMeta: Record<BomOperationKind | "cook", { label: string; tone: StatusTone }> = {
  receive: { label: "来料", tone: "neutral" },
  wash: { label: "清洗", tone: "info" },
  cut: { label: "修整/切配", tone: "purple" },
  marinate: { label: "低温腌制", tone: "warning" },
  mix: { label: "称重组配", tone: "purple" },
  cool: { label: "冷链暂存", tone: "info" },
  pack: { label: "分装贴标", tone: "success" },
  quality: { label: "复核", tone: "success" },
  cook: { label: "历史烹调（只读）", tone: "warning" },
};

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDateTime(value?: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

function formatQuantity(value: number, maximumFractionDigits = 3) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits }).format(value);
}

function formatTemperature(minimum?: number, maximum?: number) {
  if (minimum !== undefined && maximum !== undefined) return `${minimum}–${maximum} °C`;
  if (maximum !== undefined) return `≤ ${maximum} °C`;
  if (minimum !== undefined) return `≥ ${minimum} °C`;
  return "按现场 SOP";
}

function validityOf(version: { status: Bom["status"]; effectiveAt: string | null; effectiveTo?: string | null }) {
  return getBomVersionValidityState({
    status: version.status,
    effectiveAt: version.effectiveAt || null,
    effectiveTo: version.effectiveTo,
  });
}

function latestPublishedEffectiveAt(bom: Bom) {
  return Math.max(
    Date.now(),
    ...(bom.versions ?? [])
      .filter((version) => version.status !== "draft" && version.effectiveAt)
      .map((version) => new Date(version.effectiveAt as string).getTime()),
  );
}

function suggestedPublishTime(bom: Bom) {
  const latest = new Date(latestPublishedEffectiveAt(bom));
  const suggestion = new Date(latest);
  suggestion.setDate(suggestion.getDate() + 1);
  suggestion.setHours(6, 0, 0, 0);
  if (suggestion <= latest) suggestion.setDate(suggestion.getDate() + 1);
  return toLocalDateTimeInput(suggestion);
}

function parseView(value?: string): WorkbenchView {
  return value === "process" || value === "explosion" || value === "versions" ? value : "structure";
}

export function BomWorkbenchPage({
  bomId,
  initialView,
}: {
  bomId?: string;
  initialView?: string;
}) {
  const router = useRouter();
  const boms = useNoraStore((state) => state.boms);
  const products = useNoraStore((state) => state.products);
  const { can } = useNoraIdentity();
  const copyBomVersion = useNoraStore((state) => state.copyBomVersion);
  const updateBomVersion = useNoraStore((state) => state.updateBomVersion);
  const publishBomVersion = useNoraStore((state) => state.publishBomVersion);
  const baseBom = boms.find((candidate) => candidate.id === bomId) ?? boms[0];
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [view, setView] = useState<WorkbenchView>(() => parseView(initialView));
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [requestedOutput, setRequestedOutput] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTiming, setPublishTiming] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState("");
  const editTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedVersionId(baseBom?.versionId);
  }, [baseBom?.id, baseBom?.versionId]);

  const bom = useMemo(() => {
    if (!baseBom || !selectedVersionId || selectedVersionId === baseBom.versionId) return baseBom;
    const version = baseBom.versions?.find((candidate) => candidate.id === selectedVersionId);
    if (!version?.operations || !version.items) return baseBom;
    return {
      ...baseBom,
      versionId: version.id,
      version: version.version,
      previousVersion: version.previousVersion ?? "—",
      outputQuantity: version.outputQuantity ?? baseBom.outputQuantity,
      outputUnit: version.outputUnit ?? baseBom.outputUnit,
      status: version.status,
      validityState: version.validityState,
      effectiveAt: version.effectiveAt ?? "",
      effectiveTo: version.effectiveTo,
      revision: version.revision,
      operations: version.operations,
      items: version.items,
    } satisfies Bom;
  }, [baseBom, selectedVersionId]);

  useEffect(() => {
    if (!bom) return;
    setRequestedOutput(bom.outputQuantity);
    setSelectedNodeId(`root-${bom.id}`);
  }, [bom]);

  if (!bom) {
    return (
      <Card className="p-10 text-center">
        <Boxes className="mx-auto text-[var(--text-tertiary)]" />
        <h1 className="mt-3 font-semibold">还没有生产配方</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">先建立产品档案，再为成品创建首个配方版本。</p>
      </Card>
    );
  }

  const root = buildBomStructure(bom, boms, requestedOutput);
  const nodes = flattenBomStructure(root);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? root;
  const selectedProduct = products.find((product) => product.id === selectedNode.productId);
  const selectedValidity = validityMeta[validityOf(bom)];
  const maxDepth = Math.max(...nodes.map((node) => node.depth));
  const leafCount = nodes.filter((node) => !node.children.length && node.depth > 0).length;
  const directCost = bom.items.reduce((sum, item) => sum + (item.netQuantity / item.yieldRate) * item.unitCost, 0);
  const latestDraft = findLatestBomDraft(baseBom);

  const handleCopy = async () => {
    setSaving(true);
    setOperationError("");
    try {
      const created = await copyBomVersion(
        bom.id,
        nextAvailableBomVersion(bom.version, bom.versions?.map((version) => version.version) ?? [bom.version]),
        bom.versionId,
      );
      if (!created.versionId) throw new Error("新草稿创建成功，但未返回版本标识");
      setSelectedVersionId(created.versionId);
      setEditorOpen(true);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "复制版本失败");
    } finally {
      setSaving(false);
    }
  };

  const continueDraft = () => {
    if (!latestDraft) return;
    setOperationError("");
    setSelectedVersionId(latestDraft.id);
    setEditorOpen(true);
  };

  const openPublish = () => {
    setOperationError("");
    setScheduledAt(suggestedPublishTime(bom));
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!bom.versionId) return;
    const effectiveAt = publishTiming === "scheduled" ? new Date(scheduledAt) : undefined;
    if (effectiveAt && (Number.isNaN(effectiveAt.getTime()) || effectiveAt <= new Date())) {
      setOperationError("计划生效时间必须晚于当前时间");
      return;
    }
    setSaving(true);
    setOperationError("");
    try {
      await publishBomVersion(bom.versionId, bom.revision ?? 1, effectiveAt?.toISOString());
      setPublishOpen(false);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "发布版本失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (draft: Bom) => {
    if (!bom.versionId) return;
    setSaving(true);
    setOperationError("");
    try {
      await updateBomVersion(bom.versionId, draft);
      setEditorOpen(false);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "保存草稿失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {operationError && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-[var(--status-danger-soft)] px-4 py-3 text-sm text-[var(--status-danger)]" role="alert">
          <AlertTriangle className="mt-0.5 shrink-0" size={16} />
          {operationError}
        </div>
      )}

      <section aria-label="配方工作台" className="min-w-0 space-y-3">
        <header className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--stroke-subtle)] bg-[var(--surface)]">
          <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--interactive-soft)] text-[var(--interactive)]">
                <GitBranch size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="bom-switcher" className="sr-only">切换生产配方</label>
                <select
                  id="bom-switcher"
                  value={bom.id}
                  onChange={(event) => router.push(`/catalog/boms/${event.target.value}`)}
                  className="focus-ring -ml-2 h-8 max-w-full rounded-lg bg-transparent px-2 text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-lg"
                >
                  {boms.map((item) => (
                    <option key={item.id} value={item.id}>{item.productName} · {item.version}</option>
                  ))}
                </select>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                  <span className="font-mono">{bom.code}</span>
                  <span>{bom.version}</span>
                  <span>每 {formatNumber(bom.outputQuantity)} {bom.outputUnit}</span>
                  <Badge tone={selectedValidity.tone}>{selectedValidity.label}</Badge>
                </div>
              </div>
            </div>

            <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[var(--stroke-subtle)] py-2 lg:border-y-0 lg:border-l lg:px-5 lg:py-0">
              {[
                ["材料成本", formatCurrency(directCost)],
                ["结构", `${maxDepth} 层 / ${leafCount} 项`],
                ["流程", `${bom.operations.length} 道`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-[78px]">
                  <dt className="text-[9px] text-[var(--text-tertiary)]">{label}</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums text-[var(--text-primary)]">{value}</dd>
                </div>
              ))}
            </dl>

            {can("recipes:write") && (
              <div className="flex shrink-0 items-center gap-2">
                {bom.status === "draft" ? (
                  <>
                    <Button ref={editTriggerRef} variant="secondary" onClick={() => setEditorOpen(true)}>
                      <PencilLine size={16} />
                      编辑草稿
                    </Button>
                    <Button onClick={openPublish} disabled={saving}>
                      <ShieldCheck size={16} />
                      发布版本
                    </Button>
                  </>
                ) : (
                  latestDraft ? (
                    <Button ref={editTriggerRef} onClick={continueDraft}>
                      <PencilLine size={16} />
                      继续编辑 {latestDraft.version}
                    </Button>
                  ) : (
                    <Button ref={editTriggerRef} onClick={() => void handleCopy()} disabled={saving}>
                      <PackagePlus size={16} />
                      {saving ? "正在创建…" : "创建变更版本"}
                    </Button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="horizontal-snap flex overflow-x-auto border-t border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] px-1 sm:px-3" role="tablist" aria-label="配方工作视图">
              {viewOptions.map((option) => {
                const Icon = option.icon;
                const active = option.id === view;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setView(option.id)}
                    className={cn(
                      "focus-ring relative flex h-11 shrink-0 items-center gap-2 px-3 text-xs font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)] sm:px-4",
                      active && "text-[var(--interactive)]",
                    )}
                  >
                    <Icon size={16} />
                    {option.label}
                    {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--interactive)]" />}
                  </button>
                );
              })}
          </div>
        </header>

        {view === "structure" && (
          <StructureWorkspace
            bom={bom}
            root={root}
            selectedNode={selectedNode}
            selectedProduct={selectedProduct}
            onSelectNode={setSelectedNodeId}
          />
        )}
        {view === "process" && <ProcessWorkspace bom={bom} />}
        {view === "explosion" && (
          <ExplosionWorkspace
            bom={bom}
            boms={boms}
            requestedOutput={requestedOutput}
            onRequestedOutputChange={setRequestedOutput}
          />
        )}
        {view === "versions" && <VersionWorkspace bom={bom} selectedVersionId={selectedVersionId} onSelectVersion={setSelectedVersionId} />}
      </section>

      <BomEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        bom={bom}
        products={products}
        saving={saving}
        error={operationError}
        returnFocusRef={editTriggerRef}
        onSave={handleSaveDraft}
      />

      <Modal
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`发布 ${bom.productName} ${bom.version}`}
        description="发布后内容不可原地修改；已有订单快照不受影响。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishOpen(false)} disabled={saving}>取消</Button>
            <Button onClick={() => void handlePublish()} disabled={saving}>
              <ShieldCheck size={16} />
              {saving ? "发布中…" : "确认发布"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="生效方式">
            <Button variant={publishTiming === "now" ? "primary" : "secondary"} onClick={() => setPublishTiming("now")}>立即生效</Button>
            <Button variant={publishTiming === "scheduled" ? "primary" : "secondary"} onClick={() => setPublishTiming("scheduled")}>
              <CalendarClock size={16} />
              计划生效
            </Button>
          </div>
          {publishTiming === "scheduled" && (
            <Field label="计划生效时间" required>
              <input
                type="datetime-local"
                className={inputClass}
                value={scheduledAt}
                min={toLocalDateTimeInput(new Date(latestPublishedEffectiveAt(bom) + 60_000))}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </Field>
          )}
          <div className="flex justify-end rounded-xl bg-[var(--interactive-soft)] px-2 py-1.5">
            <HelpTip title="发布影响">
              {publishTiming === "scheduled"
                ? "当前版本会持续有效，到达计划时间后再切换生产配方。"
                : "新版本将立即生效；已审核订单继续使用审批时冻结的配方。"}
            </HelpTip>
          </div>
          {operationError && <p className="text-sm text-[var(--status-danger)]" role="alert">{operationError}</p>}
        </div>
      </Modal>
    </>
  );
}

function StructureWorkspace({
  bom,
  root,
  selectedNode,
  selectedProduct,
  onSelectNode,
}: {
  bom: Bom;
  root: BomStructureNode;
  selectedNode: BomStructureNode;
  selectedProduct?: Product;
  onSelectNode: (id: string) => void;
}) {
  const operations = useMemo(() => [...bom.operations].sort((left, right) => left.sequence - right.sequence), [bom.operations]);
  const parents = useMemo(() => flattenBomStructure(root).filter((node) => node.children.length).map((node) => node.id), [root]);
  const [expanded, setExpanded] = useState(() => new Set(parents));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "loss" | "nested">("all");
  const [activeOperationCode, setActiveOperationCode] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  useEffect(() => setExpanded(new Set(parents)), [parents]);
  useEffect(() => {
    if (activeOperationCode && !operations.some((operation) => operation.code === activeOperationCode)) {
      setActiveOperationCode("");
    }
  }, [activeOperationCode, operations]);
  useEffect(() => {
    if (!inspectorOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectorOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectorOpen]);
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const forceOpen = Boolean(normalizedQuery) || filter !== "all";
    const collect = (node: BomStructureNode): BomStructureNode[] => {
      const childMatches = node.children.flatMap(collect);
      const queryMatch = !normalizedQuery || [node.name, node.code, node.operationCode, node.operationName, ...node.path]
        .some((value) => value?.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
      const filterMatch = filter === "all" || (filter === "loss" ? node.lossQuantity > 0 : node.children.length > 0);
      if ((!queryMatch || !filterMatch) && childMatches.length === 0) return [];
      const showChildren = forceOpen || expanded.has(node.id);
      return [node, ...(showChildren ? childMatches : [])];
    };
    return collect(root);
  }, [expanded, filter, query, root]);
  const costShare = root.expandedCost > 0 ? Math.min(100, (selectedNode.expandedCost / root.expandedCost) * 100) : 0;
  const lossRate = selectedNode.grossQuantity > 0 ? (selectedNode.lossQuantity / selectedNode.grossQuantity) * 100 : 0;
  const stageCodeByNodeId = useMemo(() => {
    const result = new Map<string, string | undefined>([[root.id, operations.at(-1)?.code]]);
    const visit = (node: BomStructureNode, stageCode?: string) => {
      result.set(node.id, stageCode);
      node.children.forEach((child) => visit(child, stageCode));
    };
    root.children.forEach((branch) => visit(branch, branch.operationCode));
    return result;
  }, [operations, root]);
  const stageCodeForNode = (node: BomStructureNode) => stageCodeByNodeId.get(node.id);
  const selectedStageCode = stageCodeForNode(selectedNode);
  const selectedOperation = operations.find((operation) => operation.code === selectedStageCode);
  const toggleNode = (node: BomStructureNode) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
    return next;
  });
  const selectNode = (node: BomStructureNode) => {
    onSelectNode(node.id);
    setInspectorOpen(true);
    const stageCode = stageCodeForNode(node);
    if (stageCode) setActiveOperationCode(stageCode);
  };

  return (
    <section className="min-w-0" aria-label="配方与生产流程">
      <Card className="min-w-0 overflow-hidden">
        <PanelHeading
          title="物料与生产流程"
          action={<Badge tone="info">{rows.length} 行</Badge>}
        />

        <div className="border-b border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] px-3 py-2 sm:px-4">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1">
              <b className="text-xs text-[var(--text-secondary)]">标准生产流程</b>
              <HelpTip title="流程查看">选择工序可聚焦该阶段的投料明细。</HelpTip>
            </span>
            {activeOperationCode && (
              <button type="button" className="focus-ring min-h-9 rounded-lg px-3 text-xs font-semibold text-[var(--interactive)] hover:bg-[var(--interactive-soft)]" onClick={() => setActiveOperationCode("")}>
                查看全部
              </button>
            )}
          </div>
          {operations.length ? (
            <div className="nora-scrollbar overflow-x-auto pb-1">
              <div className="flex min-w-max items-center" role="list" aria-label="生产工序">
                {operations.map((operation, index) => {
                  const active = operation.code === activeOperationCode;
                  const materialCount = bom.items.filter((item) => item.operationCode === operation.code).length;
                  return (
                    <div key={operation.id} className="flex items-center" role="listitem">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveOperationCode(active ? "" : operation.code)}
                        className={cn(
                          "focus-ring group min-w-[130px] rounded-xl border px-2.5 py-2 text-left transition duration-200 active:translate-y-px",
                          active
                            ? "border-[var(--interactive)] bg-[var(--surface)] shadow-sm"
                            : "border-[var(--stroke-subtle)] bg-[var(--surface)] hover:border-[var(--stroke)]",
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[9px] font-semibold", active ? "bg-[var(--interactive)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]")}>{String(index + 1).padStart(2, "0")}</span>
                          <span className="text-[9px] tabular-nums text-[var(--text-tertiary)]">{materialCount} 项 · {operation.durationMinutes} 分</span>
                        </span>
                        <b className="mt-2 block max-w-[132px] truncate text-xs">{operation.name}</b>
                        <span className="mt-0.5 block text-[9px] text-[var(--text-tertiary)]">{operationKindMeta[operation.kind].label}</span>
                      </button>
                      {index < operations.length - 1 && <ArrowRight size={14} className="mx-2 shrink-0 text-[var(--stroke)]" aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--stroke)] px-4 py-5 text-center text-xs text-[var(--text-tertiary)]">当前版本还没有生产流程</div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-b border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索物料、编码或工序" aria-label="搜索配方明细" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-[var(--surface-muted)] p-1" role="group" aria-label="配方明细筛选">
              {([['all', '全部'], ['loss', '有损耗'], ['nested', '含下级']] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFilter(id)} className={cn("focus-ring min-h-9 rounded-md px-3 text-xs font-medium transition", filter === id ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]")}>{label}</button>
              ))}
            </div>
            <button type="button" className="focus-ring min-h-10 rounded-lg px-3 text-xs font-semibold text-[var(--interactive)] hover:bg-[var(--interactive-soft)]" onClick={() => setExpanded(expanded.size === parents.length ? new Set([root.id]) : new Set(parents))}>
              {expanded.size === parents.length ? "收起到一级" : "展开全部"}
            </button>
          </div>
        </div>

        <div className="nora-scrollbar hidden max-h-[calc(100dvh-360px)] min-h-[420px] overflow-auto lg:block">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="sticky top-0 z-20 bg-[var(--surface-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)] shadow-[0_1px_0_var(--stroke-subtle)]">
              <tr>
                <th className="sticky left-0 z-30 min-w-[240px] bg-[var(--surface-subtle)] px-4 py-3">层级与物料</th>
                {operations.map((operation, index) => (
                  <th key={operation.id} className={cn("min-w-[92px] px-2 py-3 text-center", activeOperationCode === operation.code && "bg-[var(--interactive-soft)] text-[var(--interactive)]")}>
                    <span className="block truncate">{index + 1}. {operation.name}</span>
                    <span className="mt-0.5 block font-mono text-[8px] font-normal opacity-70">{operation.code}</span>
                  </th>
                ))}
                <th className="min-w-[96px] px-3 py-3 text-right">净用量</th>
                <th className="min-w-[96px] px-3 py-3 text-right">毛料需求</th>
                <th className="min-w-[88px] px-3 py-3 text-right">损耗</th>
                <th className="min-w-[96px] px-4 py-3 text-right">展开成本</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((node) => {
                const selected = selectedNode.id === node.id;
                const hasChildren = node.children.length > 0;
                const open = expanded.has(node.id);
                const stageCode = stageCodeForNode(node);
                const stageActive = Boolean(activeOperationCode && stageCode === activeOperationCode);
                return (
                  <tr
                    key={node.id}
                    onClick={() => selectNode(node)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectNode(node);
                      }
                    }}
                    tabIndex={0}
                    className={cn("group cursor-pointer border-t border-[var(--stroke-subtle)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--interactive)]", selected || stageActive ? "bg-[var(--interactive-soft)]" : "hover:bg-[var(--surface-subtle)]")}
                    aria-selected={selected}
                  >
                    <td className={cn("sticky left-0 z-10 px-4 py-3 transition-colors", selected || stageActive ? "bg-[var(--interactive-soft)]" : "bg-[var(--surface)] group-hover:bg-[var(--surface-subtle)]")}>
                      <div className="flex items-center" style={{ paddingLeft: `${Math.min(node.depth, 4) * 18}px` }}>
                        <button type="button" disabled={!hasChildren} onClick={(event) => { event.stopPropagation(); toggleNode(node); }} className="focus-ring mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] disabled:opacity-25" aria-label={hasChildren ? `${open ? "收起" : "展开"}${node.name}` : `${node.name}没有下级`}>
                          {hasChildren ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                        </button>
                        <span className="min-w-0"><span className="flex items-center gap-2"><b className="truncate text-sm">{node.name}</b>{node.bomVersion && node.depth > 0 && <span className="rounded bg-[var(--status-ai-soft)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--status-ai)]">{node.bomVersion}</span>}</span><span className="mt-0.5 block font-mono text-[10px] text-[var(--text-tertiary)]">{node.code}</span></span>
                      </div>
                    </td>
                    {operations.map((operation) => {
                      const inStage = stageCode === operation.code;
                      return (
                        <td key={operation.id} className={cn("px-2 py-3 text-center", activeOperationCode === operation.code && "bg-[var(--interactive-soft)]")}>
                          {inStage ? (
                            <span className={cn("inline-flex min-h-7 items-center rounded-lg px-2 text-[9px] font-semibold tabular-nums", node.depth === 0 ? "bg-[var(--status-success-soft)] text-[var(--status-success)]" : "bg-[var(--interactive-soft)] text-[var(--interactive)]")}>
                              {node.depth === 0 ? "产出" : node.depth === 1 ? `${formatQuantity(node.netQuantity)} ${node.unit}` : "子流程"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--stroke)]">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right text-xs font-medium tabular-nums">{formatQuantity(node.netQuantity)} {node.unit}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums">{formatQuantity(node.grossQuantity)} {node.unit}</td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums text-[var(--text-tertiary)]">{node.depth ? <span className={cn(node.yieldRate < 0.9 && "font-semibold text-[var(--status-warning)]")}>{formatQuantity(node.lossQuantity)} {node.unit}<span className="mt-0.5 block text-[8px]">{((1 - node.yieldRate) * 100).toFixed(1)}%</span></span> : "—"}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-[var(--interactive)]">{formatCurrency(node.expandedCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--stroke-subtle)] lg:hidden">
          {rows.map((node) => {
            const selected = selectedNode.id === node.id;
            const hasChildren = node.children.length > 0;
            const stageCode = stageCodeForNode(node);
            const operation = operations.find((candidate) => candidate.code === stageCode);
            return (
              <article key={node.id} className={cn("p-3 transition", (selected || activeOperationCode === stageCode) && "bg-[var(--interactive-soft)]")}>
                <div className="flex items-start gap-2" style={{ paddingLeft: `${Math.min(node.depth, 3) * 10}px` }}>
                  <button type="button" disabled={!hasChildren} onClick={() => toggleNode(node)} className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] disabled:opacity-25" aria-label={hasChildren ? `${expanded.has(node.id) ? "收起" : "展开"}${node.name}` : `${node.name}没有下级`}>{hasChildren ? expanded.has(node.id) ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span className="h-1 w-1 rounded-full bg-current" />}</button>
                  <button type="button" onClick={() => selectNode(node)} className="focus-ring min-w-0 flex-1 rounded-lg text-left">
                    <span className="flex items-start justify-between gap-3"><span className="min-w-0"><b className="block truncate text-sm">{node.name}</b><span className="font-mono text-[10px] text-[var(--text-tertiary)]">{node.code}{node.operationName ? ` · ${node.operationName}` : ""}</span></span><b className="shrink-0 text-sm tabular-nums text-[var(--interactive)]">{formatCurrency(node.expandedCost)}</b></span>
                    {operation && <span className="mt-2 inline-flex rounded-md bg-[var(--surface-muted)] px-2 py-1 text-[9px] font-medium text-[var(--text-secondary)]">步骤 {operations.findIndex((candidate) => candidate.id === operation.id) + 1} · {operation.name}</span>}
                    <span className="mt-2 grid grid-cols-3 gap-2 text-[10px]"><span><span className="block text-[var(--text-tertiary)]">净用量</span><b className="mt-0.5 block tabular-nums">{formatQuantity(node.netQuantity)} {node.unit}</b></span><span><span className="block text-[var(--text-tertiary)]">出成率</span><b className="mt-0.5 block tabular-nums">{(node.yieldRate * 100).toFixed(1)}%</b></span><span><span className="block text-[var(--text-tertiary)]">毛料</span><b className="mt-0.5 block tabular-nums">{formatQuantity(node.grossQuantity)} {node.unit}</b></span></span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      {inspectorOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-slate-950/20 lg:pointer-events-none lg:bg-transparent" onClick={() => setInspectorOpen(false)} aria-label="关闭物料详情" />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[410px] overflow-y-auto border-l border-[var(--stroke-subtle)] bg-[var(--surface)] shadow-[-18px_0_48px_rgba(15,35,60,0.12)]" aria-label="物料关系详情">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--stroke-subtle)] bg-[var(--surface)] px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={typeMeta[selectedNode.type]?.tone ?? "neutral"}>{typeMeta[selectedNode.type]?.label ?? selectedNode.type}</Badge>
                  {selectedOperation && <span className="text-[10px] font-medium text-[var(--interactive)]">{selectedNode.depth > 1 ? "上级阶段" : "步骤"} {operations.findIndex((operation) => operation.id === selectedOperation.id) + 1}</span>}
                </div>
                <h2 className="mt-2 truncate text-xl font-semibold tracking-[-0.03em]">{selectedNode.name}</h2>
                <p className="mt-1 truncate font-mono text-[10px] text-[var(--text-tertiary)]">{selectedNode.code}</p>
              </div>
              <button type="button" onClick={() => setInspectorOpen(false)} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)]" aria-label="关闭详情"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">关系路径</span>
                <p className="mt-1.5 text-xs leading-5 text-[var(--text-secondary)]">{selectedNode.path.join(" → ")}</p>
              </div>

              {selectedOperation && selectedNode.depth <= 1 && (
                <section className="rounded-xl border border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div><span className="font-mono text-[9px] text-[var(--text-tertiary)]">{selectedOperation.code}</span><h3 className="mt-0.5 text-sm font-semibold">{selectedOperation.name}</h3></div>
                    <Badge tone={operationKindMeta[selectedOperation.kind].tone}>{operationKindMeta[selectedOperation.kind].label}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--stroke-subtle)] pt-3">
                    <DataPoint label="作业区域" value={selectedOperation.workCenter || "未指定"} />
                    <DataPoint label="标准时间" value={`${selectedOperation.durationMinutes} 分钟`} />
                    <DataPoint label="等待时间" value={`${selectedOperation.waitMinutes} 分钟`} />
                    <DataPoint label="温度要求" value={formatTemperature(selectedOperation.temperatureMin, selectedOperation.temperatureMax)} />
                  </dl>
                  {selectedOperation.instructions && <p className="mt-3 border-t border-[var(--stroke-subtle)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">{selectedOperation.instructions}</p>}
                </section>
              )}

              {selectedOperation && selectedNode.depth > 1 && (
                <section className="rounded-xl border border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-3.5">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">上下级工艺关系</span>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                    <span className="rounded-lg bg-[var(--surface)] px-3 py-2"><span className="block text-[9px] text-[var(--text-tertiary)]">子配方内部</span><b className="mt-0.5 block">{selectedNode.operationName ?? selectedNode.operationCode ?? "未记录"}</b></span>
                    <ArrowRight size={14} className="text-[var(--text-tertiary)]" />
                    <span className="rounded-lg bg-[var(--interactive-soft)] px-3 py-2"><span className="block text-[9px] text-[var(--text-tertiary)]">进入本配方</span><b className="mt-0.5 block text-[var(--interactive)]">{selectedOperation.name}</b></span>
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-[var(--text-tertiary)]">内部工艺参数由半成品自己的配方版本管理，此处只显示它与当前配方的衔接阶段。</p>
                </section>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <DataPoint label="毛料需求" value={`${formatQuantity(selectedNode.grossQuantity)} ${selectedNode.unit}`} />
                <DataPoint label="净用量" value={`${formatQuantity(selectedNode.netQuantity)} ${selectedNode.unit}`} />
                <DataPoint label="出成率" value={`${(selectedNode.yieldRate * 100).toFixed(1)}%`} />
                <DataPoint label="损耗量" value={selectedNode.depth ? `${formatQuantity(selectedNode.lossQuantity)} ${selectedNode.unit}` : "按子项查看"} />
                <DataPoint label="单位成本" value={selectedNode.depth ? formatCurrency(selectedNode.unitCost) : "—"} />
                <DataPoint label="展开成本" value={formatCurrency(selectedNode.expandedCost)} emphasis />
              </dl>

              <div className="space-y-3 border-t border-[var(--stroke-subtle)] pt-4">
                <RelationProgress label="占本配方展开成本" value={costShare} />
                <RelationProgress label="本行物料损耗率" value={lossRate} tone={lossRate >= 10 ? "warning" : "default"} />
              </div>

              {selectedNode.children.length > 0 && (
                <section>
                  <div className="flex items-center justify-between"><h3 className="text-xs font-semibold">直接下级</h3><span className="text-[10px] text-[var(--text-tertiary)]">{selectedNode.children.length} 项</span></div>
                  <div className="mt-2 space-y-1">
                    {selectedNode.children.slice(0, 8).map((child) => (
                      <button type="button" key={child.id} onClick={() => selectNode(child)} className="focus-ring flex min-h-11 w-full items-center justify-between rounded-lg px-2.5 text-left text-xs hover:bg-[var(--surface-muted)]">
                        <span className="truncate font-medium">{child.name}</span>
                        <span className="ml-3 shrink-0 tabular-nums text-[var(--text-tertiary)]">{formatQuantity(child.grossQuantity)} {child.unit}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {selectedProduct && <div className="rounded-xl bg-[var(--surface-muted)] p-3"><p className="text-[11px] font-semibold text-[var(--text-tertiary)]">产品档案参考</p><div className="mt-2 flex items-center justify-between text-sm"><span>档案库存</span><b className="tabular-nums">{formatNumber(selectedProduct.stock)} {selectedProduct.unit}</b></div><p className="mt-2 text-[11px] leading-5 text-[var(--text-tertiary)]">尚无库存流水台账，此数字不能作为生产可用量。</p></div>}
              {selectedNode.cycle && <div className="flex gap-2 rounded-xl bg-[var(--status-danger-soft)] p-3 text-xs text-[var(--status-danger)]"><AlertTriangle size={15} className="shrink-0" />检测到循环引用，已停止继续展开。</div>}
              <p className="border-t border-[var(--stroke-subtle)] pt-4 text-[10px] leading-5 text-[var(--text-tertiary)]">当前基准：{bom.version} · {formatQuantity(bom.outputQuantity)} {bom.outputUnit}。此处只读取版本事实，不直接修改正式状态。</p>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}

function RelationProgress({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" }) {
  const normalized = Math.min(100, Math.max(0, value));
  return <div><div className="flex items-center justify-between text-[10px]"><span className="text-[var(--text-tertiary)]">{label}</span><b className="tabular-nums">{normalized.toFixed(1)}%</b></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"><span className={cn("block h-full rounded-full transition-[width] duration-300", tone === "warning" ? "bg-[var(--status-warning)]" : "bg-[var(--interactive)]")} style={{ width: `${normalized}%` }} /></div></div>;
}

function ProcessWorkspace({ bom }: { bom: Bom }) {
  const operations = useMemo(() => [...bom.operations].sort((left, right) => left.sequence - right.sequence), [bom.operations]);
  const [selectedCode, setSelectedCode] = useState(operations[0]?.code ?? "");
  useEffect(() => {
    if (!operations.some((operation) => operation.code === selectedCode)) setSelectedCode(operations[0]?.code ?? "");
  }, [operations, selectedCode]);
  const totalDuration = operations.reduce((sum, operation) => sum + operation.durationMinutes, 0);
  const totalWait = operations.reduce((sum, operation) => sum + operation.waitMinutes, 0);
  const selectedOperation = operations.find((operation) => operation.code === selectedCode) ?? operations[0];
  const selectedMaterials = selectedOperation ? bom.items.filter((item) => item.operationCode === selectedOperation.code) : [];
  const standardTemplate = detectPreprocessTemplate(operations);
  const supportedProcess = operations.every((operation) => editablePreprocessKinds.includes(operation.kind));

  return (
    <section className="space-y-4" aria-label="标准前处理流程">
      <Card className="overflow-hidden">
        <PanelHeading
          title="标准前处理流程"
          description="流程只覆盖净菜、肉类前处理、称重组配、包装和冷链暂存"
          action={<Badge tone={standardTemplate ? "success" : "neutral"}>{standardTemplate?.name ?? "自定义流程"}</Badge>}
        />
        <div className="grid divide-y divide-[var(--stroke-subtle)] border-b border-[var(--stroke-subtle)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ProcessMetric label="作业时长" value={`${totalDuration} 分钟`} detail="不含等待" />
          <ProcessMetric label="等待时间" value={`${totalWait} 分钟`} detail="解冻、沥水或腌制" />
          <ProcessMetric label="阶段投料" value={`${bom.items.length} 行`} detail="允许同一原料分阶段投入" />
        </div>
        {operations.length ? (
          <>
            <div className="nora-scrollbar overflow-x-auto border-b border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] px-4 py-4">
              <div className="flex min-w-max items-center" role="tablist" aria-label="前处理步骤">
                {operations.map((operation, index) => {
                  const active = operation.code === selectedOperation?.code;
                  const materialCount = bom.items.filter((item) => item.operationCode === operation.code).length;
                  return (
                    <div key={operation.id} className="flex items-center">
                      <button type="button" role="tab" aria-selected={active} onClick={() => setSelectedCode(operation.code)} className={cn("focus-ring group min-w-[150px] rounded-xl border px-3 py-3 text-left transition duration-200 active:translate-y-px", active ? "border-[var(--interactive)] bg-[var(--surface)] shadow-sm" : "border-transparent hover:border-[var(--stroke)] hover:bg-[var(--surface)]")}>
                        <span className="flex items-center justify-between gap-3"><span className={cn("flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[10px] font-semibold", active ? "bg-[var(--interactive)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]")}>{String(index + 1).padStart(2, "0")}</span><span className="text-[10px] text-[var(--text-tertiary)]">{materialCount} 项投入</span></span>
                        <b className="mt-2 block text-xs">{operation.name}</b>
                        <span className="mt-0.5 block font-mono text-[9px] text-[var(--text-tertiary)]">{operation.code} · {operationKindMeta[operation.kind].label}</span>
                      </button>
                      {index < operations.length - 1 && <ArrowRight size={15} className="mx-2 shrink-0 text-[var(--stroke)]" aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedOperation && (
              <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
                <article className="min-w-0 p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex items-center gap-2"><span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[var(--text-tertiary)]">{selectedOperation.code}</span><Badge tone={operationKindMeta[selectedOperation.kind].tone}>{operationKindMeta[selectedOperation.kind].label}</Badge></div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{selectedOperation.name}</h2></div>
                    <span className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs tabular-nums text-[var(--text-secondary)]">步骤 {operations.findIndex((operation) => operation.id === selectedOperation.id) + 1} / {operations.length}</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <ProcessDetail icon={MapPin} label="作业区域" value={selectedOperation.workCenter || "未指定"} />
                    <ProcessDetail icon={Clock3} label="标准时间" value={`${selectedOperation.durationMinutes} 分钟${selectedOperation.waitMinutes ? `，等待 ${selectedOperation.waitMinutes} 分钟` : ""}`} />
                    <ProcessDetail icon={Thermometer} label="温度要求" value={formatTemperature(selectedOperation.temperatureMin, selectedOperation.temperatureMax)} />
                  </div>
                  {selectedOperation.instructions && <div className="mt-5 rounded-xl bg-[var(--surface-muted)] px-4 py-3"><span className="text-[10px] font-semibold text-[var(--text-tertiary)]">执行要点</span><p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{selectedOperation.instructions}</p></div>}
                  <div className="mt-6">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">本步关联用料</h3><span className="text-[11px] text-[var(--text-tertiary)]">{selectedMaterials.length} 行</span></div>
                    {selectedMaterials.length ? <div className="mt-2 overflow-hidden rounded-xl border border-[var(--stroke-subtle)]"><table className="w-full text-left"><thead className="bg-[var(--surface-subtle)] text-[10px] text-[var(--text-tertiary)]"><tr><th className="px-3 py-2.5">物料</th><th className="px-3 py-2.5 text-right">净用量</th><th className="px-3 py-2.5 text-right">出成率</th><th className="hidden px-3 py-2.5 text-right sm:table-cell">毛料需求</th></tr></thead><tbody>{selectedMaterials.map((item) => <tr key={item.id} className="border-t border-[var(--stroke-subtle)]"><td className="px-3 py-3"><b className="block text-xs">{item.name}</b><span className="font-mono text-[9px] text-[var(--text-tertiary)]">{item.componentCode ?? item.componentId}</span></td><td className="px-3 py-3 text-right text-xs font-medium tabular-nums">{formatQuantity(item.netQuantity)} {item.unit}</td><td className="px-3 py-3 text-right text-xs tabular-nums">{(item.yieldRate * 100).toFixed(1)}%</td><td className="hidden px-3 py-3 text-right text-xs font-semibold tabular-nums sm:table-cell">{formatQuantity(item.netQuantity / item.yieldRate)} {item.unit}</td></tr>)}</tbody></table></div> : <div className="mt-2 rounded-xl border border-dashed border-[var(--stroke)] px-4 py-7 text-center text-xs text-[var(--text-tertiary)]">本步骤没有直接进入的物料；它仍可作为标准流程控制点。</div>}
                  </div>
                </article>
                <aside className="border-t border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-4 lg:border-l lg:border-t-0">
                  <div className="flex items-center gap-2"><BookOpenCheck size={16} className="text-[var(--interactive)]" /><h3 className="text-sm font-semibold">流程检查</h3></div>
                  <dl className="mt-4 space-y-3 text-xs"><FlowCheck label="标准模板" value={standardTemplate?.name ?? "尚未匹配"} ok={Boolean(standardTemplate)} /><FlowCheck label="业务范围" value={supportedProcess ? "净配前处理" : "存在未支持步骤"} ok={supportedProcess} /><FlowCheck label="阶段投料" value={`${bom.items.length} / ${bom.items.length} 已关联`} ok={bom.items.every((item) => operations.some((operation) => operation.code === item.operationCode))} /><FlowCheck label="流程终点" value={operations.at(-1)?.name ?? "未设置"} ok={["pack", "quality", "cool"].includes(operations.at(-1)?.kind ?? "")} /></dl>
                  <p className="mt-5 border-t border-[var(--stroke-subtle)] pt-4 text-[10px] leading-5 text-[var(--text-tertiary)]">Nora 的标准流程只提供基础骨架。企业仍需根据原料、包装和食品安全制度确定具体参数。</p>
                </aside>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-14 text-center">
            <Workflow className="mx-auto text-[var(--text-tertiary)]" />
            <h2 className="mt-3 font-semibold">当前版本没有前处理流程</h2>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">复制为草稿并应用标准流程，补齐阶段投料后再发布。</p>
          </div>
        )}
      </Card>
    </section>
  );
}

function ProcessMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="px-5 py-4"><span className="text-[10px] text-[var(--text-tertiary)]">{label}</span><b className="mt-1 block text-lg tabular-nums">{value}</b><span className="mt-1 block text-[10px] text-[var(--text-tertiary)]">{detail}</span></div>;
}

function ProcessDetail({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--stroke-subtle)] px-3 py-3"><div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]"><Icon size={13} />{label}</div><b className="mt-2 block text-xs leading-5">{value}</b></div>;
}

function FlowCheck({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-[var(--text-tertiary)]">{label}</dt><dd className={cn("text-right font-medium", ok ? "text-[var(--status-success)]" : "text-[var(--status-warning)]")}>{value}</dd></div>;
}

function ExplosionWorkspace({
  bom,
  boms,
  requestedOutput,
  onRequestedOutputChange,
}: {
  bom: Bom;
  boms: Bom[];
  requestedOutput: number;
  onRequestedOutputChange: (value: number) => void;
}) {
  const trial = calculateRecipeUsageTrial(bom, boms, requestedOutput);
  const rows: ExplodedMaterial[] = trial.items;
  const quickScales = [1, 10, 100];

  return (
    <section className="space-y-4" aria-label="当前配方用量试算">
      <Card className="overflow-hidden">
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">仅当前配方</Badge>
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{bom.code} · {bom.version}</span>
            </div>
            <div className="mt-3 flex items-center gap-1"><h2 className="text-lg font-semibold tracking-[-0.025em]">{bom.productName}用量试算</h2><HelpTip title="试算范围">按目标产出计算当前版本的用量、损耗与成本；半成品会展开为末级原料，不会合并其他商品或订单。</HelpTip></div>
          </div>
          <Field label={`目标产出（${bom.outputUnit}）`} hint={`配方基准 ${formatQuantity(bom.outputQuantity)} ${bom.outputUnit}`}>
            <input
              type="number"
              min={0.001}
              step={bom.outputQuantity}
              className={inputClass}
              value={requestedOutput}
              onChange={(event) => onRequestedOutputChange(Math.max(0.001, Number(event.target.value) || 0.001))}
            />
          </Field>
        </div>
        <div className="grid border-t border-[var(--stroke-subtle)] sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(140px,0.48fr))]">
          <div className="border-b border-[var(--stroke-subtle)] p-4 sm:col-span-2 lg:col-span-1 lg:border-b-0 lg:border-r">
            <span className="block text-[10px] font-medium text-[var(--text-tertiary)]">快速设置</span>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="按配方基准设置试算倍数">
              {quickScales.map((scale) => {
                const active = Math.abs(trial.scaleFactor - scale) < 0.000001;
                return (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => onRequestedOutputChange(bom.outputQuantity * scale)}
                    className={cn(
                      "focus-ring min-h-9 rounded-lg border px-3 text-xs font-semibold transition",
                      active
                        ? "border-[var(--interactive)] bg-[var(--interactive)] text-white"
                        : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                    )}
                    aria-pressed={active}
                  >
                    {scale}× · {formatQuantity(bom.outputQuantity * scale)} {bom.outputUnit}
                  </button>
                );
              })}
            </div>
          </div>
          <TrialMetric label="放大倍数" value={`${formatQuantity(trial.scaleFactor, 2)}×`} />
          <TrialMetric label="末级物料" value={`${rows.length} 项`} />
          <TrialMetric label="末级材料成本" value={formatCurrency(trial.totalEstimatedCost)} emphasis />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <PanelHeading
          title="末级物料用量"
          description={`共 ${rows.length} 项；同一物料在当前配方的不同路径中自动汇总`}
          action={<Badge tone="info">毛料 = 净用量 ÷ 出成率</Badge>}
        />
        {rows.length ? (
          <>
            <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
              {rows.map((item) => <ExplosionMaterialCard key={`${item.productId}-${item.unit}`} item={item} />)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)]">
                  <tr><th className="px-5 py-3">末级物料</th><th className="px-5 py-3">配方路径</th><th className="px-5 py-3 text-right">毛料需求</th><th className="px-5 py-3 text-right">损耗</th><th className="px-5 py-3 text-right">预计成本</th></tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={`${item.productId}-${item.unit}`} className="border-t border-[var(--stroke-subtle)] transition-colors hover:bg-[var(--surface-subtle)]">
                      <td className="px-5 py-4"><b className="block text-sm">{item.name}</b><span className="mt-0.5 block font-mono text-[11px] text-[var(--text-tertiary)]">{item.code}</span></td>
                      <td className="max-w-[320px] px-5 py-4"><span className="line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{item.sources.join("；")}</span></td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums">{formatQuantity(item.grossQuantity)} {item.unit}</td>
                      <td className="px-5 py-4 text-right text-xs tabular-nums text-[var(--text-tertiary)]">{formatQuantity(item.lossQuantity)} {item.unit}</td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-[var(--interactive)]">{formatCurrency(item.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center">
            <b className="text-sm font-semibold">当前配方没有可展开的物料</b>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">请先在“配方与流程”中维护用料。</p>
          </div>
        )}
      </Card>
    </section>
  );
}

function TrialMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="border-b border-[var(--stroke-subtle)] p-4 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <span className="block text-[10px] text-[var(--text-tertiary)]">{label}</span>
      <b className={cn("mt-1 block text-lg tabular-nums tracking-[-0.025em]", emphasis && "text-[var(--interactive)]")}>{value}</b>
    </div>
  );
}

function ExplosionMaterialCard({ item }: { item: ExplodedMaterial }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3"><span><b className="block">{item.name}</b><span className="font-mono text-[11px] text-[var(--text-tertiary)]">{item.code}</span></span><b className="text-[var(--interactive)]">{formatCurrency(item.estimatedCost)}</b></div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{item.sources.join("；")}</p>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--stroke-subtle)] pt-3 text-xs"><span className="text-[var(--text-tertiary)]">毛料需求</span><b className="tabular-nums">{formatQuantity(item.grossQuantity)} {item.unit}</b></div>
    </article>
  );
}

function VersionWorkspace({ bom, selectedVersionId, onSelectVersion }: { bom: Bom; selectedVersionId?: string; onSelectVersion: (versionId: string) => void }) {
  const versions = bom.versions?.length ? [...bom.versions] : [{
    id: bom.versionId ?? `${bom.id}-current`,
    version: bom.version,
    status: bom.status,
    effectiveAt: bom.effectiveAt || null,
    effectiveTo: bom.effectiveTo ?? null,
    publishedAt: bom.status === "draft" ? null : bom.effectiveAt || null,
    revision: bom.revision ?? 1,
    events: [],
  }];
  versions.sort((left, right) => {
    if (left.status === "draft" && right.status !== "draft") return -1;
    if (right.status === "draft" && left.status !== "draft") return 1;
    return new Date(right.effectiveAt ?? 0).getTime() - new Date(left.effectiveAt ?? 0).getTime();
  });
  return (
    <Card className="overflow-hidden">
      <PanelHeading title="版本时间线" action={<span className="inline-flex items-center gap-1"><Badge tone="info">{versions.length} 个版本</Badge><HelpTip title="版本说明">已发布版本不可直接修改，新版本按生效时间接替当前版本。</HelpTip></span>} />
      <div className="relative p-4 sm:p-6">
        <div className="absolute bottom-8 left-[37px] top-8 w-px bg-[var(--stroke)] sm:left-[45px]" />
        <div className="relative space-y-4">
          {versions.map((version) => {
            const validity = validityMeta[validityOf(version)];
            const latestEvent = version.events?.[0];
            const selected = version.id === selectedVersionId;
            return (
              <article key={version.id} className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 sm:grid-cols-[42px_minmax(0,1fr)_220px] sm:gap-4">
                <span className={cn("relative z-10 mt-1 flex h-10 w-10 items-center justify-center rounded-xl border-4 border-white", validity.tone === "success" ? "bg-[var(--status-success)] text-white" : validity.tone === "purple" ? "bg-[var(--status-ai)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]")}><History size={16} /></span>
                <div className={cn("rounded-xl border p-4", selected ? "border-[var(--interactive)] bg-[var(--interactive-soft)]" : "border-[var(--stroke-subtle)]")}>
                  <div className="flex flex-wrap items-center justify-between gap-3"><span className="flex flex-wrap items-center gap-2"><b className="text-base">{version.version}</b><Badge tone={validity.tone}>{validity.label}</Badge></span><Button size="sm" variant={selected ? "ghost" : "secondary"} onClick={() => onSelectVersion(version.id)} disabled={selected}>{selected ? "正在查看" : "打开此版本"}</Button></div>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{version.status === "draft" ? "尚未发布，可继续编辑。" : `${formatDateTime(version.effectiveAt)} — ${version.effectiveTo ? formatDateTime(version.effectiveTo) : "持续有效"}`}</p>
                </div>
                <div className="col-start-2 text-xs text-[var(--text-tertiary)] sm:col-start-auto sm:pt-4 sm:text-right">{latestEvent ? <><p className="font-medium text-[var(--text-secondary)]">{latestEvent.actor === "migration:historical-actor-unknown" ? "历史数据" : latestEvent.actor}</p><p className="mt-1 tabular-nums">{formatDateTime(latestEvent.createdAt)}</p></> : <p>暂无操作记录</p>}</div>
              </article>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function BomEditorModal({
  open,
  onOpenChange,
  bom,
  products,
  saving,
  error,
  returnFocusRef,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bom: Bom;
  products: Product[];
  saving: boolean;
  error: string;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  onSave: (bom: Bom) => Promise<void>;
}) {
  const [outputQuantity, setOutputQuantity] = useState(bom.outputQuantity);
  const [outputUnit, setOutputUnit] = useState(bom.outputUnit);
  const [operations, setOperations] = useState<BomOperation[]>(bom.operations);
  const [items, setItems] = useState<BomItem[]>(bom.items);
  const [localError, setLocalError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<PreprocessTemplateId>("kit-assembly");
  const [templateUndo, setTemplateUndo] = useState<{ operations: BomOperation[]; items: BomItem[] }>();
  const [templateNotice, setTemplateNotice] = useState("");
  useEffect(() => {
    if (!open) return;
    setOutputQuantity(bom.outputQuantity);
    setOutputUnit(bom.outputUnit);
    setOperations(bom.operations.map((operation) => ({ ...operation })));
    setItems(bom.items.map((item) => ({ ...item })));
    setLocalError("");
    setSelectedTemplateId(detectPreprocessTemplate(bom.operations)?.id ?? "kit-assembly");
    setTemplateUndo(undefined);
    setTemplateNotice("");
  }, [open, bom]);

  const availableProducts = products.filter((product) => product.id !== bom.productId);
  const addOperation = () => {
    const sequence = (operations.length + 1) * 10;
    let code = `OP${sequence}`;
    while (operations.some((operation) => operation.code === code)) code = `OP${sequence}-${operations.length + 1}`;
    setOperations((current) => [...current, {
      id: `draft-operation-${Date.now()}`,
      code,
      name: "新步骤",
      kind: "quality",
      sequence,
      durationMinutes: 0,
      waitMinutes: 0,
    }]);
  };
  const updateOperation = (index: number, patch: Partial<BomOperation>) => {
    const previousCode = operations[index]?.code;
    if (patch.code !== undefined && previousCode && patch.code !== previousCode) {
      setItems((current) => current.map((item) => item.operationCode === previousCode ? { ...item, operationCode: patch.code! } : item));
    }
    setOperations((current) => current.map((operation, operationIndex) => operationIndex === index ? { ...operation, ...patch } : operation));
  };
  const moveOperation = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= operations.length) return;
    setOperations((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next.map((operation, operationIndex) => ({ ...operation, sequence: (operationIndex + 1) * 10 }));
    });
  };
  const removeOperation = (index: number) => {
    if (operations.length === 1) return;
    const removed = operations[index];
    const fallback = operations.find((_, operationIndex) => operationIndex !== index)!;
    setOperations((current) => current.filter((_, operationIndex) => operationIndex !== index).map((operation, operationIndex) => ({ ...operation, sequence: (operationIndex + 1) * 10 })));
    setItems((current) => current.map((item) => item.operationCode === removed.code ? { ...item, operationCode: fallback.code } : item));
  };
  const addItem = () => {
    const product = availableProducts[0];
    const operation = operations[0];
    if (!product || !operation) return;
    setItems((current) => [...current, {
      id: `draft-item-${Date.now()}`,
      componentId: product.id,
      componentCode: product.code,
      operationCode: operation.code,
      name: product.name,
      type: product.type,
      unit: product.unit,
      netQuantity: 1,
      yieldRate: 1,
      unitCost: product.cost,
      level: 1,
    }]);
  };
  const updateItem = (index: number, patch: Partial<BomItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const changeItemProduct = (index: number, productId: string) => {
    const product = availableProducts.find((candidate) => candidate.id === productId);
    if (!product) return;
    updateItem(index, { componentId: product.id, componentCode: product.code, name: product.name, type: product.type, unit: product.unit, unitCost: product.cost });
  };
  const applyTemplate = () => {
    const template = preprocessTemplates.find((candidate) => candidate.id === selectedTemplateId);
    if (!template) return;
    const nextOperations = instantiatePreprocessTemplate(template, `draft-${template.id}-${Date.now()}`);
    const chooseOperationCode = (item: BomItem) => {
      const product = products.find((candidate) => candidate.id === item.componentId);
      return suggestPreprocessOperationCode(nextOperations, product ?? { type: item.type });
    };
    setTemplateUndo({ operations: operations.map((operation) => ({ ...operation })), items: items.map((item) => ({ ...item })) });
    setOperations(nextOperations);
    setItems((current) => current.map((item) => ({ ...item, operationCode: chooseOperationCode(item) ?? nextOperations[0]!.code })));
    setTemplateNotice(`已应用“${template.name}”，阶段投料已按物料类型重新关联。保存前仍可调整。`);
    setLocalError("");
  };
  const undoTemplate = () => {
    if (!templateUndo) return;
    setOperations(templateUndo.operations);
    setItems(templateUndo.items);
    setTemplateUndo(undefined);
    setTemplateNotice("已恢复应用模板前的流程和阶段关系。");
  };
  const submit = () => {
    if (outputQuantity <= 0 || !outputUnit.trim()) {
      setLocalError("标准产出和单位必须有效");
      return;
    }
    const normalizedOperations = operations.map((operation, index) => ({
      ...operation,
      code: operation.code.trim(),
      name: operation.name.trim(),
      workCenter: operation.workCenter?.trim() || undefined,
      instructions: operation.instructions?.trim() || undefined,
      sequence: (index + 1) * 10,
    }));
    if (!normalizedOperations.length || normalizedOperations.some((operation) => !operation.code || !operation.name)) {
      setLocalError("至少保留一道工序，工序编码和名称不能为空");
      return;
    }
    if (new Set(normalizedOperations.map((operation) => operation.code)).size !== normalizedOperations.length) {
      setLocalError("工序编码不能重复");
      return;
    }
    if (normalizedOperations.some((operation) => operation.temperatureMin !== undefined && operation.temperatureMax !== undefined && operation.temperatureMin > operation.temperatureMax)) {
      setLocalError("工序最低温度不能高于最高温度");
      return;
    }
    if (!items.length || items.some((item) => item.netQuantity <= 0 || item.yieldRate <= 0 || item.yieldRate > 1)) {
      setLocalError("至少保留一项物料；净用量须大于 0，出成率须在 0–100% 之间");
      return;
    }
    const codes = new Set(normalizedOperations.map((operation) => operation.code));
    if (items.some((item) => !codes.has(item.operationCode))) {
      setLocalError("每条物料都必须分配到一道工序");
      return;
    }
    void onSave({ ...bom, outputQuantity, outputUnit: outputUnit.trim(), operations: normalizedOperations, items });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`编辑 ${bom.version} 草稿`}
      size="xl"
      returnFocusRef={returnFocusRef}
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button><Button onClick={submit} disabled={saving}><Save size={16} />{saving ? "保存中…" : "保存草稿"}</Button></>}
    >
      <div className="space-y-5">
        <div className="flex justify-end"><HelpTip title="草稿说明">物料结构与工艺路线会一起保存；发布后如需调整，请创建新版本。</HelpTip></div>
        <div className="grid grid-cols-2 gap-3 lg:max-w-md">
          <Field label="标准产出" required><input type="number" min={0.001} step={0.001} className={inputClass} value={outputQuantity} onChange={(event) => setOutputQuantity(Number(event.target.value))} /></Field>
          <Field label="产出单位" required><input className={inputClass} value={outputUnit} onChange={(event) => setOutputUnit(event.target.value)} /></Field>
        </div>
        <section className="rounded-xl border border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Field label="标准前处理流程">
              <select className={inputClass} value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value as PreprocessTemplateId)}>
                {preprocessTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.appliesTo}</option>)}
              </select>
            </Field>
            <div className="flex shrink-0 gap-2"><Button variant="secondary" onClick={applyTemplate}><BookOpenCheck size={15} />应用标准流程</Button>{templateUndo && <Button variant="ghost" onClick={undoTemplate}><Undo2 size={15} />撤销应用</Button>}</div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{preprocessTemplates.find((template) => template.id === selectedTemplateId)?.description}</p>
          {templateNotice && <p className="mt-2 text-xs font-medium text-[var(--status-success)]" aria-live="polite">{templateNotice}</p>}
        </section>
        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between"><span className="inline-flex items-center gap-1"><span className="text-xs font-semibold text-[var(--text-secondary)]">工艺路线</span><HelpTip title="工序排序">工序顺序决定生产流转；调整顺序时，阶段投料会继续保留在原工序。</HelpTip></span><Button size="sm" variant="secondary" onClick={addOperation}><Plus size={14} />添加工序</Button></div>
            <div className="nora-scrollbar max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {operations.map((operation, index) => (
                <div key={operation.id} className="rounded-xl border border-[var(--stroke-subtle)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--interactive-soft)] font-mono text-[10px] font-semibold text-[var(--interactive)]">{index + 1}</span><Badge tone={operationKindMeta[operation.kind].tone}>{operationKindMeta[operation.kind].label}</Badge></div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="focus-ring rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] disabled:opacity-30" disabled={index === 0} onClick={() => moveOperation(index, -1)} aria-label={`上移${operation.name}`}><ChevronUp size={15} /></button>
                      <button type="button" className="focus-ring rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] disabled:opacity-30" disabled={index === operations.length - 1} onClick={() => moveOperation(index, 1)} aria-label={`下移${operation.name}`}><ChevronDown size={15} /></button>
                      <button type="button" className="focus-ring rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)] disabled:opacity-30" disabled={operations.length === 1} onClick={() => removeOperation(index)} aria-label={`移除${operation.name}`}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label="编码"><input className={inputClass} value={operation.code} onChange={(event) => updateOperation(index, { code: event.target.value })} /></Field>
                    <Field label="名称"><input className={inputClass} value={operation.name} onChange={(event) => updateOperation(index, { name: event.target.value })} /></Field>
                    <Field label="类型"><select className={inputClass} value={operation.kind} onChange={(event) => updateOperation(index, { kind: event.target.value as BomOperationKind })}>{editablePreprocessKinds.map((kind) => <option key={kind} value={kind}>{operationKindMeta[kind].label}</option>)}</select></Field>
                    <Field label="工作区域"><input className={inputClass} value={operation.workCenter ?? ""} onChange={(event) => updateOperation(index, { workCenter: event.target.value })} placeholder="例如切配间" /></Field>
                    <Field label="作业分钟"><input type="number" min={0} max={1440} className={inputClass} value={operation.durationMinutes} onChange={(event) => updateOperation(index, { durationMinutes: Math.max(0, Number(event.target.value) || 0) })} /></Field>
                    <Field label="等待分钟"><input type="number" min={0} max={1440} className={inputClass} value={operation.waitMinutes} onChange={(event) => updateOperation(index, { waitMinutes: Math.max(0, Number(event.target.value) || 0) })} /></Field>
                    <Field label="最低温度 °C"><input type="number" step={0.1} className={inputClass} value={operation.temperatureMin ?? ""} onChange={(event) => updateOperation(index, { temperatureMin: event.target.value === "" ? undefined : Number(event.target.value) })} /></Field>
                    <Field label="最高温度 °C"><input type="number" step={0.1} className={inputClass} value={operation.temperatureMax ?? ""} onChange={(event) => updateOperation(index, { temperatureMax: event.target.value === "" ? undefined : Number(event.target.value) })} /></Field>
                  </div>
                  <Field label="作业说明"><textarea className={`${inputClass} mt-2 min-h-20 py-2`} value={operation.instructions ?? ""} onChange={(event) => updateOperation(index, { instructions: event.target.value })} placeholder="记录可执行的关键要求" /></Field>
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between gap-3"><span><span className="block text-xs font-semibold text-[var(--text-secondary)]">BOM 用料与阶段关系</span><span className="mt-0.5 block text-[10px] text-[var(--text-tertiary)]">按逻辑表维护物料、进入步骤、净用量与出成率；同一原料可在不同步骤重复添加</span></span><Button size="sm" variant="secondary" onClick={addItem} disabled={!availableProducts.length || !operations.length}><Plus size={14} />添加物料</Button></div>
            <div className="hidden max-h-[48vh] overflow-auto rounded-xl border border-[var(--stroke-subtle)] md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead className="sticky top-0 z-10 bg-[var(--surface-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)]">
                  <tr><th className="px-3 py-2.5">物料</th><th className="px-3 py-2.5">进入步骤</th><th className="px-3 py-2.5 text-right">净用量</th><th className="px-3 py-2.5 text-right">出成率</th><th className="px-3 py-2.5">单位</th><th className="px-3 py-2.5 text-right">毛料预览</th><th className="w-12 px-2 py-2.5"><span className="sr-only">操作</span></th></tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-t border-[var(--stroke-subtle)] bg-[var(--surface)] transition-colors hover:bg-[var(--surface-subtle)] focus-within:bg-[var(--interactive-soft)]">
                      <td className="min-w-56 px-3 py-2.5"><select aria-label={`${item.name}物料`} className={inputClass} value={item.componentId} onChange={(event) => changeItemProduct(index, event.target.value)}>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</select></td>
                      <td className="min-w-48 px-3 py-2.5"><select aria-label={`${item.name}进入步骤`} className={inputClass} value={item.operationCode} onChange={(event) => updateItem(index, { operationCode: event.target.value })}>{operations.map((operation) => <option key={operation.id} value={operation.code}>{operation.code} · {operation.name}</option>)}</select></td>
                      <td className="w-32 px-3 py-2.5"><input aria-label={`${item.name}净用量`} type="number" min={0.000001} step={0.001} className={`${inputClass} text-right tabular-nums`} value={item.netQuantity} onChange={(event) => updateItem(index, { netQuantity: Number(event.target.value) })} /></td>
                      <td className="w-28 px-3 py-2.5"><input aria-label={`${item.name}出成率`} type="number" min={0.0001} max={100} step={0.1} className={`${inputClass} text-right tabular-nums`} value={Number((item.yieldRate * 100).toFixed(4))} onChange={(event) => updateItem(index, { yieldRate: Number(event.target.value) / 100 })} /></td>
                      <td className="w-24 px-3 py-2.5"><input aria-label={`${item.name}单位`} className={inputClass} value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold tabular-nums">{item.yieldRate > 0 ? formatQuantity(item.netQuantity / item.yieldRate) : "—"} {item.unit}</td>
                      <td className="px-2 py-2.5"><button type="button" className="focus-ring rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)] disabled:opacity-30" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`移除${item.name}`}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 md:hidden">
              {items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-[var(--stroke-subtle)] p-3">
                  <div className="flex items-start justify-between gap-3"><span><b className="block text-sm">{item.name}</b><span className="font-mono text-[10px] text-[var(--text-tertiary)]">{item.componentCode ?? item.componentId}</span></span><button type="button" className="focus-ring rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)] disabled:opacity-30" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`移除${item.name}`}><Trash2 size={15} /></button></div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Field label="物料"><select className={inputClass} value={item.componentId} onChange={(event) => changeItemProduct(index, event.target.value)}>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</select></Field>
                    <Field label="进入步骤"><select className={inputClass} value={item.operationCode} onChange={(event) => updateItem(index, { operationCode: event.target.value })}>{operations.map((operation) => <option key={operation.id} value={operation.code}>{operation.code} · {operation.name}</option>)}</select></Field>
                    <Field label="净用量"><input type="number" min={0.000001} step={0.001} className={inputClass} value={item.netQuantity} onChange={(event) => updateItem(index, { netQuantity: Number(event.target.value) })} /></Field>
                    <Field label="出成率 %"><input type="number" min={0.0001} max={100} step={0.1} className={inputClass} value={Number((item.yieldRate * 100).toFixed(4))} onChange={(event) => updateItem(index, { yieldRate: Number(event.target.value) / 100 })} /></Field>
                    <Field label="单位"><input className={inputClass} value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></Field>
                    <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2"><span className="block text-[10px] text-[var(--text-tertiary)]">毛料预览</span><b className="mt-1 block text-sm tabular-nums">{item.yieldRate > 0 ? formatQuantity(item.netQuantity / item.yieldRate) : "—"} {item.unit}</b></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        {(localError || error) && <p className="text-sm text-[var(--status-danger)]" role="alert">{localError || error}</p>}
      </div>
    </Modal>
  );
}

function PanelHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--stroke-subtle)] px-4 py-3.5">
      <div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">{description}</p>}</div>
      {action}
    </div>
  );
}

function DataPoint({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div><dt className="text-[10px] text-[var(--text-tertiary)]">{label}</dt><dd className={cn("mt-1 text-sm font-semibold tabular-nums", emphasis && "text-[var(--interactive)]")}>{value}</dd></div>;
}
