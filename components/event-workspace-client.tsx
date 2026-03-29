"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminGuestManagement } from "@/components/admin-guest-management";

type EventWorkspace = Awaited<ReturnType<typeof import("@/lib/domain").getEventWorkspace>>;

type Notice = {
  kind: "success" | "error";
  message: string;
} | null;

interface EventWorkspaceClientProps {
  workspace: EventWorkspace;
}

async function fileToDataUrl(file: File | null) {
  if (!file) {
    return "";
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca gambar."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function EventWorkspaceClient({ workspace }: EventWorkspaceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [metrics, setMetrics] = useState(workspace.metrics);
  const [eventNotice, setEventNotice] = useState<Notice>(null);
  const [themeNotice, setThemeNotice] = useState<Notice>(null);
  const [sessionNotice, setSessionNotice] = useState<Notice>(null);
  const [eventForm, setEventForm] = useState({
    title: workspace.event.title,
    brideName: workspace.event.brideName,
    groomName: workspace.event.groomName,
    eventDate: workspace.event.eventDate,
    venueName: workspace.event.venueName,
    welcomeMessage: workspace.event.welcomeMessage,
    guestTargetTotal: workspace.event.guestTargetTotal,
  });
  const [themeForm, setThemeForm] = useState({
    primaryColor: workspace.theme.primaryColor,
    secondaryColor: workspace.theme.secondaryColor,
    heroImageDataUrl: workspace.theme.heroImageDataUrl,
    backgroundImageDataUrl: workspace.theme.backgroundImageDataUrl,
  });
  const [newSession, setNewSession] = useState({
    label: `Sesi ${workspace.sessions.length + 1}`,
    capacity: 50,
  });
  const [sessionDrafts, setSessionDrafts] = useState(() =>
    Object.fromEntries(
      workspace.sessions.map((session) => [
        session.id,
        {
          label: session.label,
          capacity: session.capacity,
        },
      ]),
    ),
  );
  const [removeSessionTarget, setRemoveSessionTarget] = useState<EventWorkspace["sessions"][number] | null>(null);

  useEffect(() => {
    setEventForm({
      title: workspace.event.title,
      brideName: workspace.event.brideName,
      groomName: workspace.event.groomName,
      eventDate: workspace.event.eventDate,
      venueName: workspace.event.venueName,
      welcomeMessage: workspace.event.welcomeMessage,
      guestTargetTotal: workspace.event.guestTargetTotal,
    });
    setThemeForm({
      primaryColor: workspace.theme.primaryColor,
      secondaryColor: workspace.theme.secondaryColor,
      heroImageDataUrl: workspace.theme.heroImageDataUrl,
      backgroundImageDataUrl: workspace.theme.backgroundImageDataUrl,
    });
    setSessionDrafts(
      Object.fromEntries(
        workspace.sessions.map((session) => [
          session.id,
          {
            label: session.label,
            capacity: session.capacity,
          },
        ]),
      ),
    );
    setMetrics(workspace.metrics);
  }, [workspace]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/admin/events/${workspace.event.id}/dashboard`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        metrics?: typeof workspace.metrics;
      };

      if (response.ok && payload.ok && payload.metrics) {
        setMetrics(payload.metrics);
      }
    }, 7000);

    return () => window.clearInterval(interval);
  }, [workspace.event.id, workspace.metrics]);

  const almostOrFullSessions = useMemo(
    () => metrics.sessions.filter((session) => session.isAlmostFull || session.isFull),
    [metrics.sessions],
  );

  function refreshPage() {
    router.refresh();
  }

  async function saveEventSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setEventNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventForm),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setEventNotice({
          kind: "error",
          message: payload.error ?? "Gagal menyimpan pengaturan event.",
        });
        return;
      }

      setEventNotice({
        kind: "success",
        message: "Pengaturan event berhasil disimpan.",
      });
      refreshPage();
    });
  }

  async function saveTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setThemeNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/theme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(themeForm),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setThemeNotice({
          kind: "error",
          message: payload.error ?? "Gagal menyimpan tema.",
        });
        return;
      }

      setThemeNotice({
        kind: "success",
        message: "Tema event berhasil diperbarui.",
      });
      refreshPage();
    });
  }

  async function changeThemeImage(
    event: ChangeEvent<HTMLInputElement>,
    key: "heroImageDataUrl" | "backgroundImageDataUrl",
  ) {
    const file = event.target.files?.[0] ?? null;
    try {
      const dataUrl = await fileToDataUrl(file);
      setThemeForm((current) => ({
        ...current,
        [key]: dataUrl,
      }));
    } catch (error) {
      setThemeNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Gagal membaca gambar.",
      });
    }
  }

  async function handleNewSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setSessionNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSession),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setSessionNotice({
          kind: "error",
          message: payload.error ?? "Gagal membuat sesi baru.",
        });
        return;
      }

      setNewSession({
        label: `Sesi ${workspace.sessions.length + 2}`,
        capacity: 50,
      });
      setSessionNotice({
        kind: "success",
        message: "Sesi baru berhasil ditambahkan.",
      });
      refreshPage();
    });
  }

  async function saveSession(sessionId: string) {
    const draft = sessionDrafts[sessionId];
    if (!draft) {
      return;
    }

    startTransition(async () => {
      setSessionNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setSessionNotice({
          kind: "error",
          message: payload.error ?? "Gagal memperbarui sesi.",
        });
        return;
      }

      setSessionNotice({
        kind: "success",
        message: "Sesi berhasil diperbarui.",
      });
      refreshPage();
    });
  }

  async function confirmRemoveSession() {
    if (!removeSessionTarget) {
      return;
    }

    startTransition(async () => {
      setSessionNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/sessions/${removeSessionTarget.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setSessionNotice({
          kind: "error",
          message: payload.error ?? "Gagal menghapus sesi.",
        });
        return;
      }

      setSessionNotice({
        kind: "success",
        message: "Sesi berhasil dihapus.",
      });
      setRemoveSessionTarget(null);
      refreshPage();
    });
  }

  return (
    <div className="stack">
      <section className="hero-card" id="overview">
        <div className="hero-grid">
          <div className="stack">
            <p className="eyebrow">Event Workspace</p>
            <h1 className="display-title">{workspace.event.title}</h1>
            <p className="lede">
              {workspace.event.brideName} &amp; {workspace.event.groomName} | {workspace.event.eventDate}
            </p>
            <p className="muted">{workspace.event.venueName}</p>
            <div className="pill-row">
              <span className="pill">Target tamu: {workspace.event.guestTargetTotal}</span>
              <span className="pill">Jumlah sesi: {workspace.sessions.length}</span>
              <span className="pill good">Booking final: {metrics.totalBookings}</span>
              <span className="pill">Sisa kursi: {metrics.totalRemainingSeats}</span>
            </div>
          </div>
          <div
            className="theme-preview"
            style={{
              background: `linear-gradient(135deg, ${themeForm.primaryColor}, ${themeForm.secondaryColor})`,
            }}
          >
            {themeForm.heroImageDataUrl ? (
              <img alt="Tema event" src={themeForm.heroImageDataUrl} />
            ) : (
              <div className="stack admin-theme-placeholder">
                <p className="eyebrow" style={{ color: "rgba(255,250,244,0.8)" }}>
                  Theme Preview
                </p>
                <h2 className="section-title" style={{ color: "#fffaf4" }}>
                  White-label invitation experience
                </h2>
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="panel admin-section-nav">
        <a href="#overview">Overview</a>
        <a href="#guests">Guests</a>
        <a href="#sessions">Sessions</a>
        <a href="#theme">Theme</a>
        <a href="#settings">Settings</a>
      </nav>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Realtime Monitoring</p>
          <h2 className="section-title">Dashboard reservasi</h2>
        </div>
        <div className="metric-grid">
          <article className="metric-card">
            <div className="metric-label">Total tamu</div>
            <p className="metric-value">{metrics.totalGuests}</p>
          </article>
          <article className="metric-card">
            <div className="metric-label">Undangan terkirim</div>
            <p className="metric-value">{metrics.totalInvitationsSent}</p>
          </article>
          <article className="metric-card">
            <div className="metric-label">Booking final</div>
            <p className="metric-value">{metrics.totalBookings}</p>
          </article>
          <article className="metric-card">
            <div className="metric-label">Sisa kursi</div>
            <p className="metric-value">{metrics.totalRemainingSeats}</p>
          </article>
        </div>

        {almostOrFullSessions.length ? (
          <div className="admin-alert-summary">
            <strong>Perlu perhatian:</strong>
            <div className="pill-row">
              {almostOrFullSessions.map((session) => (
                <span className={`pill ${session.isFull ? "bad" : "warn"}`} key={session.sessionId}>
                  {session.code} {session.label} {session.isFull ? "penuh" : `${session.remainingSeats} tersisa`}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="list">
          {metrics.sessions.map((session) => (
            <div className="row-card" key={session.sessionId}>
              <div className="stack" style={{ gap: 5 }}>
                <strong>
                  {session.code} | {session.label}
                </strong>
                <span className="muted small">
                  Kapasitas {session.capacity} | Dialokasikan {session.allocatedGuests} tamu
                </span>
              </div>

              <div className="pill-row">
                <span className="pill">{session.bookedSeats} booking</span>
                <span className={`pill ${session.isFull ? "bad" : session.isAlmostFull ? "warn" : "good"}`}>
                  {session.isFull
                    ? "Penuh"
                    : session.isAlmostFull
                      ? `Hampir penuh (${session.remainingSeats} tersisa)`
                      : `${session.remainingSeats} tersisa`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AdminGuestManagement onRefresh={refreshPage} workspace={workspace} />

      <div className="event-grid">
        <div className="stack">
          <section className="panel stack" id="sessions">
            <div>
              <p className="eyebrow">Session Control</p>
              <h2 className="section-title">Kapasitas dan sesi</h2>
            </div>

            {sessionNotice ? <div className={`status ${sessionNotice.kind}`}>{sessionNotice.message}</div> : null}

            <form className="panel admin-subpanel stack" onSubmit={handleNewSession}>
              <div className="field">
                <label htmlFor="new-session-label">Label sesi baru</label>
                <input
                  id="new-session-label"
                  onChange={(event) => setNewSession((current) => ({ ...current, label: event.target.value }))}
                  value={newSession.label}
                />
              </div>
              <div className="field">
                <label htmlFor="new-session-capacity">Kapasitas</label>
                <input
                  id="new-session-capacity"
                  min={0}
                  onChange={(event) =>
                    setNewSession((current) => ({ ...current, capacity: Number(event.target.value) }))
                  }
                  type="number"
                  value={newSession.capacity}
                />
              </div>
              <button className="button" disabled={isPending} type="submit">
                {isPending ? "Menambah..." : "Tambah Sesi"}
              </button>
            </form>

            {workspace.sessions.map((session) => {
              const metric = metrics.sessions.find((item) => item.sessionId === session.id);
              const draft = sessionDrafts[session.id];

              return (
                <div className="row-card admin-session-card" key={session.id}>
                  <div className="pill-row">
                    <span className="pill">{session.code}</span>
                    {metric ? (
                      <span className={`pill ${metric.isFull ? "bad" : metric.isAlmostFull ? "warn" : "good"}`}>
                        {metric.bookedSeats}/{metric.capacity} terisi
                      </span>
                    ) : null}
                  </div>

                  <div className="field">
                    <label htmlFor={`session-label-${session.id}`}>Label</label>
                    <input
                      id={`session-label-${session.id}`}
                      onChange={(event) =>
                        setSessionDrafts((current) => ({
                          ...current,
                          [session.id]: {
                            ...current[session.id],
                            label: event.target.value,
                          },
                        }))
                      }
                      value={draft?.label ?? session.label}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`session-capacity-${session.id}`}>Kapasitas</label>
                    <input
                      id={`session-capacity-${session.id}`}
                      min={0}
                      onChange={(event) =>
                        setSessionDrafts((current) => ({
                          ...current,
                          [session.id]: {
                            ...current[session.id],
                            capacity: Number(event.target.value),
                          },
                        }))
                      }
                      type="number"
                      value={draft?.capacity ?? session.capacity}
                    />
                  </div>

                  <div className="inline-actions">
                    <button className="button" disabled={isPending} onClick={() => void saveSession(session.id)} type="button">
                      Simpan
                    </button>
                    <button
                      className="button-danger"
                      disabled={isPending}
                      onClick={() => setRemoveSessionTarget(session)}
                      type="button"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="panel stack">
            <div>
              <p className="eyebrow">Audit Trail</p>
              <h2 className="section-title">Aktivitas terbaru</h2>
            </div>
            <div className="list">
              {workspace.recentAuditLogs.map((log) => (
                <div className="row-card" key={log.id}>
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{log.action}</strong>
                    <span className="muted small">{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <form className="panel stack" id="theme" onSubmit={saveTheme}>
            <div>
              <p className="eyebrow">White Label</p>
              <h2 className="section-title">Tema event</h2>
            </div>

            {themeNotice ? <div className={`status ${themeNotice.kind}`}>{themeNotice.message}</div> : null}

            <div className="form-grid">
              <div className="field">
                <label htmlFor="theme-primary">Warna utama</label>
                <input
                  id="theme-primary"
                  onChange={(event) => setThemeForm((current) => ({ ...current, primaryColor: event.target.value }))}
                  type="color"
                  value={themeForm.primaryColor}
                />
              </div>
              <div className="field">
                <label htmlFor="theme-secondary">Warna sekunder</label>
                <input
                  id="theme-secondary"
                  onChange={(event) => setThemeForm((current) => ({ ...current, secondaryColor: event.target.value }))}
                  type="color"
                  value={themeForm.secondaryColor}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="theme-hero-file">Foto utama</label>
                <input id="theme-hero-file" onChange={(event) => void changeThemeImage(event, "heroImageDataUrl")} type="file" />
              </div>
              <div className="field">
                <label htmlFor="theme-bg-file">Gambar latar</label>
                <input
                  id="theme-bg-file"
                  onChange={(event) => void changeThemeImage(event, "backgroundImageDataUrl")}
                  type="file"
                />
              </div>
            </div>

            <button className="button" disabled={isPending} type="submit">
              {isPending ? "Menyimpan tema..." : "Simpan Tema"}
            </button>
          </form>

          <form className="panel stack" id="settings" onSubmit={saveEventSettings}>
            <div>
              <p className="eyebrow">Event Settings</p>
              <h2 className="section-title">Konfigurasi acara</h2>
            </div>

            {eventNotice ? <div className={`status ${eventNotice.kind}`}>{eventNotice.message}</div> : null}

            <div className="form-grid">
              <div className="field">
                <label htmlFor="event-title">Nama event</label>
                <input
                  id="event-title"
                  onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  value={eventForm.title}
                />
              </div>
              <div className="field">
                <label htmlFor="event-date-form">Tanggal</label>
                <input
                  id="event-date-form"
                  onChange={(event) => setEventForm((current) => ({ ...current, eventDate: event.target.value }))}
                  type="date"
                  value={eventForm.eventDate}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="event-bride">Pengantin wanita</label>
                <input
                  id="event-bride"
                  onChange={(event) => setEventForm((current) => ({ ...current, brideName: event.target.value }))}
                  value={eventForm.brideName}
                />
              </div>
              <div className="field">
                <label htmlFor="event-groom">Pengantin pria</label>
                <input
                  id="event-groom"
                  onChange={(event) => setEventForm((current) => ({ ...current, groomName: event.target.value }))}
                  value={eventForm.groomName}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="event-venue">Lokasi</label>
                <input
                  id="event-venue"
                  onChange={(event) => setEventForm((current) => ({ ...current, venueName: event.target.value }))}
                  value={eventForm.venueName}
                />
              </div>
              <div className="field">
                <label htmlFor="event-target">Target total tamu</label>
                <input
                  id="event-target"
                  min={0}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      guestTargetTotal: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={eventForm.guestTargetTotal}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="event-message">Pesan sambutan</label>
              <textarea
                id="event-message"
                onChange={(event) => setEventForm((current) => ({ ...current, welcomeMessage: event.target.value }))}
                value={eventForm.welcomeMessage}
              />
            </div>

            <button className="button" disabled={isPending} type="submit">
              {isPending ? "Menyimpan..." : "Simpan Event"}
            </button>
          </form>
        </div>
      </div>

      <AdminConfirmDialog
        busy={isPending}
        confirmLabel="Hapus sesi"
        message={
          removeSessionTarget
            ? `Sesi ${removeSessionTarget.code} - ${removeSessionTarget.label} akan dihapus bila tidak memiliki tamu, lock, atau booking aktif.`
            : ""
        }
        onClose={() => setRemoveSessionTarget(null)}
        onConfirm={() => void confirmRemoveSession()}
        open={Boolean(removeSessionTarget)}
        title={removeSessionTarget ? `Hapus ${removeSessionTarget.label}?` : "Hapus sesi?"}
        tone="danger"
      />
    </div>
  );
}
