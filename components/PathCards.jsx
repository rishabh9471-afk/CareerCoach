import styles from "./PathCards.module.css";

const ACCENTS = ["purple", "teal", "coral"];

export default function PathCards({ data, round, onChoose, onRegenerate, canRegenerate, regenLoading }) {
  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>
        {round === 1 ? "3 career paths for you" : "3 alternative paths"}
      </p>
      {data.intro && <p className={styles.intro}>{data.intro}</p>}

      <div className={styles.cards}>
        {data.paths.map((path, i) => {
          const fitClass = path.fit?.toLowerCase().includes("high")
            ? styles.fitHigh
            : path.fit?.toLowerCase().includes("strong")
            ? styles.fitStrong
            : styles.fitWorth;

          return (
            <div key={i} className={`${styles.card} ${styles["accent_" + ACCENTS[i]]}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{path.title}</span>
                <span className={`${styles.fitBadge} ${fitClass}`}>{path.fit}</span>
              </div>
              <p className={styles.cardDesc}>{path.description}</p>
              <div className={styles.tags}>
                {(path.tags || []).map((tag, j) => (
                  <span key={j} className={styles.tag}>{tag}</span>
                ))}
              </div>
              <button className={styles.chooseBtn} onClick={() => onChoose(path.title)}>
                Choose this path →
              </button>
            </div>
          );
        })}
      </div>

      {canRegenerate ? (
        <button
          className={styles.regenBtn}
          onClick={onRegenerate}
          disabled={regenLoading}
        >
          {regenLoading ? (
            <span className={styles.regenLoading}>
              <span className={styles.regenSpinner} />
              Finding alternative paths…
            </span>
          ) : (
            "These don't resonate — show me 3 different paths ↻"
          )}
        </button>
      ) : (
        <div className={styles.maxReached}>
          <p>
            <strong>You&apos;ve seen all recommended paths.</strong> These 6 paths were drawn from two rounds of analysis based on your background. Select one above, or start over with a different resume.
          </p>
        </div>
      )}
    </div>
  );
}
