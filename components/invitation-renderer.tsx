import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import {
  INVITATION_BLOCK_LABELS,
  getBlocksForPage,
  getStylePresetTokens,
  type InvitationBlockConfig,
  type InvitationBlockType,
  type InvitationConfig,
} from "@/lib/invitation-builder";
import { formatGuestConfirmationTime, formatGuestEventDate, getGuestMonogram } from "@/lib/guest-ui";

import styles from "./invitation-renderer.module.css";

export interface InvitationRenderEvent {
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  venueName: string;
  welcomeMessage: string;
}

export interface InvitationRenderGuest {
  name: string;
}

export interface InvitationRenderSession {
  code: string;
  label: string;
}

export interface InvitationRenderBooking {
  seatLabel: string;
  confirmedAt: string;
}

export interface InvitationRenderSeat {
  seatId: string;
  seatLabel: string;
  seatNumber: number;
  status: "available" | "locked" | "booked";
  occupantLabel: string | null;
  selectedByGuest: boolean;
}

interface SharedRenderProps {
  config: InvitationConfig;
  event: InvitationRenderEvent;
  guest: InvitationRenderGuest;
  session: InvitationRenderSession;
  selectedBlock?: InvitationBlockType | null;
  onSelectBlock?: (blockType: InvitationBlockType) => void;
}

interface InvitationPageRendererProps extends SharedRenderProps {
  anchorHref?: string;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getSurfaceStyle(config: InvitationConfig): CSSProperties {
  return {
    ["--invite-primary" as string]: config.globalStyle.primaryColor,
    ["--invite-primary-deep" as string]: config.globalStyle.primaryColor,
    ["--invite-secondary" as string]: config.globalStyle.secondaryColor,
  };
}

function handleBlockKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onSelectBlock: ((blockType: InvitationBlockType) => void) | undefined,
  blockType: InvitationBlockType,
) {
  if (!onSelectBlock) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectBlock(blockType);
  }
}

function BlockSurface({
  block,
  selectedBlock,
  onSelectBlock,
  className,
  children,
}: {
  block: InvitationBlockConfig;
  selectedBlock?: InvitationBlockType | null;
  onSelectBlock?: (blockType: InvitationBlockType) => void;
  className?: string;
  children: ReactNode;
}) {
  const isInteractive = Boolean(onSelectBlock);
  const isSelected = selectedBlock === block.type;

  return (
    <section
      className={classNames(
        styles.blockSurface,
        className,
        isInteractive && styles.selectable,
        isSelected && styles.selected,
      )}
      data-align={block.style.align === "center" ? "center" : "left"}
      data-emphasis={block.style.emphasis === "strong" || block.style.emphasis === "plain" ? block.style.emphasis : "soft"}
      onClick={() => onSelectBlock?.(block.type)}
      onKeyDown={(event) => handleBlockKeyDown(event, onSelectBlock, block.type)}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {isInteractive ? <div className={styles.blockLabel}>{INVITATION_BLOCK_LABELS[block.type]}</div> : null}
      {children}
    </section>
  );
}

function HeroCover({
  block,
  config,
  event,
  guest,
  session,
  anchorHref,
}: {
  block: InvitationBlockConfig;
  config: InvitationConfig;
  event: InvitationRenderEvent;
  guest: InvitationRenderGuest;
  session: InvitationRenderSession;
  anchorHref?: string;
}) {
  const styleTokens = getStylePresetTokens(config.globalStyle.preset);
  const heroImage = block.content.heroImageDataUrl || block.content.imageOne;
  const backgroundImage = block.content.backgroundImageDataUrl || block.content.imageTwo;

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroGrid}>
        <div className={styles.stack}>
          <p className={styles.eyebrow}>{block.content.eyebrow || "Undangan Digital"}</p>
          <div className={styles.stack}>
            <span className={styles.muted}>Kepada tamu terhormat</span>
            <strong>{guest.name}</strong>
          </div>
          <h1 className={styles.title}>{block.content.title || `${event.brideName} & ${event.groomName}`}</h1>
          <p className={styles.copy}>{block.content.body || event.welcomeMessage}</p>
          <div className={styles.metaRow}>
            <div className={styles.pill}>
              <strong>{formatGuestEventDate(event.eventDate)}</strong>
              <span>Hari perayaan</span>
            </div>
            <div className={styles.pill}>
              <strong>{event.venueName}</strong>
              <span>Lokasi acara</span>
            </div>
            <div className={styles.pill}>
              <strong>
                {session.code} · {session.label}
              </strong>
              <span>Sesi kehadiran</span>
            </div>
          </div>
          {anchorHref ? (
            <a className={styles.scrollLink} href={anchorHref}>
              {block.content.scrollLabel || "Lanjut ke detail undangan"}
            </a>
          ) : null}
        </div>

        <aside
          className={styles.heroVisual}
          style={
            backgroundImage
              ? {
                  backgroundImage: `linear-gradient(135deg, rgba(74, 49, 36, 0.24), rgba(74, 49, 36, 0.08) 55%, rgba(255, 249, 241, 0.08)), url(${backgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className={styles.heroVisualInner}>
            <span className={styles.ticketStatusBadge}>
              {styleTokens.headingFontClass === "preset-modern-editorial" ? "Editorial Preview" : "Guest Experience"}
            </span>
            {heroImage ? (
              <img alt="Hero event" src={heroImage} />
            ) : (
              <div className={styles.monogramWrap}>
                <div className={styles.monogram}>{getGuestMonogram(event.brideName, event.groomName)}</div>
              </div>
            )}
            <p className={styles.supportingText}>
              {block.content.supportingText ||
                "Undangan digital ini memadukan nuansa invitation keepsake dengan alur reservasi yang tetap tenang dan jelas."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function renderInvitationBlock(
  block: InvitationBlockConfig,
  props: SharedRenderProps & { anchorHref?: string },
) {
  const { config, event, guest, session, selectedBlock, onSelectBlock, anchorHref } = props;

  if (block.type === "heroCover") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <HeroCover anchorHref={anchorHref} block={block} config={config} event={event} guest={guest} session={session} />
      </BlockSurface>
    );
  }

  if (block.type === "welcomeNote") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>Catatan Sambutan</p>
          <h2 className={styles.headline}>{block.content.heading || "Catatan Hangat dari Tuan Rumah"}</h2>
          <p className={styles.copy}>{block.content.body || event.welcomeMessage}</p>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "eventDetails") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>{block.content.heading || "Detail Acara"}</p>
          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <span className={styles.miniLabel}>Hari & Tanggal</span>
              <strong>{formatGuestEventDate(event.eventDate)}</strong>
              <span>{block.content.dateNote || "Malam resepsi keluarga dan sahabat."}</span>
            </div>
            <div className={styles.detailCard}>
              <span className={styles.miniLabel}>Lokasi</span>
              <strong>{event.venueName}</strong>
              <span>{block.content.venueNote || "Venue perayaan utama."}</span>
            </div>
            <div className={styles.detailCard}>
              <span className={styles.miniLabel}>Sesi</span>
              <strong>
                {session.code} · {session.label}
              </strong>
              <span>{block.content.sessionNote || "Satu kursi final untuk satu QR tamu."}</span>
            </div>
          </div>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "storyAgenda") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>{block.content.heading || "Cerita Perayaan"}</p>
          <h2 className={styles.cardTitle}>{block.content.subheading || "Satu malam untuk dinikmati dengan tenang"}</h2>
          <p className={styles.copy}>
            {block.content.body ||
              "Kehadiran Anda akan menjadi bagian berarti dari malam perayaan kami. Kami menata pengalaman ini agar terasa seperti membaca invitation suite yang utuh, bukan sekadar form reservasi."}
          </p>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "galleryPanel") {
    const imageOne = block.content.imageOne || block.content.heroImageDataUrl;
    const imageTwo = block.content.imageTwo || block.content.backgroundImageDataUrl;

    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>{block.content.heading || "Galeri Visual"}</p>
          <div className={styles.galleryGrid}>
            {[imageOne, imageTwo].map((image, index) => (
              <div className={styles.galleryCell} key={`${block.type}-${index}`}>
                {image ? (
                  <img alt={`Galeri ${index + 1}`} src={image} />
                ) : (
                  <div className={styles.galleryPlaceholder}>
                    <p className={styles.copy}>
                      {index === 0
                        ? block.content.body || "Tambahkan gambar untuk memperkuat atmosfer undangan."
                        : "Background visual akan muncul di sini saat admin menambahkan aset visual."}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "guestCard") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.guestCard}>
          <p className={styles.sectionKicker}>{block.content.heading || "Kartu Personal"}</p>
          <h2 className={styles.cardTitle}>{block.content.title || "Tempat Anda telah kami persiapkan"}</h2>
          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <span className={styles.miniLabel}>Atas nama</span>
              <strong>{guest.name}</strong>
              <span>{block.content.guestNote || "Undangan ini ditujukan khusus untuk tamu yang tercantum."}</span>
            </div>
            <div className={styles.detailCard}>
              <span className={styles.miniLabel}>Sesi</span>
              <strong>
                {session.code} · {session.label}
              </strong>
              <span>{block.content.sessionNote || "Kursi final mengikuti sesi yang telah ditetapkan."}</span>
            </div>
          </div>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "seatingBridge") {
    return (
      <BlockSurface block={block} className={styles.bridge} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        {block.content.body ||
          "Dengan penuh hormat, silakan lanjutkan ke kartu tempat duduk Anda untuk menyiapkan reservasi akhir."}
      </BlockSurface>
    );
  }

  return null;
}

export function InvitationPageRenderer({
  config,
  event,
  guest,
  session,
  selectedBlock,
  onSelectBlock,
  anchorHref,
}: InvitationPageRendererProps) {
  const blocks = getBlocksForPage(config, "invitation");

  return (
    <div
      className={styles.surface}
      data-button-tone={config.globalStyle.buttonTone}
      data-card-treatment={config.globalStyle.cardTreatment}
      data-ornament={config.globalStyle.ornamentIntensity}
      data-spacing={config.globalStyle.spacingDensity}
      style={getSurfaceStyle(config)}
    >
      {blocks.map((block) => renderInvitationBlock(block, { config, event, guest, session, selectedBlock, onSelectBlock, anchorHref }))}
    </div>
  );
}

interface InvitationTicketRendererProps extends SharedRenderProps {
  booking: InvitationRenderBooking;
}

function renderTicketBlock(block: InvitationBlockConfig, props: InvitationTicketRendererProps) {
  const { event, guest, session, booking, selectedBlock, onSelectBlock } = props;

  if (block.type === "ticketHero") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <article className={styles.ticketCard}>
          <div className={styles.stack}>
            <p className={styles.sectionKicker}>{block.content.heading || "E-Ticket Final"}</p>
            <div className={styles.heroGrid}>
              <div className={styles.stack}>
                <h1 className={styles.headline}>{block.content.body || "Tiket digital Anda telah disiapkan"}</h1>
                <p className={styles.copy}>
                  Reservasi akhir tamu telah tercatat. Halaman ini akan tetap menjadi tiket final yang muncul saat QR dibuka kembali.
                </p>
                <div className={styles.pill}>
                  <strong>{guest.name}</strong>
                  <span>Atas nama tamu yang terverifikasi.</span>
                </div>
              </div>
              <div className={styles.heroVisual}>
                <div className={styles.heroVisualInner}>
                  <span className={styles.ticketStatusBadge}>{block.content.statusBadge || "Siap ditunjukkan di venue"}</span>
                  <div className={styles.seatValue}>{booking.seatLabel}</div>
                  <p className={styles.supportingText}>
                    {event.brideName} &amp; {event.groomName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </BlockSurface>
    );
  }

  if (block.type === "ticketMetaCards") {
    return (
      <BlockSurface block={block} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.stack}>
          <p className={styles.sectionKicker}>{block.content.heading || "Informasi Acara"}</p>
          <div className={styles.ticketMetaGrid}>
            <div className={styles.ticketMetaCard}>
              <span className={styles.miniLabel}>Hari Acara</span>
              <strong>{formatGuestEventDate(event.eventDate)}</strong>
              <p>Malam resepsi keluarga dan sahabat.</p>
            </div>
            <div className={styles.ticketMetaCard}>
              <span className={styles.miniLabel}>Lokasi</span>
              <strong>{event.venueName}</strong>
              <p>Simpan tiket ini untuk ditunjukkan saat hadir.</p>
            </div>
            <div className={styles.ticketMetaCard}>
              <span className={styles.miniLabel}>Sesi</span>
              <strong>
                {session.code} · {session.label}
              </strong>
              <p>Kursi final hanya berlaku untuk sesi ini.</p>
            </div>
            <div className={styles.ticketMetaCard}>
              <span className={styles.miniLabel}>Waktu Finalisasi</span>
              <strong>{formatGuestConfirmationTime(booking.confirmedAt)}</strong>
              <p>Ditampilkan sesuai zona waktu Jakarta.</p>
            </div>
          </div>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "ticketCompanion") {
    return (
      <BlockSurface block={block} className={styles.ticketCompanion} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.heroVisualInner}>
          <div className={styles.ticketSeal}>{getGuestMonogram(event.brideName, event.groomName)}</div>
          <div className={styles.stack}>
            <p className={styles.sectionKicker}>{block.content.heading || "Companion Panel"}</p>
            <h2 className={styles.cardTitle}>{block.content.title || "Nuansa undangan tetap hidup di halaman tiket"}</h2>
            <p className={styles.supportingText}>
              {block.content.body ||
                "Panel pendamping ini menjaga halaman tiket terasa utuh, tenang, dan tetap sejalan dengan invitation experience."}
            </p>
          </div>
        </div>
      </BlockSurface>
    );
  }

  if (block.type === "ticketStatusFooter") {
    return (
      <BlockSurface block={block} className={styles.ticketStatusFooter} key={block.type} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <strong>{block.content.body || "1 QR · 1 kursi final"}</strong>
        <p className={styles.copy}>
          Tiket ini tidak menyediakan perubahan kursi setelah reservasi akhir diselesaikan.
        </p>
      </BlockSurface>
    );
  }

  return null;
}

export function InvitationTicketRenderer({
  config,
  event,
  guest,
  session,
  booking,
  selectedBlock,
  onSelectBlock,
}: InvitationTicketRendererProps) {
  const blocks = getBlocksForPage(config, "ticket");
  const mainBlocks = blocks.filter((block) => block.type === "ticketHero" || block.type === "ticketMetaCards");
  const sideBlocks = blocks.filter((block) => block.type === "ticketCompanion" || block.type === "ticketStatusFooter");

  return (
    <div
      className={styles.surface}
      data-button-tone={config.globalStyle.buttonTone}
      data-card-treatment={config.globalStyle.cardTreatment}
      data-ornament={config.globalStyle.ornamentIntensity}
      data-spacing={config.globalStyle.spacingDensity}
      style={getSurfaceStyle(config)}
    >
      <div className={styles.ticketGrid}>
        <div className={styles.stack}>{mainBlocks.map((block) => renderTicketBlock(block, { config, event, guest, session, booking, selectedBlock, onSelectBlock }))}</div>
        <aside className={styles.ticketSide}>
          {sideBlocks.map((block) => renderTicketBlock(block, { config, event, guest, session, booking, selectedBlock, onSelectBlock }))}
        </aside>
      </div>
    </div>
  );
}

interface InvitationSeatPreviewProps extends SharedRenderProps {
  seats: InvitationRenderSeat[];
  currentLockSeatId?: string | null;
  booking?: InvitationRenderBooking | null;
}

export function InvitationSeatPreview({
  config,
  event: _event,
  guest,
  session,
  seats,
  currentLockSeatId,
  booking,
  selectedBlock,
  onSelectBlock,
}: InvitationSeatPreviewProps) {
  const seatFrame = config.blocks.seatSelectionFrame;
  const confirmationFrame = config.blocks.confirmationFrame;
  const selectedSeat = seats.find((seat) => seat.seatId === currentLockSeatId) ?? null;

  return (
    <div
      className={styles.surface}
      data-button-tone={config.globalStyle.buttonTone}
      data-card-treatment={config.globalStyle.cardTreatment}
      data-ornament={config.globalStyle.ornamentIntensity}
      data-spacing={config.globalStyle.spacingDensity}
      style={getSurfaceStyle(config)}
    >
      <BlockSurface block={seatFrame} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.seatShell}>
          <div className={styles.stack}>
            <p className={styles.sectionKicker}>{seatFrame.content.heading || "Kartu Tempat Duduk"}</p>
            <h2 className={styles.headline}>{seatFrame.content.body || "Pilih satu kursi final yang telah kami siapkan untuk Anda"}</h2>
            <p className={styles.copy}>
              Setiap kursi di bawah hanya berlaku untuk <strong>{session.code}</strong>. Saat kursi difinalkan, tiket tamu akan langsung disiapkan dan tidak dapat diubah kembali.
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

          <div className={styles.inlineStatus}>
            Preview builder memakai sample guest context. Perubahan visual akan muncul di sini secara real-time, tetapi guest live baru berubah setelah Anda menekan Simpan.
          </div>

          <div className={styles.seatGrid}>
            {seats.map((seat) => (
              <div
                className={classNames(
                  styles.seatButton,
                  seat.status === "available" && styles.seatAvailable,
                  seat.status === "locked" && styles.seatLocked,
                  seat.status === "booked" && styles.seatBooked,
                  seat.selectedByGuest && styles.seatSelected,
                )}
                key={seat.seatId}
              >
                <span className={styles.seatLabel}>{seat.seatLabel}</span>
                <span className={styles.seatHelp}>
                  {seat.status === "available"
                    ? "Tersedia untuk dipilih sekarang."
                    : seat.status === "locked"
                      ? seat.selectedByGuest
                        ? "Sedang ditahan untuk sample guest."
                        : `Untuk sementara ditahan ${seat.occupantLabel ?? "tamu lain"}.`
                      : `Sudah difinalkan ${seat.occupantLabel ?? "tamu lain"}.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </BlockSurface>

      <BlockSurface block={confirmationFrame} onSelectBlock={onSelectBlock} selectedBlock={selectedBlock}>
        <div className={styles.selectionCard}>
          <div className={styles.stack}>
            <p className={styles.sectionKicker}>{confirmationFrame.content.heading || "Ringkasan Finalisasi"}</p>
            <strong>
              {selectedSeat
                ? `Pilihan sementara ${guest.name}: ${selectedSeat.seatLabel}`
                : booking
                  ? `Kursi final: ${booking.seatLabel}`
                  : "Belum ada kursi yang dipilih"}
            </strong>
            <p className={styles.copy}>
              {confirmationFrame.content.body ||
                "Ringkasan ini membantu tamu menutup reservasi dengan rasa tenang, tanpa dialog browser yang terasa utilitarian."}
            </p>
          </div>
          <button className={styles.primaryAction} disabled type="button">
            Preview finalisasi
          </button>
          <span className={styles.statusHint}>Sample guest: {guest.name}</span>
        </div>
      </BlockSurface>
    </div>
  );
}
