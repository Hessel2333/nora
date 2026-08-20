export type WorkOrderCommand =
  | "start"
  | "pause"
  | "resume"
  | "report_exception"
  | "recover_pending"
  | "recover_running";

export type ExecutableWorkOrderStatus = "pending" | "running" | "paused" | "exception";

export type WorkOrderTransitionIssue = "invalid_status" | "revision_conflict";

const transitions: Record<WorkOrderCommand, {
  from: ExecutableWorkOrderStatus[];
  to: ExecutableWorkOrderStatus;
}> = {
  start: { from: ["pending"], to: "running" },
  pause: { from: ["running"], to: "paused" },
  resume: { from: ["paused"], to: "running" },
  report_exception: { from: ["pending", "running", "paused"], to: "exception" },
  recover_pending: { from: ["exception"], to: "pending" },
  recover_running: { from: ["exception"], to: "running" },
};

export function getWorkOrderTransition(
  status: string,
  revision: number,
  expectedRevision: number,
  command: WorkOrderCommand,
) {
  const transition = transitions[command];
  if (!transition.from.includes(status as ExecutableWorkOrderStatus)) {
    return { issue: "invalid_status" as const };
  }
  if (revision !== expectedRevision) {
    return { issue: "revision_conflict" as const };
  }
  return { status: transition.to };
}

export function batchStatusForWorkOrder(status: ExecutableWorkOrderStatus) {
  return status === "pending" ? "released" as const : status;
}
