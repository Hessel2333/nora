import styles from "../showroom.module.css";

export function SceneTitle({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <header className={align === "center" ? styles.sceneTitleCenter : styles.sceneTitle}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p className={styles.sceneDescription}>{description}</p> : null}
    </header>
  );
}
