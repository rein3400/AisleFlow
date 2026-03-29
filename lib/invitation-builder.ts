const DEFAULT_PRIMARY_COLOR = "#9f4f34";
const DEFAULT_SECONDARY_COLOR = "#f4e9da";

export type InvitationPageKey = "invitation" | "seating" | "ticket";

export type InvitationBlockType =
  | "heroCover"
  | "welcomeNote"
  | "eventDetails"
  | "storyAgenda"
  | "galleryPanel"
  | "guestCard"
  | "seatingBridge"
  | "seatSelectionFrame"
  | "confirmationFrame"
  | "ticketHero"
  | "ticketMetaCards"
  | "ticketCompanion"
  | "ticketStatusFooter";

export type InvitationStylePreset = "garden-keepsake" | "modern-editorial" | "warm-minimalist";

export interface InvitationStyleTokens {
  headingFontClass: string;
  buttonTone: "solid" | "outlined" | "soft";
  cardTreatment: "paper" | "glass" | "matte";
  spacingDensity: "compact" | "balanced" | "airy";
  ornamentIntensity: "subtle" | "medium" | "lush";
}

export interface InvitationGlobalStyle {
  preset: InvitationStylePreset;
  primaryColor: string;
  secondaryColor: string;
  imageryEmphasis: "balanced" | "cinematic" | "editorial";
  buttonTone: InvitationStyleTokens["buttonTone"];
  cardTreatment: InvitationStyleTokens["cardTreatment"];
  spacingDensity: InvitationStyleTokens["spacingDensity"];
  ornamentIntensity: InvitationStyleTokens["ornamentIntensity"];
}

export interface InvitationPageConfig {
  title: string;
  description: string;
}

export interface InvitationBlockConfig {
  type: InvitationBlockType;
  page: InvitationPageKey;
  enabled: boolean;
  order: number;
  variant: string;
  content: Record<string, string>;
  style: Record<string, string>;
}

export type InvitationBlocksMap = Record<InvitationBlockType, InvitationBlockConfig>;

export interface InvitationConfig {
  eventId: string;
  updatedAt: string;
  updatedBy: string;
  globalStyle: InvitationGlobalStyle;
  pageConfigs: Record<InvitationPageKey, InvitationPageConfig>;
  blocks: InvitationBlocksMap;
}

export const INVITATION_PAGE_LABELS: Record<InvitationPageKey, string> = {
  invitation: "Undangan",
  seating: "Seat Selection",
  ticket: "Ticket",
};

export const INVITATION_BLOCK_LABELS: Record<InvitationBlockType, string> = {
  heroCover: "Hero Cover",
  welcomeNote: "Welcome Note",
  eventDetails: "Event Details",
  storyAgenda: "Story / Agenda",
  galleryPanel: "Gallery / Visual Panel",
  guestCard: "Guest Card",
  seatingBridge: "Seating Intro Bridge",
  seatSelectionFrame: "Seat Selection Frame",
  confirmationFrame: "Confirmation Frame",
  ticketHero: "Ticket Hero",
  ticketMetaCards: "Ticket Meta Cards",
  ticketCompanion: "Ticket Companion Panel",
  ticketStatusFooter: "Ticket Status Footer",
};

const STYLE_PRESETS: Record<InvitationStylePreset, InvitationStyleTokens> = {
  "garden-keepsake": {
    headingFontClass: "preset-garden-keepsake",
    buttonTone: "solid",
    cardTreatment: "paper",
    spacingDensity: "balanced",
    ornamentIntensity: "medium",
  },
  "modern-editorial": {
    headingFontClass: "preset-modern-editorial",
    buttonTone: "outlined",
    cardTreatment: "glass",
    spacingDensity: "compact",
    ornamentIntensity: "subtle",
  },
  "warm-minimalist": {
    headingFontClass: "preset-warm-minimalist",
    buttonTone: "soft",
    cardTreatment: "matte",
    spacingDensity: "airy",
    ornamentIntensity: "subtle",
  },
};

const PAGE_TITLES: Record<InvitationPageKey, InvitationPageConfig> = {
  invitation: {
    title: "Undangan",
    description: "Halaman utama undangan digital dan narasi perayaan.",
  },
  seating: {
    title: "Seat Selection",
    description: "Framing visual untuk pemilihan kursi dan finalisasi reservasi.",
  },
  ticket: {
    title: "Ticket",
    description: "Tampilan tiket final setelah kursi dikonfirmasi.",
  },
};

function nowIso() {
  return new Date().toISOString();
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitizeColor(value: unknown, fallback: string) {
  const candidate = String(value ?? "").trim();
  return isHexColor(candidate) ? candidate : fallback;
}

function isPageKey(value: unknown): value is InvitationPageKey {
  return value === "invitation" || value === "seating" || value === "ticket";
}

function isStylePreset(value: unknown): value is InvitationStylePreset {
  return value === "garden-keepsake" || value === "modern-editorial" || value === "warm-minimalist";
}

function isButtonTone(value: unknown): value is InvitationStyleTokens["buttonTone"] {
  return value === "solid" || value === "outlined" || value === "soft";
}

function isCardTreatment(value: unknown): value is InvitationStyleTokens["cardTreatment"] {
  return value === "paper" || value === "glass" || value === "matte";
}

function isSpacingDensity(value: unknown): value is InvitationStyleTokens["spacingDensity"] {
  return value === "compact" || value === "balanced" || value === "airy";
}

function isOrnamentIntensity(value: unknown): value is InvitationStyleTokens["ornamentIntensity"] {
  return value === "subtle" || value === "medium" || value === "lush";
}

function block(
  type: InvitationBlockType,
  page: InvitationPageKey,
  order: number,
  content: Record<string, string>,
  variant = "default",
): InvitationBlockConfig {
  return {
    type,
    page,
    enabled: true,
    order,
    variant,
    content,
    style: {},
  };
}

function createDefaultBlocks(input: {
  brideName: string;
  groomName: string;
  welcomeMessage: string;
  heroImageDataUrl: string;
  backgroundImageDataUrl: string;
}): InvitationBlocksMap {
  return {
    heroCover: block("heroCover", "invitation", 1, {
      eyebrow: "Undangan Digital",
      title: `${input.brideName} & ${input.groomName}`,
      body:
        "Dengan penuh sukacita, kami mengundang Anda untuk hadir dan menikmati malam perayaan yang hangat bersama keluarga dan sahabat terdekat.",
      heroImageDataUrl: input.heroImageDataUrl,
      backgroundImageDataUrl: input.backgroundImageDataUrl,
      scrollLabel: "Lanjut ke detail undangan",
    }),
    welcomeNote: block("welcomeNote", "invitation", 2, {
      heading: "Catatan Sambutan",
      body:
        input.welcomeMessage ||
        "Terima kasih telah hadir dan menjadi bagian dari hari perayaan kami yang istimewa.",
    }),
    eventDetails: block("eventDetails", "invitation", 3, {
      heading: "Detail Acara",
      body: "Tampilkan tanggal, lokasi, dan sesi kehadiran tamu dalam komposisi yang hangat dan mudah dipindai.",
    }),
    storyAgenda: block("storyAgenda", "invitation", 4, {
      heading: "Cerita Perayaan",
      body: "Rangkaian momen, rundown singkat, atau catatan perayaan yang ingin dibagikan kepada tamu.",
    }),
    galleryPanel: block("galleryPanel", "invitation", 5, {
      heading: "Galeri Visual",
      body: "Panel visual untuk memperkuat suasana undangan digital.",
      imageOne: input.heroImageDataUrl,
      imageTwo: input.backgroundImageDataUrl,
    }),
    guestCard: block("guestCard", "invitation", 6, {
      heading: "Kartu Personal",
      body: "Tempat tamu dan sesi kehadiran ditampilkan secara personal dan elegan.",
    }),
    seatingBridge: block("seatingBridge", "invitation", 7, {
      heading: "Lanjut ke Tempat Duduk",
      body: "Dengan penuh hormat, silakan lanjutkan ke kartu tempat duduk Anda untuk menutup reservasi.",
    }),
    seatSelectionFrame: block("seatSelectionFrame", "seating", 1, {
      heading: "Kartu Tempat Duduk",
      body: "Pilih satu kursi final yang telah kami siapkan untuk Anda.",
    }),
    confirmationFrame: block("confirmationFrame", "seating", 2, {
      heading: "Ringkasan Finalisasi",
      body: "Ringkasan pilihan kursi sebelum reservasi akhir disimpan.",
    }),
    ticketHero: block("ticketHero", "ticket", 1, {
      heading: "E-Ticket Final",
      body: "Tiket digital Anda telah disiapkan sebagai keepsake akhir.",
      statusBadge: "Siap ditunjukkan di venue",
    }),
    ticketMetaCards: block("ticketMetaCards", "ticket", 2, {
      heading: "Informasi Acara",
      body: "Ringkasan hari acara, venue, sesi, dan waktu finalisasi.",
    }),
    ticketCompanion: block("ticketCompanion", "ticket", 3, {
      heading: "Companion Panel",
      body: "Panel pendamping yang menjaga nuansa undangan tetap hidup pada halaman tiket.",
    }),
    ticketStatusFooter: block("ticketStatusFooter", "ticket", 4, {
      heading: "Status Final",
      body: "1 QR · 1 kursi final",
    }),
  };
}

export function createDefaultInvitationConfig(input: {
  eventId: string;
  updatedBy: string;
  brideName: string;
  groomName: string;
  welcomeMessage: string;
  primaryColor: string;
  secondaryColor: string;
  heroImageDataUrl: string;
  backgroundImageDataUrl: string;
}): InvitationConfig {
  const presetTokens = getStylePresetTokens("garden-keepsake");

  return {
    eventId: input.eventId,
    updatedAt: nowIso(),
    updatedBy: input.updatedBy,
    globalStyle: {
      preset: "garden-keepsake",
      primaryColor: sanitizeColor(input.primaryColor, DEFAULT_PRIMARY_COLOR),
      secondaryColor: sanitizeColor(input.secondaryColor, DEFAULT_SECONDARY_COLOR),
      imageryEmphasis: "cinematic",
      buttonTone: presetTokens.buttonTone,
      cardTreatment: presetTokens.cardTreatment,
      spacingDensity: presetTokens.spacingDensity,
      ornamentIntensity: presetTokens.ornamentIntensity,
    },
    pageConfigs: {
      invitation: { ...PAGE_TITLES.invitation },
      seating: { ...PAGE_TITLES.seating },
      ticket: { ...PAGE_TITLES.ticket },
    },
    blocks: createDefaultBlocks(input),
  };
}

export function normalizeInvitationConfig(
  input: Partial<InvitationConfig> | Record<string, unknown> | null | undefined,
  fallback: {
    eventId: string;
    updatedBy: string;
    brideName?: string;
    groomName?: string;
    welcomeMessage?: string;
    primaryColor?: string;
    secondaryColor?: string;
    heroImageDataUrl?: string;
    backgroundImageDataUrl?: string;
  },
): InvitationConfig {
  const base = createDefaultInvitationConfig({
    eventId: fallback.eventId,
    updatedBy: fallback.updatedBy,
    brideName: fallback.brideName ?? "Bride",
    groomName: fallback.groomName ?? "Groom",
    welcomeMessage: fallback.welcomeMessage ?? "",
    primaryColor: fallback.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    secondaryColor: fallback.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
    heroImageDataUrl: fallback.heroImageDataUrl ?? "",
    backgroundImageDataUrl: fallback.backgroundImageDataUrl ?? "",
  });

  const source = input ?? {};
  const rawGlobal = (source as InvitationConfig).globalStyle ?? {};
  const rawPages = (source as InvitationConfig).pageConfigs ?? {};
  const rawBlocks = (source as InvitationConfig).blocks ?? {};
  const preset =
    isStylePreset((rawGlobal as InvitationGlobalStyle).preset)
      ? (rawGlobal as InvitationGlobalStyle).preset
      : base.globalStyle.preset;
  const presetTokens = getStylePresetTokens(preset);

  const normalized: InvitationConfig = {
    ...base,
    eventId: String((source as InvitationConfig).eventId ?? base.eventId),
    updatedAt: String((source as InvitationConfig).updatedAt ?? base.updatedAt),
    updatedBy: String((source as InvitationConfig).updatedBy ?? fallback.updatedBy),
    globalStyle: {
      preset,
      primaryColor: sanitizeColor((rawGlobal as InvitationGlobalStyle).primaryColor, base.globalStyle.primaryColor),
      secondaryColor: sanitizeColor(
        (rawGlobal as InvitationGlobalStyle).secondaryColor,
        base.globalStyle.secondaryColor,
      ),
      imageryEmphasis:
        (rawGlobal as InvitationGlobalStyle).imageryEmphasis === "balanced" ||
        (rawGlobal as InvitationGlobalStyle).imageryEmphasis === "cinematic" ||
        (rawGlobal as InvitationGlobalStyle).imageryEmphasis === "editorial"
          ? (rawGlobal as InvitationGlobalStyle).imageryEmphasis
          : base.globalStyle.imageryEmphasis,
      buttonTone: isButtonTone((rawGlobal as InvitationGlobalStyle).buttonTone)
        ? (rawGlobal as InvitationGlobalStyle).buttonTone
        : presetTokens.buttonTone,
      cardTreatment: isCardTreatment((rawGlobal as InvitationGlobalStyle).cardTreatment)
        ? (rawGlobal as InvitationGlobalStyle).cardTreatment
        : presetTokens.cardTreatment,
      spacingDensity: isSpacingDensity((rawGlobal as InvitationGlobalStyle).spacingDensity)
        ? (rawGlobal as InvitationGlobalStyle).spacingDensity
        : presetTokens.spacingDensity,
      ornamentIntensity: isOrnamentIntensity((rawGlobal as InvitationGlobalStyle).ornamentIntensity)
        ? (rawGlobal as InvitationGlobalStyle).ornamentIntensity
        : presetTokens.ornamentIntensity,
    },
    pageConfigs: {
      invitation: isPageKey("invitation")
        ? {
            title: String(rawPages.invitation?.title ?? PAGE_TITLES.invitation.title),
            description: String(rawPages.invitation?.description ?? PAGE_TITLES.invitation.description),
          }
        : PAGE_TITLES.invitation,
      seating: {
        title: String(rawPages.seating?.title ?? PAGE_TITLES.seating.title),
        description: String(rawPages.seating?.description ?? PAGE_TITLES.seating.description),
      },
      ticket: {
        title: String(rawPages.ticket?.title ?? PAGE_TITLES.ticket.title),
        description: String(rawPages.ticket?.description ?? PAGE_TITLES.ticket.description),
      },
    },
    blocks: { ...base.blocks },
  };

  for (const key of Object.keys(base.blocks) as InvitationBlockType[]) {
    const current = rawBlocks[key];
    if (!current) {
      continue;
    }

    normalized.blocks[key] = {
      ...base.blocks[key],
      enabled: typeof current.enabled === "boolean" ? current.enabled : base.blocks[key].enabled,
      order: typeof current.order === "number" ? current.order : base.blocks[key].order,
      page: isPageKey(current.page) ? current.page : base.blocks[key].page,
      variant: typeof current.variant === "string" ? current.variant : base.blocks[key].variant,
      content:
        current.content && typeof current.content === "object"
          ? Object.fromEntries(
              Object.entries(current.content).map(([contentKey, value]) => [contentKey, String(value ?? "")]),
            )
          : base.blocks[key].content,
      style:
        current.style && typeof current.style === "object"
          ? Object.fromEntries(
              Object.entries(current.style).map(([styleKey, value]) => [styleKey, String(value ?? "")]),
            )
          : base.blocks[key].style,
      type: key,
    };
  }

  return normalized;
}

export function getBlocksForPage(config: InvitationConfig, page: InvitationPageKey) {
  return (Object.values(config.blocks) as InvitationBlockConfig[])
    .filter((block) => block.page === page && block.enabled)
    .sort((left, right) => left.order - right.order)
    .map((block) => ({
      ...block,
      type: block.type,
    }));
}

export function getStylePresetTokens(preset: InvitationStylePreset): InvitationStyleTokens {
  return STYLE_PRESETS[preset];
}
