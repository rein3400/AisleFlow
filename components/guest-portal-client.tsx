"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import styles from "@/components/invitation-renderer.module.css";

type GuestPortal = Awaited<ReturnType<typeof import("@/lib/domain").getGuestPortal>>;
type GuestPortalLike = Omit<GuestPortal, "guest"> & {
  guest: {
    name: string;
  };
};

interface GuestPortalClientProps {
  initialPortal: GuestPortalLike;
  token?: string;
  mode?: "live" | "preview";
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function GuestPortalClient({ initialPortal, token, mode = "live" }: GuestPortalClientProps) {
  const router = useRouter();
  const [portal, setPortal] = useState(initialPortal);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const seatFrame = portal.invitationConfig.blocks.seatSelectionFrame;
  const confirmationFrame = portal.invitationConfig.blocks.confirmationFrame;
  const isPreview = mode === "preview";

  const selectedSeat = useMemo(
    () => portal.seats.find((seat) => seat.seatId === portal.currentLockSeatId) ?? null,
    [portal.currentLockSeatId, portal.seats],
  );

  useEffect(() => {
    setPortal(initialPortal);
    setNotice(null);
  }, [initialPortal]);

  useEffect(() => {
    if (isPreview || !token) {
      return;
    }

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
  }, [isPreview, router, token]);

  useEffect(() => {
    if (isPreview || !token || !portal.currentLockSeatId) {
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
  }, [isPreview, portal.currentLockSeatId, token]);

  function handleSelectSeat(seatId: string) {
    if (isPreview) {
      setPortal((current) => ({
        ...current,
        currentLockSeatId: seatId,
        seats: current.seats.map((seat) => ({
          ...seat,
          status: seat.seatId === seatId ? "locked" : seat.status === "locked" && seat.selectedByGuest ? "available" : seat.status,
          selectedByGuest: seat.seatId === seatId,
        })),
      }));
      setNotice({
        kind: "success",
        message: "Preview kursi aktif dipindahkan. Tamu live baru akan melihat perubahan desain setelah Anda menekan Simpan di builder.",
      });
      return;
    }

    if (!token) {
      return;
    }

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

    if (isPreview) {
      setNotice({
        kind: "success",
        message: "Preview finalisasi aktif. Di mode builder, langkah ini hanya mensimulasikan pengalaman tamu tanpa menyimpan booking sungguhan.",
      });
      return;
    }

    if (!token) {
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
    <section
      className={styles.surface}
      data-button-tone={portal.invitationConfig.globalStyle.buttonTone}
      data-card-treatment={portal.invitationConfig.globalStyle.cardTreatment}
      data-ornament={portal.invitationConfig.globalStyle.ornamentIntensity}
      data-spacing={portal.invitationConfig.globalStyle.spacingDensity}
      id="seating-card"
      style={
        {
          ["--invite-primary" as string]: portal.invitationConfig.globalStyle.primaryColor,
          ["--invite-primary-deep" as string]: portal.invitationConfig.globalStyle.primaryColor,
          ["--invite-secondary" as string]: portal.invitationConfig.globalStyle.secondaryColor,
        }
      }
    >
      <section className={styles.seatShell}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>{seatFrame.content.heading || "Kartu Tempat Duduk"}</p>
          <h2 className={styles.headline}>{seatFrame.content.body || "Pilih satu kursi final yang telah kami siapkan untuk Anda"}</h2>
          <p className={styles.copy}>
            Setiap kursi di bawah hanya berlaku untuk <strong>{portal.session.code}</strong>. Saat kursi difinalkan,
            tiket tamu akan langsung disiapkan dan tidak dapat diubah kembali.
          </p>
        </div>

        <div className={styles.legendRow}>
          <div className={styles.legendChip}>
            <span className={classNames(styles.seatDot, styles.seatDotAvailable)}></span>
            <span>Tersedia</span>
          </div>
          <div className={styles.legendChip}>
            <span className={classNames(styles.seatDot, styles.seatDotSelected)}></span>
            <span>Pilihan Anda</span>
          </div>
          <div className={styles.legendChip}>
            <span className={classNames(styles.seatDot, styles.seatDotLocked)}></span>
            <span>Di-hold</span>
          </div>
          <div className={styles.legendChip}>
            <span className={classNames(styles.seatDot, styles.seatDotBooked)}></span>
            <span>Sudah Terisi</span>
          </div>
        </div>

        {notice ? (
          <div
            aria-live="polite"
            className={classNames(styles.inlineStatus, notice.kind === "success" ? styles.inlineStatusSuccess : styles.inlineStatusError)}
          >
            {notice.message}
          </div>
        ) : null}

        <div className={styles.seatGrid}>
          {portal.seats.map((seat) => {
            const disabled = seat.status === "booked" || (seat.status === "locked" && !seat.selectedByGuest);

            return (
              <button
                className={classNames(
                  styles.seatButton,
                  seat.status === "available" && styles.seatAvailable,
                  seat.status === "locked" && styles.seatLocked,
                  seat.status === "booked" && styles.seatBooked,
                  seat.selectedByGuest && styles.seatSelected,
                )}
                disabled={disabled || isPending}
                key={seat.seatId}
                onClick={() => handleSelectSeat(seat.seatId)}
                type="button"
              >
                <span className={styles.seatLabel}>{seat.seatLabel}</span>
                <span className={styles.seatHelp}>
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
      </section>

      <section className={styles.selectionCard}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>{confirmationFrame.content.heading || "Ringkasan Finalisasi"}</p>
          <strong>
            {selectedSeat ? `Pilihan sementara Anda: ${selectedSeat.seatLabel}` : "Belum ada kursi yang Anda pilih"}
          </strong>
          <p className={styles.copy}>
            {confirmationFrame.content.body ||
              `${portal.event.brideName} & ${portal.event.groomName} menutup pengalaman ini dengan ringkasan yang tenang dan jelas sebelum reservasi akhir disimpan.`}
          </p>
        </div>

        <button className={styles.primaryAction} disabled={!selectedSeat || isPending} onClick={handleConfirm} type="button">
          {isPending ? "Menyimpan Reservasi..." : isPreview ? "Preview Finalisasi" : "Finalkan Kursi Ini"}
        </button>
        <span className={styles.statusHint}>
          {selectedSeat
            ? "Kursi ini sedang kami tahan sebentar agar Anda dapat menutup reservasi dengan tenang."
            : "Pilih satu kursi pada kartu di atas untuk menyiapkan tiket final Anda."}
        </span>
      </section>
    </section>
  );
}
