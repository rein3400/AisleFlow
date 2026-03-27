"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState, useTransition } from "react";

import type { PublicAdminUser } from "@/lib/types";

type EventSummary = Awaited<ReturnType<typeof import("@/lib/domain").listAdminEvents>>[number];

interface HomeClientProps {
  events: EventSummary[];
  user: PublicAdminUser;
}

async function fileToDataUrl(file: File | null) {
  if (!file) {
    return "";
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function AdminHomeClient({ events, user }: HomeClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    brideName: "",
    groomName: "",
    eventDate: "",
    venueName: "",
    welcomeMessage: "Terima kasih sudah hadir dan memilih kursi Anda lebih awal.",
    guestTargetTotal: 300,
    primaryColor: "#9f4f34",
    secondaryColor: "#f4e9da",
    heroImageDataUrl: "",
    backgroundImageDataUrl: "",
    initialSessionLabel: "Sesi 1",
    initialSessionCapacity: 150,
    eventAdminName: "",
    eventAdminEmail: "",
    eventAdminPassword: "",
  });

  const overviewStats = useMemo(() => {
    return {
      totalEvents: events.length,
      totalGuests: events.reduce((sum, item) => sum + item.metrics.totalGuests, 0),
      totalBookings: events.reduce((sum, item) => sum + item.metrics.totalBookings, 0),
    };
  }, [events]);

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    key: "heroImageDataUrl" | "backgroundImageDataUrl",
  ) {
    const file = event.target.files?.[0] ?? null;
    try {
      updateField(key, await fileToDataUrl(file));
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Gagal membaca gambar.",
      });
    }
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        eventId?: string;
      };

      if (!response.ok || !payload.ok || !payload.eventId) {
        setStatus({
          kind: "error",
          message: payload.error ?? "Gagal membuat event baru.",
        });
        return;
      }

      setStatus({
        kind: "success",
        message: "Event berhasil dibuat. Membuka workspace event...",
      });
      router.push(`/admin/events/${payload.eventId}`);
      router.refresh();
    });
  }

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <p className="eyebrow">Platform Console</p>
            <h1 className="display-title">AisleFlow Admin</h1>
            <p className="lede">
              Multi-event command center untuk wedding organizer, lengkap dengan sesi dinamis, QR unik,
              monitoring reservasi real-time, dan booking kursi yang immutable di sisi tamu.
            </p>
            <div className="pill-row">
              <span className="pill">
                Role aktif: <strong>{user.role === "superadmin" ? "Superadmin" : "Event Admin"}</strong>
              </span>
              <span className="pill">{user.email}</span>
            </div>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <div className="metric-label">Total Event</div>
              <p className="metric-value">{overviewStats.totalEvents}</p>
            </article>
            <article className="metric-card">
              <div className="metric-label">Tamu Terdaftar</div>
              <p className="metric-value">{overviewStats.totalGuests}</p>
            </article>
            <article className="metric-card">
              <div className="metric-label">Booking Final</div>
              <p className="metric-value">{overviewStats.totalBookings}</p>
            </article>
          </div>
        </div>
      </section>

      <div className="admin-grid">
        <section className="panel">
          <p className="eyebrow">Event Directory</p>
          <h2 className="section-title">Event yang bisa Anda akses</h2>
          <div className="list">
            {events.length === 0 ? (
              <div className="row-card">
                <div>
                  <strong>Belum ada event.</strong>
                  <p className="muted small">Buat event pertama dari panel di sebelah kanan.</p>
                </div>
              </div>
            ) : null}

            {events.map(({ event, metrics, theme }) => (
              <Link className="row-card" href={`/admin/events/${event.id}`} key={event.id}>
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{event.title}</strong>
                  <span className="muted small">
                    {event.brideName} &amp; {event.groomName}
                  </span>
                  <span className="muted small">
                    {event.eventDate} · {event.venueName}
                  </span>
                </div>

                <div className="stack" style={{ alignItems: "flex-end", gap: 8 }}>
                  <span className="pill" style={{ borderColor: `${theme.primaryColor}33` }}>
                    {metrics.totalBookings}/{metrics.totalGuests} booking
                  </span>
                  <span className="muted small">{metrics.totalInvitationsSent} undangan terkirim</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Create Event</p>
          <h2 className="section-title">Buat event baru</h2>
          {user.role !== "superadmin" ? (
            <div className="status error">Hanya superadmin yang dapat membuat event baru.</div>
          ) : (
            <form className="stack" onSubmit={handleCreateEvent}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="title">Nama Event</label>
                  <input
                    id="title"
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Pernikahan Raka & Dita"
                    value={form.title}
                  />
                </div>

                <div className="field">
                  <label htmlFor="event-date">Tanggal</label>
                  <input
                    id="event-date"
                    onChange={(event) => updateField("eventDate", event.target.value)}
                    type="date"
                    value={form.eventDate}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="bride-name">Nama Pengantin Wanita</label>
                  <input
                    id="bride-name"
                    onChange={(event) => updateField("brideName", event.target.value)}
                    value={form.brideName}
                  />
                </div>

                <div className="field">
                  <label htmlFor="groom-name">Nama Pengantin Pria</label>
                  <input
                    id="groom-name"
                    onChange={(event) => updateField("groomName", event.target.value)}
                    value={form.groomName}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="venue-name">Lokasi</label>
                <input
                  id="venue-name"
                  onChange={(event) => updateField("venueName", event.target.value)}
                  value={form.venueName}
                />
              </div>

              <div className="field">
                <label htmlFor="welcome-message">Pesan Sambutan</label>
                <textarea
                  id="welcome-message"
                  onChange={(event) => updateField("welcomeMessage", event.target.value)}
                  value={form.welcomeMessage}
                />
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="guest-target">Target Total Tamu</label>
                  <input
                    id="guest-target"
                    min={0}
                    onChange={(event) => updateField("guestTargetTotal", Number(event.target.value))}
                    type="number"
                    value={form.guestTargetTotal}
                  />
                </div>

                <div className="field">
                  <label htmlFor="initial-session-label">Sesi Awal</label>
                  <input
                    id="initial-session-label"
                    onChange={(event) => updateField("initialSessionLabel", event.target.value)}
                    value={form.initialSessionLabel}
                  />
                </div>

                <div className="field">
                  <label htmlFor="initial-session-capacity">Kapasitas Sesi Awal</label>
                  <input
                    id="initial-session-capacity"
                    min={0}
                    onChange={(event) => updateField("initialSessionCapacity", Number(event.target.value))}
                    type="number"
                    value={form.initialSessionCapacity}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="primary-color">Warna Utama</label>
                  <input
                    id="primary-color"
                    onChange={(event) => updateField("primaryColor", event.target.value)}
                    type="color"
                    value={form.primaryColor}
                  />
                </div>

                <div className="field">
                  <label htmlFor="secondary-color">Warna Latar Tema</label>
                  <input
                    id="secondary-color"
                    onChange={(event) => updateField("secondaryColor", event.target.value)}
                    type="color"
                    value={form.secondaryColor}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="hero-image">Foto Utama</label>
                  <input id="hero-image" onChange={(event) => void handleImageChange(event, "heroImageDataUrl")} type="file" />
                </div>

                <div className="field">
                  <label htmlFor="background-image">Latar Tambahan</label>
                  <input
                    id="background-image"
                    onChange={(event) => void handleImageChange(event, "backgroundImageDataUrl")}
                    type="file"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="event-admin-name">Nama Event Admin</label>
                  <input
                    id="event-admin-name"
                    onChange={(event) => updateField("eventAdminName", event.target.value)}
                    value={form.eventAdminName}
                  />
                </div>

                <div className="field">
                  <label htmlFor="event-admin-email">Email Event Admin</label>
                  <input
                    id="event-admin-email"
                    onChange={(event) => updateField("eventAdminEmail", event.target.value)}
                    type="email"
                    value={form.eventAdminEmail}
                  />
                </div>

                <div className="field">
                  <label htmlFor="event-admin-password">Password Event Admin</label>
                  <input
                    id="event-admin-password"
                    onChange={(event) => updateField("eventAdminPassword", event.target.value)}
                    type="password"
                    value={form.eventAdminPassword}
                  />
                </div>
              </div>

              {status ? <div className={`status ${status.kind}`}>{status.message}</div> : null}

              <button className="button" disabled={isPending} type="submit">
                {isPending ? "Membuat event..." : "Buat Event"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
