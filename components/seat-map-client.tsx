"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type GuestPortal = Awaited<ReturnType<typeof import("@/lib/domain").getGuestPortal>>;

interface SeatMapClientProps {
  token: string;
  initialPortal: GuestPortal;
}

export function SeatMapClient({ token, initialPortal }: SeatMapClientProps) {
  const router = useRouter();
  const [portal, setPortal] = useState(initialPortal);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSeat = useMemo(
    () => portal.seats.find((seat) => seat.seatId === portal.currentLockSeatId) ?? null,
    [portal.currentLockSeatId, portal.seats],
  );

  useEffect(() => {
    const refreshId = window.setInterval(async () => {
      const response = await fetch(`/api/guest/${token}/validate`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { ok?: boolean; portal?: GuestPortal };

      if (response.ok && payload.ok && payload.portal) {
        if (payload.portal.booking) {
          router.push(`/guest/${token}/ticket`);
          return;
        }

        setPortal(payload.portal);
      }
    }, 7000);

    return () => window.clearInterval(refreshId);
  }, [router, token]);

  useEffect(() => {
    if (!portal.currentLockSeatId) {
      return;
    }

    const keepAliveId = window.setInterval(async () => {
      await fetch(`/api/guest/${token}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seatId: portal.currentLockSeatId,
        }),
      });
    }, 45_000);

    return () => window.clearInterval(keepAliveId);
  }, [portal.currentLockSeatId, token]);

  function handleSelectSeat(seatId: string) {
    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/guest/${token}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seatId,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        seats?: GuestPortal["seats"];
        currentLockSeatId?: string | null;
      };

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Gagal mengunci kursi.",
        });
        return;
      }

      setPortal((current) => ({
        ...current,
        seats: payload.seats ?? current.seats,
        currentLockSeatId: payload.currentLockSeatId ?? null,
      }));
      setNotice({
        kind: "success",
        message: "Kursi berhasil dikunci sementara selama 2 menit.",
      });
    });
  }

  function handleConfirm() {
    if (!selectedSeat) {
      return;
    }

    if (!window.confirm("Apakah Anda yakin? Nomor kursi tidak dapat diubah setelah konfirmasi.")) {
      return;
    }

    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/guest/${token}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seatId: selectedSeat.seatId,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        ticketUrl?: string;
      };

      if (!response.ok || !payload.ok || !payload.ticketUrl) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Konfirmasi kursi gagal.",
        });
        return;
      }

      router.push(payload.ticketUrl);
      router.refresh();
    });
  }

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Seat Map</p>
        <h2 className="section-title">Pilih satu kursi final</h2>
        <p className="lede">
          QR ini hanya berlaku untuk <strong>{portal.session.code}</strong>. Setelah dikonfirmasi, nomor kursi
          tidak dapat diubah lagi.
        </p>
      </div>

      <div className="pill-row">
        <span className="pill good">Tersedia</span>
        <span className="pill warn">Terkunci sementara</span>
        <span className="pill bad">Terisi</span>
      </div>

      {notice ? <div className={`status ${notice.kind}`}>{notice.message}</div> : null}

      <div className="seat-grid">
        {portal.seats.map((seat) => {
          const seatClass = ["seat-button", seat.status, seat.selectedByGuest ? "selected" : ""]
            .filter(Boolean)
            .join(" ");
          const disabled = seat.status === "booked" || (seat.status === "locked" && !seat.selectedByGuest);

          return (
            <button
              className={seatClass}
              disabled={disabled || isPending}
              key={seat.seatId}
              onClick={() => handleSelectSeat(seat.seatId)}
              type="button"
            >
              <span className="seat-label">{seat.seatLabel}</span>
              <span className="seat-subtle">
                {seat.status === "available"
                  ? "Klik untuk pilih"
                  : seat.status === "locked"
                    ? seat.selectedByGuest
                      ? "Terkunci untuk Anda"
                      : `Hold ${seat.occupantLabel ?? ""}`
                    : `Booked ${seat.occupantLabel ?? ""}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="row-card">
        <div className="stack" style={{ gap: 6 }}>
          <strong>Kursi terpilih</strong>
          <span className="muted small">
            {selectedSeat ? selectedSeat.seatLabel : "Belum ada kursi yang dikunci untuk Anda."}
          </span>
        </div>

        <button className="button" disabled={!selectedSeat || isPending} onClick={handleConfirm} type="button">
          {isPending ? "Mengonfirmasi..." : "Konfirmasi Kursi Final"}
        </button>
      </div>
    </section>
  );
}
