import { describe, expect, it } from "vitest";

import { formatGuestEventDate, getGuestMonogram, getGuestStatusContent } from "@/lib/guest-ui";

describe("guest UI helpers", () => {
  it("builds a graceful monogram from couple names", () => {
    expect(getGuestMonogram("Nadia", "Arga")).toBe("NA");
    expect(getGuestMonogram("", "Arga")).toBe("A");
  });

  it("returns a ticket-specific status shell when the ticket is not ready yet", () => {
    expect(getGuestStatusContent("Tiket belum tersedia untuk QR ini.", "ticket", "abc123")).toEqual({
      eyebrow: "Status Reservasi",
      title: "Tiket Belum Tersedia",
      message: "Pilihan kursi Anda belum difinalkan. Silakan kembali ke halaman undangan untuk melanjutkan reservasi kursi.",
      actionLabel: "Kembali ke Undangan",
      actionHref: "/guest/abc123",
    });
  });

  it("returns a portal-specific status shell for invalid or inactive invitations", () => {
    expect(getGuestStatusContent("QR tidak valid atau sudah tidak aktif.", "portal")).toEqual({
      eyebrow: "Undangan Digital",
      title: "Undangan Belum Tersedia",
      message: "Tautan undangan ini sudah tidak aktif atau tidak dapat ditemukan. Silakan hubungi pihak penyelenggara untuk mendapatkan tautan yang valid.",
      actionLabel: "Kembali ke Beranda",
      actionHref: "/",
    });
  });

  it("formats event dates in an invitation-friendly Indonesian format", () => {
    expect(formatGuestEventDate("2026-06-15")).toBe("Senin, 15 Juni 2026");
  });
});
