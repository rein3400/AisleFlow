"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { filterGuests, type AdminGuestFilterState } from "@/lib/admin-ui";

type EventWorkspace = Awaited<ReturnType<typeof import("@/lib/domain").getEventWorkspace>>;
type GuestRecord = EventWorkspace["guests"][number];

type Notice = {
  kind: "success" | "error";
  message: string;
} | null;

interface AdminGuestManagementProps {
  workspace: EventWorkspace;
  onRefresh: () => void;
}

function getGuestStatusPill(guest: GuestRecord) {
  if (guest.bookingSeatLabel) {
    return <span className="pill good">{guest.bookingSeatLabel}</span>;
  }

  return <span className="pill">Belum booking</span>;
}

export function AdminGuestManagement({ workspace, onRefresh }: AdminGuestManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
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
  const [filters, setFilters] = useState<AdminGuestFilterState>({
    search: "",
    sessionId: "all",
    inviteStatus: "all",
    activeState: "all",
    bookingState: "all",
  });
  const [resetTarget, setResetTarget] = useState<GuestRecord | null>(null);

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

  const visibleGuests = useMemo(() => filterGuests(workspace.guests, filters), [filters, workspace.guests]);

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

  async function regenerateGuestQr(guest: GuestRecord) {
    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/guests/${guest.id}/qr`, {
        method: "POST",
      });
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
  }

  async function confirmResetBooking() {
    if (!resetTarget) {
      return;
    }

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/guests/${resetTarget.id}/reset-booking`, {
        method: "POST",
      });
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
        message: `Booking ${resetTarget.name} berhasil direset.`,
      });
      setResetTarget(null);
      onRefresh();
    });
  }

  function renderGuestActions(guest: GuestRecord, includeViewLink = true) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <button className="button" disabled={isPending} onClick={() => void saveGuest(guest.id)} type="button">
          Simpan
        </button>
        {includeViewLink ? (
          <Link className="button-ghost" href={`/admin/events/${workspace.event.id}/guests/${guest.id}/qr`}>
            Lihat QR
          </Link>
        ) : null}
        <button className="button-ghost" disabled={isPending} onClick={() => void regenerateGuestQr(guest)} type="button">
          Regenerate QR
        </button>
        <button
          className="button-danger"
          disabled={isPending || !guest.bookingSeatLabel}
          onClick={() => setResetTarget(guest)}
          type="button"
        >
          Reset Booking
        </button>
      </div>
    );
  }

  return (
    <section className="panel stack" id="guests">
      <div className="stack" style={{ gap: 10 }}>
        <div>
          <p className="eyebrow">Guest Management</p>
          <h2 className="section-title">Tamu, status undangan, dan QR</h2>
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-toolbar-input"
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Cari nama tamu"
            value={filters.search}
          />
          <select
            className="admin-toolbar-select"
            onChange={(event) => setFilters((current) => ({ ...current, sessionId: event.target.value }))}
            value={filters.sessionId}
          >
            <option value="all">Semua sesi</option>
            {workspace.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.code} - {session.label}
              </option>
            ))}
          </select>
          <select
            className="admin-toolbar-select"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                inviteStatus: event.target.value as AdminGuestFilterState["inviteStatus"],
              }))
            }
            value={filters.inviteStatus}
          >
            <option value="all">Semua undangan</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
          </select>
          <select
            className="admin-toolbar-select"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                activeState: event.target.value as AdminGuestFilterState["activeState"],
              }))
            }
            value={filters.activeState}
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <select
            className="admin-toolbar-select"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                bookingState: event.target.value as AdminGuestFilterState["bookingState"],
              }))
            }
            value={filters.bookingState}
          >
            <option value="all">Semua booking</option>
            <option value="booked">Sudah booking</option>
            <option value="unbooked">Belum booking</option>
          </select>
          <button
            className="button-ghost"
            onClick={() =>
              setFilters({
                search: "",
                sessionId: "all",
                inviteStatus: "all",
                activeState: "all",
                bookingState: "all",
              })
            }
            type="button"
          >
            Reset Filter
          </button>
        </div>

        <div className="admin-toolbar-meta">
          <span className="small muted">{visibleGuests.length} tamu ditampilkan</span>
        </div>
      </div>

      {notice ? <div className={`status ${notice.kind}`}>{notice.message}</div> : null}

      <div className="admin-split-grid">
        <form className="panel admin-subpanel stack" onSubmit={createManualGuest}>
          <h3 className="section-title" style={{ fontSize: "1.1rem" }}>
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

        <div className="panel admin-subpanel stack">
          <h3 className="section-title" style={{ fontSize: "1.1rem" }}>
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
      </div>

      <div className="admin-table-wrap">
        <table className="table admin-guest-table">
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
            {visibleGuests.map((guest) => {
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
                  <td>{getGuestStatusPill(guest)}</td>
                  <td>
                    <Link className="button-ghost" href={`/admin/events/${workspace.event.id}/guests/${guest.id}/qr`}>
                      Lihat QR
                    </Link>
                  </td>
                  <td>{renderGuestActions(guest, false)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-guest-cards">
        {visibleGuests.map((guest) => {
          const draft = guestDrafts[guest.id];

          return (
            <article className="row-card admin-guest-card" key={guest.id}>
              <div className="stack" style={{ gap: 8 }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{guest.name}</strong>
                  <span className="muted small">{guest.sessionLabel}</span>
                </div>

                <div className="pill-row">
                  <span className="pill">{guest.inviteStatus === "sent" ? "Undangan terkirim" : "Undangan pending"}</span>
                  <span className={`pill ${guest.isActive ? "good" : "bad"}`}>{guest.isActive ? "Aktif" : "Nonaktif"}</span>
                  {getGuestStatusPill(guest)}
                </div>
              </div>

              <div className="stack" style={{ gap: 12 }}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor={`guest-name-card-${guest.id}`}>Nama</label>
                    <input
                      id={`guest-name-card-${guest.id}`}
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
                  </div>
                  <div className="field">
                    <label htmlFor={`guest-session-card-${guest.id}`}>Sesi</label>
                    <select
                      id={`guest-session-card-${guest.id}`}
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
                  </div>
                  <div className="field">
                    <label htmlFor={`guest-invite-card-${guest.id}`}>Undangan</label>
                    <select
                      id={`guest-invite-card-${guest.id}`}
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
                  </div>
                  <div className="field">
                    <label htmlFor={`guest-active-card-${guest.id}`}>Status</label>
                    <select
                      id={`guest-active-card-${guest.id}`}
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
                  </div>
                </div>

                {renderGuestActions(guest)}
              </div>
            </article>
          );
        })}
      </div>

      <AdminConfirmDialog
        busy={isPending}
        confirmLabel="Reset booking"
        message={
          resetTarget
            ? `Kursi final untuk ${resetTarget.name} akan dibuka kembali dan tamu perlu memilih ulang kursinya.`
            : ""
        }
        onClose={() => setResetTarget(null)}
        onConfirm={() => void confirmResetBooking()}
        open={Boolean(resetTarget)}
        title={resetTarget ? `Reset booking ${resetTarget.name}?` : "Reset booking?"}
        tone="danger"
      />
    </section>
  );
}
