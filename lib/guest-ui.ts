type GuestStatusVariant = "portal" | "ticket";

interface GuestStatusContent {
  eyebrow: string;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}

function firstInitial(value: string) {
  const normalized = value.trim();
  return normalized ? normalized[0]?.toUpperCase() ?? "" : "";
}

export function getGuestMonogram(brideName: string, groomName: string) {
  return `${firstInitial(brideName)}${firstInitial(groomName)}` || "AF";
}

export function formatGuestEventDate(eventDate: string) {
  const [year, month, day] = eventDate.split("-").map((value) => Number(value));
  const safeDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0));

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(safeDate);
}

export function formatGuestConfirmationTime(confirmedAt: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
    .format(new Date(confirmedAt))
    .replace(".", ":")
    .concat(" WIB");
}

export function getGuestStatusContent(
  message: string,
  variant: GuestStatusVariant,
  token?: string,
): GuestStatusContent {
  const normalized = message.toLowerCase();

  if (variant === "ticket" && normalized.includes("tiket belum tersedia")) {
    return {
      eyebrow: "Status Reservasi",
      title: "Tiket Belum Tersedia",
      message:
        "Pilihan kursi Anda belum difinalkan. Silakan kembali ke halaman undangan untuk melanjutkan reservasi kursi.",
      actionLabel: "Kembali ke Undangan",
      actionHref: token ? `/guest/${token}` : "/",
    };
  }

  if (
    normalized.includes("qr tidak valid") ||
    normalized.includes("sudah tidak aktif") ||
    normalized.includes("tamu ini sudah tidak aktif")
  ) {
    return {
      eyebrow: "Undangan Digital",
      title: "Undangan Belum Tersedia",
      message:
        "Tautan undangan ini sudah tidak aktif atau tidak dapat ditemukan. Silakan hubungi pihak penyelenggara untuk mendapatkan tautan yang valid.",
      actionLabel: "Kembali ke Beranda",
      actionHref: "/",
    };
  }

  return {
    eyebrow: variant === "ticket" ? "Status Reservasi" : "Undangan Digital",
    title: variant === "ticket" ? "Informasi Tiket Belum Dapat Ditampilkan" : "Undangan Sedang Dipersiapkan",
    message,
    actionLabel: variant === "ticket" && token ? "Kembali ke Undangan" : "Kembali ke Beranda",
    actionHref: variant === "ticket" && token ? `/guest/${token}` : "/",
  };
}
