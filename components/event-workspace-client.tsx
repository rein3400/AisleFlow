"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

type EventWorkspace = Awaited<ReturnType<typeof import("@/lib/domain").getEventWorkspace>>;

interface EventWorkspaceClientProps {
  workspace: EventWorkspace;
}

type Notice = {
  kind: "success" | "error";
  message: string;
} | null;

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

function GuestSummaryTable({
  workspace,
  onRefresh,
  setNotice,
}: {
  workspace: EventWorkspace;
  onRefresh: () => void;
  setNotice: (notice: Notice) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [guestDrafts, setGuestDrafts] = useState(() =>
    Object.fromEntries(
      workspace.guests.map((guest) => [
        guest.id,
        {
          name: guest.name,
          sessionId: guest.sessionId,
          inviteStatus: guest.inviteStatus,
          isActive: guest.isActive,
        },
      ]),
    ),
  );
  const [manualGuest, setManualGuest] = useState({
    name: "",
    sessionId: workspace.sessions[0]?.id ?? "",
    inviteStatus: "pending" as "pending" | "sent",
    isActive: true,
  });
  const [importSummary, setImportSummary] = useState<{
    createdCount: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    setGuestDrafts(
      Object.fromEntries(
        workspace.guests.map((guest) => [
          guest.id,
          {
            name: guest.name,
            sessionId: guest.sessionId,
            inviteStatus: guest.inviteStatus,
            isActive: guest.isActive,
          },
        ]),
      ),
    );
    setManualGuest((current) => ({
      ...current,
      sessionId: current.sessionId || workspace.sessions[0]?.id || "",
    }));
  }, [workspace.guests, workspace.sessions]);

  async function saveGuest(guestId: string) {
    const draft = guestDrafts[guestId];
    if (!draft) {
      return;
    }

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/guests/${guestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal memperbarui tamu.",
        });
        return;
      }

      setNotice({
        kind: "success",
        message: "Data tamu berhasil diperbarui.",
      });
      onRefresh();
    });
  }

  async function createManualGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/guests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(manualGuest),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal menambah tamu.",
        });
        return;
      }

      setManualGuest({
        name: "",
        sessionId: workspace.sessions[0]?.id ?? "",
        inviteStatus: "pending",
        isActive: true,
      });
      setNotice({
        kind: "success",
        message: "Tamu baru berhasil ditambahkan.",
      });
      onRefresh();
    });
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      setNotice(null);
      setImportSummary(null);

      const response = await fetch(`/api/admin/events/${workspace.event.id}/guests/import`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        createdCount?: number;
        errors?: string[];
      };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Impor tamu gagal.",
        });
        return;
      }

      setImportSummary({
        createdCount: payload.createdCount ?? 0,
        errors: payload.errors ?? [],
      });
      setNotice({
        kind: "success",
        message: "Proses impor selesai.",
      });
      onRefresh();
    });
  }

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Guest Management</p>
        <h2 className="section-title">Tamu, status undangan, dan QR</h2>
      </div>

      <form className="panel stack" onSubmit={createManualGuest}>
        <h3 className="section-title" style={{ fontSize: "1.15rem" }}>
          Tambah tamu manual
        </h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="guest-name">Nama tamu</label>
            <input
              id="guest-name"
              onChange={(event) => setManualGuest((current) => ({ ...current, name: event.target.value }))}
              value={manualGuest.name}
            />
          </div>
          <div className="field">
            <label htmlFor="guest-session">Sesi</label>
            <select
              id="guest-session"
              onChange={(event) =>
                setManualGuest((current) => ({ ...current, sessionId: event.target.value }))
              }
              value={manualGuest.sessionId}
            >
              {workspace.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.code} - {session.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="guest-invite-status">Status undangan</label>
            <select
              id="guest-invite-status"
              onChange={(event) =>
                setManualGuest((current) => ({
                  ...current,
                  inviteStatus: event.target.value as "pending" | "sent",
                }))
              }
              value={manualGuest.inviteStatus}
            >
              <option value="pending">Belum terkirim</option>
              <option value="sent">Terkirim</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="guest-active">Status aktif</label>
            <select
              id="guest-active"
              onChange={(event) =>
                setManualGuest((current) => ({
                  ...current,
                  isActive: event.target.value === "true",
                }))
              }
              value={String(manualGuest.isActive)}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>
        <button className="button" disabled={isPending} type="submit">
          {isPending ? "Menyimpan..." : "Tambah Tamu"}
        </button>
      </form>

      <div className="panel stack">
        <h3 className="section-title" style={{ fontSize: "1.15rem" }}>
          Impor CSV / Excel
        </h3>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="guest-import">Kolom minimum: nama tamu, sesi, status aktif, status undangan terkirim</label>
          <input id="guest-import" onChange={(event) => void handleImport(event)} type="file" />
        </div>
        {importSummary ? (
          <div className="stack">
            <div className="status success">{importSummary.createdCount} tamu berhasil diimpor.</div>
            {importSummary.errors.length ? (
              <div className="status error">
                {importSummary.errors.map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Sesi</th>
              <th>Undangan</th>
              <th>Status</th>
              <th>Booking</th>
              <th>QR</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {workspace.guests.map((guest) => {
              const draft = guestDrafts[guest.id];

              return (
                <tr key={guest.id}>
                  <td>
                    <input
                      onChange={(event) =>
                        setGuestDrafts((current) => ({
                          ...current,
                          [guest.id]: {
                            ...current[guest.id],
                            name: event.target.value,
                          },
                        }))
                      }
                      value={draft?.name ?? guest.name}
                    />
                  </td>
                  <td>
                    <select
                      onChange={(event) =>
                        setGuestDrafts((current) => ({
                          ...current,
                          [guest.id]: {
                            ...current[guest.id],
                            sessionId: event.target.value,
                          },
                        }))
                      }
                      value={draft?.sessionId ?? guest.sessionId}
                    >
                      {workspace.sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.code} - {session.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      onChange={(event) =>
                        setGuestDrafts((current) => ({
                          ...current,
                          [guest.id]: {
                            ...current[guest.id],
                            inviteStatus: event.target.value as "pending" | "sent",
                          },
                        }))
                      }
                      value={draft?.inviteStatus ?? guest.inviteStatus}
                    >
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                    </select>
                  </td>
                  <td>
                    <select
                      onChange={(event) =>
                        setGuestDrafts((current) => ({
                          ...current,
                          [guest.id]: {
                            ...current[guest.id],
                            isActive: event.target.value === "true",
                          },
                        }))
                      }
                      value={String(draft?.isActive ?? guest.isActive)}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </td>
                  <td>
                    {guest.bookingSeatLabel ? (
                      <span className="pill good">{guest.bookingSeatLabel}</span>
                    ) : (
                      <span className="pill">Belum booking</span>
                    )}
                  </td>
                  <td>
                    <div className="stack" style={{ gap: 8 }}>
                      <Link
                        className="button-ghost"
                        href={`/admin/events/${workspace.event.id}/guests/${guest.id}/qr`}
                      >
                        Lihat QR
                      </Link>
                      <button
                        className="button-ghost"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            const response = await fetch(
                              `/api/admin/events/${workspace.event.id}/guests/${guest.id}/qr`,
                              {
                                method: "POST",
                              },
                            );
                            const payload = (await response.json()) as { ok?: boolean; error?: string };

                            if (!response.ok || !payload.ok) {
                              setNotice({
                                kind: "error",
                                message: payload.error ?? "Gagal membuat ulang QR.",
                              });
                              return;
                            }

                            setNotice({
                              kind: "success",
                              message: `QR untuk ${guest.name} berhasil diganti.`,
                            });
                            onRefresh();
                          });
                        }}
                        type="button"
                      >
                        Regenerate
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="stack" style={{ gap: 8 }}>
                      <button
                        className="button"
                        disabled={isPending}
                        onClick={() => void saveGuest(guest.id)}
                        type="button"
                      >
                        Simpan
                      </button>
                      <button
                        className="button-danger"
                        disabled={isPending}
                        onClick={() => {
                          if (!window.confirm("Reset booking tamu ini? Kursi final akan dibuka kembali.")) {
                            return;
                          }

                          startTransition(async () => {
                            const response = await fetch(
                              `/api/admin/events/${workspace.event.id}/guests/${guest.id}/reset-booking`,
                              {
                                method: "POST",
                              },
                            );
                            const payload = (await response.json()) as { ok?: boolean; error?: string };

                            if (!response.ok || !payload.ok) {
                              setNotice({
                                kind: "error",
                                message: payload.error ?? "Reset booking gagal.",
                              });
                              return;
                            }

                            setNotice({
                              kind: "success",
                              message: `Booking ${guest.name} berhasil direset.`,
                            });
                            onRefresh();
                          });
                        }}
                        type="button"
                      >
                        Reset Booking
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function EventWorkspaceClient({ workspace }: EventWorkspaceClientProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const [metrics, setMetrics] = useState(workspace.metrics);
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
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventForm),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal menyimpan pengaturan event.",
        });
        return;
      }

      setNotice({
        kind: "success",
        message: "Pengaturan event berhasil disimpan.",
      });
      refreshPage();
    });
  }

  async function saveTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/theme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(themeForm),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal menyimpan tema.",
        });
        return;
      }

      setNotice({
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
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Gagal membaca gambar.",
      });
    }
  }

  async function handleNewSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSession),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal membuat sesi baru.",
        });
        return;
      }

      setNewSession({
        label: `Sesi ${workspace.sessions.length + 2}`,
        capacity: 50,
      });
      setNotice({
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
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal memperbarui sesi.",
        });
        return;
      }

      setNotice({
        kind: "success",
        message: "Sesi berhasil diperbarui.",
      });
      refreshPage();
    });
  }

  async function removeSession(sessionId: string) {
    if (!window.confirm("Hapus sesi ini? Operasi akan ditolak bila masih ada tamu, lock, atau booking.")) {
      return;
    }

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal menghapus sesi.",
        });
        return;
      }

      setNotice({
        kind: "success",
        message: "Sesi berhasil dihapus.",
      });
      refreshPage();
    });
  }

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <p className="eyebrow">Event Workspace</p>
            <h1 className="display-title">{workspace.event.title}</h1>
            <p className="lede">
              {workspace.event.brideName} &amp; {workspace.event.groomName} · {workspace.event.eventDate}
            </p>
            <p className="muted">{workspace.event.venueName}</p>
            <div className="pill-row">
              <span className="pill">Target tamu: {workspace.event.guestTargetTotal}</span>
              <span className="pill">Session count: {workspace.sessions.length}</span>
              <span className="pill good">Booking final: {metrics.totalBookings}</span>
            </div>
            {notice ? <div className={`status ${notice.kind}`}>{notice.message}</div> : null}
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
              <div className="stack" style={{ justifyContent: "flex-end", height: "100%", padding: 24, color: "#fffaf4" }}>
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

      <section className="panel stack">
        <p className="eyebrow">Realtime Monitoring</p>
        <h2 className="section-title">Dashboard reservasi</h2>
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

        <div className="list">
          {metrics.sessions.map((session) => (
            <div className="row-card" key={session.sessionId}>
              <div className="stack" style={{ gap: 5 }}>
                <strong>
                  {session.code} · {session.label}
                </strong>
                <span className="muted small">
                  Kapasitas {session.capacity} · Dialokasikan {session.allocatedGuests} tamu
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

        {almostOrFullSessions.length ? (
          <div className="status error">
            Perhatian: {almostOrFullSessions.map((session) => `${session.code} ${session.label}`).join(", ")} sedang penuh atau hampir penuh.
          </div>
        ) : null}
      </section>

      <div className="event-grid">
        <div className="stack">
          <form className="panel stack" onSubmit={saveEventSettings}>
            <div>
              <p className="eyebrow">Event Settings</p>
              <h2 className="section-title">Konfigurasi acara</h2>
            </div>

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

          <form className="panel stack" onSubmit={saveTheme}>
            <div>
              <p className="eyebrow">White Label</p>
              <h2 className="section-title">Tema event</h2>
            </div>

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
                  onChange={(event) =>
                    setThemeForm((current) => ({ ...current, secondaryColor: event.target.value }))
                  }
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

          <GuestSummaryTable onRefresh={refreshPage} setNotice={setNotice} workspace={workspace} />
        </div>

        <div className="stack">
          <section className="panel stack">
            <div>
              <p className="eyebrow">Session Control</p>
              <h2 className="section-title">Kapasitas dan sesi</h2>
            </div>

            <form className="panel stack" onSubmit={handleNewSession}>
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
                <div className="row-card" key={session.id} style={{ flexDirection: "column" }}>
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
                      onClick={() => void removeSession(session.id)}
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
      </div>
    </div>
  );
}
