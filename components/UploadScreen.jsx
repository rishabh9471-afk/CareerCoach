import { useState, useRef } from "react";
import styles from "./UploadScreen.module.css";

export default function UploadScreen({ onStart }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  async function handleStart() {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/analyse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      onStart(data.message, file.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <div className={styles.logoMark}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className={styles.title}>Your next move starts here</h1>
        <p className={styles.subtitle}>
          Upload your resume and get a sharp, personalised read on where your career should go next — in one focused conversation.
        </p>

        <div
          className={`${styles.dropZone} ${dragging ? styles.dragOver : ""} ${file ? styles.hasFile : ""}`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className={styles.dropIcon}>
            {file ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
          {file ? (
            <>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.dropHint}>Click to replace</p>
            </>
          ) : (
            <>
              <p className={styles.dropMain}><strong>Drop your resume here</strong> or click to browse</p>
              <p className={styles.dropHint}>PDF only · Max 5MB</p>
            </>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.startBtn}
          onClick={handleStart}
          disabled={!file || loading}
        >
          {loading ? (
            <span className={styles.btnLoading}>
              <span className={styles.spinner} />
              Analysing your resume…
            </span>
          ) : (
            "Analyse my resume →"
          )}
        </button>

        <p className={styles.disclaimer}>
          Your resume is processed securely and not stored.
        </p>
      </div>
    </div>
  );
}
