import styles from "../showroom.module.css";

export function DataFlow({ active = true, vertical = false }: { active?: boolean; vertical?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.dataFlow} ${vertical ? styles.dataFlowVertical : ""} ${active ? styles.dataFlowActive : ""}`}
    >
      <span />
    </span>
  );
}
