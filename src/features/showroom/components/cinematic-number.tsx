import styles from "../showroom.module.css";

export function CinematicNumber({
  value,
  prefix,
  suffix,
  fractionDigits = 0,
  label,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  fractionDigits?: number;
  label?: string;
}) {
  const formatted = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  return (
    <span className={styles.cinematicNumber}>
      {label ? <small>{label}</small> : null}
      <strong>
        {prefix}<span className={styles.tabular}>{formatted}</span>{suffix ? <em>{suffix}</em> : null}
      </strong>
    </span>
  );
}
