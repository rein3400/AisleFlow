"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { filterAndSortAdminEvents } from "@/lib/admin-ui";

type EventSummary = Awaited<ReturnType<typeof import("@/lib/domain").listAdminEvents>>[number];

interface AdminEventSwitcherProps {
  events: EventSummary[];
}

export function AdminEventSwitcher({ events }: AdminEventSwitcherProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentEventId = useMemo(() => {
    const match = pathname.match(/^\/admin\/events\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const currentEvent = events.find((item) => item.event.id === currentEventId) ?? null;
  const visibleEvents = useMemo(
    () => filterAndSortAdminEvents(events, { search, sort: "event-date" }),
    [events, search],
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="admin-event-switcher">
      <button
        aria-expanded={isOpen}
        className="button-ghost admin-switcher-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="small muted">Event aktif</span>
        <strong>{currentEvent?.event.title ?? "Pilih event"}</strong>
        <span className="small muted">
          {currentEvent ? `${currentEvent.event.eventDate} | ${currentEvent.event.venueName}` : `${events.length} event tersedia`}
        </span>
      </button>

      {isOpen ? (
        <div className="panel stack admin-switcher-popover">
          <div className="stack" style={{ gap: 8 }}>
            <div>
              <p className="eyebrow">Event Switcher</p>
              <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: 0 }}>
                Pindah event dengan cepat
              </h2>
            </div>
            <input
              aria-label="Cari event"
              className="admin-toolbar-input"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama event, mempelai, atau venue"
              value={search}
            />
            <div className="inline-actions">
              <Link className="button-ghost" href="/admin">
                Lihat semua event
              </Link>
              <button className="button-ghost" onClick={() => setIsOpen(false)} type="button">
                Tutup
              </button>
            </div>
          </div>

          <div className="admin-switcher-list">
            {visibleEvents.length === 0 ? (
              <div className="row-card">
                <div className="stack" style={{ gap: 6 }}>
                  <strong>Tidak ada event yang cocok.</strong>
                  <span className="muted small">Coba kata kunci lain untuk menemukan event yang Anda cari.</span>
                </div>
              </div>
            ) : null}

            {visibleEvents.map((item) => {
              const isCurrent = item.event.id === currentEventId;

              return (
                <Link
                  aria-current={isCurrent ? "page" : undefined}
                  className={`row-card admin-switcher-item${isCurrent ? " current" : ""}`}
                  href={`/admin/events/${item.event.id}`}
                  key={item.event.id}
                >
                  <div className="stack" style={{ gap: 6 }}>
                    <strong>{item.event.title}</strong>
                    <span className="muted small">
                      {item.event.brideName} &amp; {item.event.groomName}
                    </span>
                    <span className="muted small">
                      {item.event.eventDate} | {item.event.venueName}
                    </span>
                  </div>

                  <div className="stack" style={{ alignItems: "flex-end", gap: 8 }}>
                    <span className="pill">{item.metrics.totalBookings} booking</span>
                    {isCurrent ? <span className="pill good">Sedang dibuka</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
