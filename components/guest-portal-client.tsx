"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type GuestPortal = Awaited<ReturnType<typeof import("@/lib/domain").getGuestPortal>>;

interface GuestPortalClientProps {
  token: string;
  initialPortal: GuestPortal;
}

export function GuestPortalClient({ token, initialPortal }: GuestPortalClientProps) {
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

      if (!response.ok || !payload.ok || !payload.portal) {
        return;
      }

      if (payload.portal.booking) {
        router.push(`/guest/${token}/ticket`);
        return;
      }

      setPortal(payload.portal);
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
          message: payload.error ?? "Kursi belum dapat kami siapkan saat ini. Silakan pilih kursi lainnya.",
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
        message: "Kursi pilihan Anda sedang kami tahan sejenak agar Anda dapat menyelesaikan reservasi dengan tenang.",
      });
    });
  }

  function handleConfirm() {
    if (!selectedSeat) {
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
          message: payload.error ?? "Reservasi akhir belum berhasil disimpan. Silakan coba sekali lagi.",
        });
        return;
      }

      router.push(payload.ticketUrl);
      router.refresh();
    });
  }

  return (
    <section className="guest-paper-card guest-seat-shell" id="seating-card">
      <div className="guest-stack">
        <p className="guest-section-kicker">Kartu Tempat Duduk</p>
        <h2 className="guest-section-title">Pilih satu kursi final yang telah kami siapkan untuk Anda</h2>
        <p className="guest-copy">
          Setiap kursi di bawah hanya berlaku untuk <strong>{portal.session.code}</strong>. Saat kursi difinalkan,
          tiket tamu akan langsung disiapkan dan tidak dapat diubah kembali.
        </p>
      </div>

      <div className="guest-legend-row">
        <div className="guest-legend-chip">
          <span className="guest-seat-dot seat-dot available"></span>
          <span>Tersedia</span>
        </div>
        <div className="guest-legend-chip">
          <span className="guest-seat-dot seat-dot selected"></span>
          <span>Pilihan Anda</span>
        </div>
        <div className="guest-legend-chip">
          <span className="guest-seat-dot seat-dot locked"></span>
          <span>Di-hold</span>
        </div>
        <div className="guest-legend-chip">
          <span className="guest-seat-dot seat-dot booked"></span>
          <span>Sudah Terisi</span>
        </div>
      </div>

      {notice ? (
        <div aria-live="polite" className={`guest-inline-status ${notice.kind}`}>
          {notice.message}
        </div>
      ) : null}

      <div className="guest-seat-grid">
        {portal.seats.map((seat) => {
          const seatClass = ["guest-seat-button", seat.status, seat.selectedByGuest ? "selected" : ""]
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
              <span className="guest-seat-label">{seat.seatLabel}</span>
              <span className="guest-seat-help">
                {seat.status === "available"
                  ? "Tersedia untuk dipilih sekarang."
                  : seat.status === "locked"
                    ? seat.selectedByGuest
                      ? "Sedang kami tahan untuk Anda."
                      : `Untuk sementara ditahan ${seat.occupantLabel ?? "tamu lain"}.`
                    : `Sudah difinalkan ${seat.occupantLabel ?? "tamu lain"}.`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="guest-selection-card">
        <div className="guest-stack" style={{ gap: 6 }}>
          <strong>
            {selectedSeat ? `Pilihan sementara Anda: ${selectedSeat.seatLabel}` : "Belum ada kursi yang Anda pilih"}
          </strong>
          <p className="guest-muted">
            {selectedSeat
              ? "Kursi ini sedang kami tahan sebentar agar Anda dapat menutup reservasi dengan tenang."
              : "Pilih satu kursi pada kartu di atas untuk menyiapkan tiket final Anda."}
          </p>
        </div>

        <button className="guest-button" disabled={!selectedSeat || isPending} onClick={handleConfirm} type="button">
          {isPending ? "Menyimpan Reservasi..." : "Finalkan Kursi Ini"}
        </button>
      </div>
    </section>
  );
}
