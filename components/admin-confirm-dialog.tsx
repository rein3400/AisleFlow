"use client";

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "default" | "danger";
  onClose: () => void;
  onConfirm: () => void;
}

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Batal",
  busy = false,
  tone = "default",
  onClose,
  onConfirm,
}: AdminConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="admin-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className="admin-dialog-card stack"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="stack" style={{ gap: 8 }}>
          <p className="eyebrow">Konfirmasi Aksi</p>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {title}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {message}
          </p>
        </div>

        <div className="inline-actions">
          <button className="button-ghost" disabled={busy} onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button
            className={tone === "danger" ? "button-danger" : "button"}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
