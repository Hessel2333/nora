"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock3, MapPin, ScanLine } from "lucide-react";
import { FactorySchematic } from "@/features/digital-twin/factory-schematic";
import { getRoomCameraFeeds } from "@/features/digital-twin/room-camera";
import type { FactoryRoomSnapshot } from "@/features/digital-twin/room-monitoring";
import type { WorkOrder } from "@/lib/types";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const PRODUCTION_PATH = [
  { roomId: "R15", label: "前处理", at: 0 },
  { roomId: "R09", label: "切配", at: 0.12 },
  { roomId: "R10", label: "称量", at: 0.25 },
  { roomId: "R08", label: "包装", at: 0.67 },
  { roomId: "R14", label: "冷链", at: 0.72 },
  { roomId: "R21", label: "发运", at: 0.96 },
];

const ROOM_LIVE_COUNTS: Record<string, { workOrders: number; staff: number }> = {
  R15: { workOrders: 3, staff: 6 },
  R09: { workOrders: 4, staff: 8 },
  R10: { workOrders: 2, staff: 4 },
  R08: { workOrders: 5, staff: 9 },
  R14: { workOrders: 1, staff: 2 },
  R21: { workOrders: 6, staff: 7 },
};

export function ProductionScene({
  progress,
  rooms,
  workOrders,
  onInteract,
}: {
  progress: number;
  rooms: FactoryRoomSnapshot[];
  workOrders: WorkOrder[];
  onInteract: () => void;
}) {
  const [manualRoomId, setManualRoomId] = useState<string | null>(null);
  const batchProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.84));
  let autoIndex = 0;
  for (let index = PRODUCTION_PATH.length - 1; index >= 0; index -= 1) {
    if (batchProgress >= PRODUCTION_PATH[index].at) {
      autoIndex = index;
      break;
    }
  }
  const selectedId = manualRoomId ?? PRODUCTION_PATH[autoIndex].roomId;
  const manualPathStep = manualRoomId ? PRODUCTION_PATH.find((step) => step.roomId === manualRoomId) : null;
  const displayedBatchProgress = manualPathStep?.at ?? batchProgress;
  const selectedRoom = rooms.find((room) => room.id === selectedId) ?? rooms[0];
  const selectedWorkOrder = useMemo(
    () => workOrders.find((workOrder) => workOrder.id === selectedRoom?.task?.workOrderId),
    [selectedRoom, workOrders],
  );
  const selectedCamera = selectedRoom ? getRoomCameraFeeds(selectedRoom)[0] : null;
  const liveCounts = ROOM_LIVE_COUNTS[selectedId] ?? { workOrders: selectedRoom?.task ? 1 : 0, staff: 3 };

  const selectRoom = (roomId: string) => {
    onInteract();
    setManualRoomId(roomId);
  };

  return (
    <section className={`${styles.scene} ${styles.productionScene}`}>
      <SceneTitle
        eyebrow="07 · LIVE FACTORY"
        title="这一刻，工厂正在发生什么？"
        description="每一个订单、批次和工序，都可以被精确追踪。"
      />

      <div className={styles.factoryExperience}>
        <div className={styles.factoryMapSurface} data-active-room={selectedId}>
          <div className={styles.factoryMapMeta}>
            <span><i /> 净配菜工厂</span>
            <small>CAD 房间状态 · 演示数据</small>
          </div>
          <div className={styles.factoryMapViewport}>
            <FactorySchematic
              rooms={rooms}
              selectedId={selectedId}
              focusedId={null}
              showRooms
              variant="showroom"
              showBatchFlow
              batchProgress={displayedBatchProgress}
              onSelect={selectRoom}
              onMonitorRoom={selectRoom}
              onOpenRoom={selectRoom}
            />
          </div>
        </div>

        <aside key={selectedId} className={`${styles.factoryDetail} ${styles.factoryDetailEnter}`}>
          <div className={styles.livePill}><span /> LIVE · 刚刚更新</div>
          <p>{selectedRoom?.id} · {selectedRoom?.name}</p>
          <h2>{selectedRoom?.task?.name ?? "区域状态正常"}</h2>
          <div className={styles.factoryTaskCode}><ScanLine size={15} />{selectedRoom?.task?.code ?? "暂无在制工单"}</div>
          <div className={styles.factoryProgressValue}>
            <strong>{selectedWorkOrder?.completedQuantity.toLocaleString("zh-CN") ?? selectedRoom?.progress}</strong>
            <span>/ {selectedWorkOrder?.plannedQuantity.toLocaleString("zh-CN") ?? 100} {selectedWorkOrder?.unit ?? "%"}</span>
          </div>
          <div className={styles.factoryProgressBar}><span style={{ width: `${selectedRoom?.progress ?? 0}%` }} /></div>
          <div className={styles.factoryFacts}>
            <span><CheckCircle2 size={15} /><small>当前进度</small><strong>{selectedRoom?.progress ?? 0}%</strong></span>
            <span><Clock3 size={15} /><small>预计完成</small><strong>{selectedRoom?.task?.eta ?? "按计划"}</strong></span>
            <span><MapPin size={15} /><small>现场负责人</small><strong>{selectedRoom?.owner}</strong></span>
          </div>
          <div className={styles.realWorldWindow}>
            <div style={{ position: "relative" }}>
              {selectedCamera ? <Image key={selectedCamera.id} src={selectedCamera.poster} alt={`${selectedRoom?.id} ${selectedRoom?.name}演示画面`} fill sizes="320px" /> : null}
              <span><i /> LIVE · {selectedRoom?.id}</span>
            </div>
            <p><span>当前工单 <strong>{liveCounts.workOrders}</strong></span><span>当前人员 <strong>{liveCounts.staff}</strong></span><span>区域温度 <strong>{selectedRoom?.temperature}</strong></span></p>
          </div>
        </aside>
      </div>

      <div className={styles.batchRoute}>
        <div><span>批次</span><strong>PL20260813-028</strong></div>
        {PRODUCTION_PATH.map((step, index) => (
          <button
            type="button"
            data-showroom-control
            key={step.roomId}
            onClick={() => selectRoom(step.roomId)}
            className={selectedId === step.roomId ? styles.batchActive : index < autoIndex && !manualRoomId ? styles.batchComplete : ""}
          >
            <span>{index + 1}</span><strong>{step.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
