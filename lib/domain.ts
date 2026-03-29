import type {
  AdminUser,
  AppStore,
  AuditActorType,
  DashboardMetrics,
  Event,
  EventTheme,
  Guest,
  GuestInviteStatus,
  PublicAdminUser,
  QrCredential,
  Seat,
  SeatBooking,
  SeatLock,
  SeatState,
  Session,
} from "@/lib/types";
import {
  createDefaultInvitationConfig,
  normalizeInvitationConfig,
  type InvitationConfig,
} from "@/lib/invitation-builder";
import { readStore, withStoreMutation } from "@/lib/store";
import {
  addMinutes,
  assert,
  generateId,
  generateToken,
  hashPassword,
  initialsFromName,
  normalizeHeader,
  nowIso,
  parseBooleanLike,
  parsePositiveInteger,
  sanitizeDataUrl,
  slugify,
  verifyPassword,
} from "@/lib/utils";

const DEFAULT_THEME = {
  primaryColor: "#9f4f34",
  secondaryColor: "#f4e9da",
  heroImageDataUrl: "",
  backgroundImageDataUrl: "",
};

const LOCK_DURATION_MINUTES = 2;

function appendAuditLog(
  store: AppStore,
  actorType: AuditActorType,
  actorId: string | null,
  action: string,
  metadata: Record<string, unknown>,
  eventId: string | null = null,
) {
  store.auditLogs.push({
    id: generateId("audit"),
    eventId,
    actorType,
    actorId,
    action,
    metadata,
    createdAt: nowIso(),
  });
}

function sanitizeColor(input: unknown, fallback: string) {
  const value = String(input ?? "").trim();
  if (!value) {
    return fallback;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("Warna utama harus berupa kode hex seperti #AABBCC.");
  }

  return value;
}

function requireEvent(store: AppStore, eventId: string) {
  const event = store.events.find((item) => item.id === eventId);
  assert(event, "Event tidak ditemukan.");
  return event;
}

function requireSession(store: AppStore, sessionId: string) {
  const session = store.sessions.find((item) => item.id === sessionId);
  assert(session, "Sesi tidak ditemukan.");
  return session;
}

function requireGuest(store: AppStore, guestId: string) {
  const guest = store.guests.find((item) => item.id === guestId);
  assert(guest, "Tamu tidak ditemukan.");
  return guest;
}

function requireSeat(store: AppStore, seatId: string) {
  const seat = store.seats.find((item) => item.id === seatId);
  assert(seat, "Kursi tidak ditemukan.");
  return seat;
}

function getThemeForEvent(store: AppStore, eventId: string): EventTheme {
  const theme = store.themes.find((item) => item.eventId === eventId);

  if (theme) {
    return theme;
  }

  const createdAt = nowIso();
  return {
    id: generateId("theme"),
    eventId,
    primaryColor: DEFAULT_THEME.primaryColor,
    secondaryColor: DEFAULT_THEME.secondaryColor,
    heroImageDataUrl: DEFAULT_THEME.heroImageDataUrl,
    backgroundImageDataUrl: DEFAULT_THEME.backgroundImageDataUrl,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildDefaultInvitationConfigForEvent(event: Event, theme: EventTheme, updatedBy: string) {
  return createDefaultInvitationConfig({
    eventId: event.id,
    updatedBy,
    brideName: event.brideName,
    groomName: event.groomName,
    welcomeMessage: event.welcomeMessage,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    heroImageDataUrl: theme.heroImageDataUrl,
    backgroundImageDataUrl: theme.backgroundImageDataUrl,
  });
}

function getInvitationConfigForEvent(store: AppStore, event: Event, updatedBy: string): InvitationConfig {
  const theme = getThemeForEvent(store, event.id);
  const existing = store.invitationConfigs.find((item) => item.eventId === event.id);

  if (!existing) {
    return buildDefaultInvitationConfigForEvent(event, theme, updatedBy);
  }

  return normalizeInvitationConfig(existing, {
    eventId: event.id,
    updatedBy,
    brideName: event.brideName,
    groomName: event.groomName,
    welcomeMessage: event.welcomeMessage,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    heroImageDataUrl: theme.heroImageDataUrl,
    backgroundImageDataUrl: theme.backgroundImageDataUrl,
  });
}

function createInvitationPreviewSnapshot(event: Event, sessions: Session[]) {
  const previewSession =
    sessions[0] ?? {
      id: "session-preview",
      eventId: event.id,
      label: "Sesi Preview",
      code: "S1",
      serial: 1,
      capacity: 6,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

  const seatLabels = Array.from({ length: 6 }, (_, index) => `${previewSession.code}-${String(index + 1).padStart(3, "0")}`);

  return {
    guest: {
      name: "Tamu Kehormatan",
    },
    session: previewSession,
    seats: seatLabels.map((seatLabel, index) => ({
      seatId: `preview-seat-${index + 1}`,
      seatLabel,
      seatNumber: index + 1,
      status: index === 0 || index === 3 ? ("locked" as const) : index === 4 ? ("booked" as const) : ("available" as const),
      occupantLabel: index === 3 || index === 4 ? "RS" : null,
      selectedByGuest: index === 0,
    })),
    currentLockSeatId: "preview-seat-1",
    booking: {
      id: "preview-booking",
      seatLabel: seatLabels[0],
      confirmedAt: nowIso(),
    },
  };
}

function getAccessibleEvents(store: AppStore, user: PublicAdminUser) {
  return store.events.filter((event) => {
    if (event.tenantId !== user.tenantId) {
      return false;
    }

    if (user.role === "superadmin") {
      return true;
    }

    return user.eventIds.includes(event.id);
  });
}

function assertEventAccess(store: AppStore, user: PublicAdminUser, eventId: string) {
  const event = requireEvent(store, eventId);
  assert(event.tenantId === user.tenantId, "Anda tidak memiliki akses ke event ini.");

  if (user.role === "event_admin") {
    assert(user.eventIds.includes(eventId), "Anda tidak memiliki akses ke event ini.");
  }

  return event;
}

function ensureUniqueSlug(store: AppStore, baseSlug: string) {
  let slug = baseSlug || "event-baru";
  let counter = 1;

  while (store.events.some((event) => event.slug === slug)) {
    counter += 1;
    slug = `${baseSlug || "event-baru"}-${counter}`;
  }

  return slug;
}

function getNextSessionSerial(store: AppStore, eventId: string) {
  const maxSerial = store.sessions
    .filter((session) => session.eventId === eventId)
    .reduce((highest, session) => Math.max(highest, session.serial), 0);

  return maxSerial + 1;
}

function createSeatsForSession(eventId: string, session: Session, start: number, end: number) {
  const seats: Seat[] = [];

  for (let seatNumber = start; seatNumber <= end; seatNumber += 1) {
    seats.push({
      id: generateId("seat"),
      eventId,
      sessionId: session.id,
      seatNumber,
      seatLabel: `${session.code}-${String(seatNumber).padStart(3, "0")}`,
      createdAt: nowIso(),
    });
  }

  return seats;
}

function getGuestActiveCredential(store: AppStore, guestId: string) {
  return store.qrCredentials
    .filter((credential) => credential.guestId === guestId && credential.active)
    .sort((left, right) => right.version - left.version)[0];
}

function deactivateActiveCredentials(store: AppStore, guestId: string) {
  const deactivatedAt = nowIso();
  for (const credential of store.qrCredentials) {
    if (credential.guestId === guestId && credential.active) {
      credential.active = false;
      credential.deactivatedAt = deactivatedAt;
    }
  }
}

function createQrCredential(store: AppStore, guest: Guest) {
  const nextVersion =
    store.qrCredentials
      .filter((credential) => credential.guestId === guest.id)
      .reduce((highest, credential) => Math.max(highest, credential.version), 0) + 1;

  const createdAt = nowIso();
  const credential: QrCredential = {
    id: generateId("qr"),
    eventId: guest.eventId,
    guestId: guest.id,
    sessionId: guest.sessionId,
    token: generateToken(24),
    version: nextVersion,
    active: true,
    createdAt,
    deactivatedAt: null,
  };

  store.qrCredentials.push(credential);
  return credential;
}

function getGuestBooking(store: AppStore, guest: Guest) {
  if (!guest.finalBookingId) {
    return null;
  }

  return store.seatBookings.find((booking) => booking.id === guest.finalBookingId) ?? null;
}

function getEventBookingsMap(store: AppStore, eventId: string) {
  const bookings = new Map<string, SeatBooking>();
  for (const booking of store.seatBookings) {
    if (booking.eventId === eventId) {
      bookings.set(booking.seatId, booking);
    }
  }
  return bookings;
}

function getEventLocksMap(store: AppStore, eventId: string) {
  const locks = new Map<string, SeatLock>();
  for (const lock of store.seatLocks) {
    if (lock.eventId === eventId) {
      locks.set(lock.seatId, lock);
    }
  }
  return locks;
}

function buildSeatStates(store: AppStore, eventId: string, sessionId: string, guestId: string | null) {
  const seats = store.seats
    .filter((seat) => seat.eventId === eventId && seat.sessionId === sessionId)
    .sort((left, right) => left.seatNumber - right.seatNumber);
  const bookingsMap = getEventBookingsMap(store, eventId);
  const locksMap = getEventLocksMap(store, eventId);

  return seats.map<SeatState>((seat) => {
    const booking = bookingsMap.get(seat.id);
    if (booking) {
      const bookingGuest = requireGuest(store, booking.guestId);
      return {
        seatId: seat.id,
        seatLabel: seat.seatLabel,
        seatNumber: seat.seatNumber,
        status: "booked",
        occupantLabel: initialsFromName(bookingGuest.name),
        selectedByGuest: guestId === booking.guestId,
      };
    }

    const lock = locksMap.get(seat.id);
    if (lock) {
      const lockGuest = requireGuest(store, lock.guestId);
      return {
        seatId: seat.id,
        seatLabel: seat.seatLabel,
        seatNumber: seat.seatNumber,
        status: "locked",
        occupantLabel: initialsFromName(lockGuest.name),
        selectedByGuest: guestId === lock.guestId,
      };
    }

    return {
      seatId: seat.id,
      seatLabel: seat.seatLabel,
      seatNumber: seat.seatNumber,
      status: "available",
      occupantLabel: null,
      selectedByGuest: false,
    };
  });
}

function getDashboardMetricsFromStore(store: AppStore, eventId: string): DashboardMetrics {
  const guests = store.guests.filter((guest) => guest.eventId === eventId);
  const sessions = store.sessions
    .filter((session) => session.eventId === eventId)
    .sort((left, right) => left.serial - right.serial);

  const sessionMetrics = sessions.map((session) => {
    const allocatedGuests = guests.filter((guest) => guest.sessionId === session.id).length;
    const bookedSeats = store.seatBookings.filter((booking) => booking.sessionId === session.id).length;
    const remainingSeats = Math.max(session.capacity - bookedSeats, 0);
    return {
      sessionId: session.id,
      label: session.label,
      code: session.code,
      capacity: session.capacity,
      allocatedGuests,
      bookedSeats,
      remainingSeats,
      isFull: bookedSeats >= session.capacity,
      isAlmostFull: bookedSeats < session.capacity && remainingSeats <= Math.max(1, Math.ceil(session.capacity * 0.1)),
    };
  });

  return {
    totalGuests: guests.length,
    totalInvitationsSent: guests.filter((guest) => guest.inviteStatus === "sent").length,
    totalBookings: store.seatBookings.filter((booking) => booking.eventId === eventId).length,
    totalRemainingSeats: sessionMetrics.reduce((sum, metric) => sum + metric.remainingSeats, 0),
    sessions: sessionMetrics,
  };
}

function parseInviteStatus(value: unknown): GuestInviteStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["sent", "terkirim", "done", "ya", "yes"].includes(normalized)) {
    return "sent";
  }

  if (["pending", "draft", "belum", ""].includes(normalized)) {
    return "pending";
  }

  throw new Error("Status undangan harus bernilai pending atau sent.");
}

function createGuestRecord(
  store: AppStore,
  eventId: string,
  sessionId: string,
  name: string,
  inviteStatus: GuestInviteStatus,
  isActive: boolean,
) {
  const createdAt = nowIso();
  const guest: Guest = {
    id: generateId("guest"),
    eventId,
    sessionId,
    name,
    inviteStatus,
    isActive,
    finalBookingId: null,
    createdAt,
    updatedAt: createdAt,
  };

  store.guests.push(guest);
  const credential = createQrCredential(store, guest);
  return { guest, credential };
}

function getGuestPortalSnapshotFromStore(store: AppStore, token: string) {
  const credential = store.qrCredentials.find((item) => item.token === token && item.active);
  assert(credential, "QR tidak valid atau sudah tidak aktif.");

  const guest = requireGuest(store, credential.guestId);
  assert(guest.isActive, "Tamu ini sudah tidak aktif.");
  const event = requireEvent(store, credential.eventId);
  const session = requireSession(store, guest.sessionId);
  assert(session.eventId === event.id, "Sesi tamu tidak valid.");

  const theme = getThemeForEvent(store, event.id);
  const invitationConfig = getInvitationConfigForEvent(store, event, event.createdByUserId || "system");
  const booking = getGuestBooking(store, guest);
  const bookingSeat = booking ? requireSeat(store, booking.seatId) : null;
  const activeLock =
    store.seatLocks.find((lock) => lock.guestId === guest.id && lock.token === token) ?? null;
  const currentLockSeat = activeLock ? requireSeat(store, activeLock.seatId) : null;

  return {
    credential,
    guest,
    event,
    session,
    theme,
    invitationConfig,
    booking,
    bookingSeat,
    currentLockSeat,
    seats: buildSeatStates(store, event.id, session.id, guest.id),
  };
}

export function toPublicAdminUser(user: AdminUser): PublicAdminUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    eventIds: [...user.eventIds],
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function verifyAdminLogin(email: string, password: string) {
  const store = await readStore();
  const normalizedEmail = email.trim().toLowerCase();
  const user = store.users.find((item) => item.email.toLowerCase() === normalizedEmail && item.active);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return toPublicAdminUser(user);
}

export async function getAdminUserById(userId: string) {
  const store = await readStore();
  const user = store.users.find((item) => item.id === userId && item.active);
  return user ? toPublicAdminUser(user) : null;
}

export async function listAdminEvents(user: PublicAdminUser) {
  const store = await readStore();

  return getAccessibleEvents(store, user)
    .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
    .map((event) => {
      const theme = getThemeForEvent(store, event.id);
      return {
        event,
        theme,
        metrics: getDashboardMetricsFromStore(store, event.id),
      };
    });
}

export async function getEventWorkspace(user: PublicAdminUser, eventId: string) {
  const store = await readStore();
  const event = assertEventAccess(store, user, eventId);
  const theme = getThemeForEvent(store, event.id);
  const invitationConfig = getInvitationConfigForEvent(store, event, user.id);
  const sessions = store.sessions
    .filter((session) => session.eventId === event.id)
    .sort((left, right) => left.serial - right.serial);
  const guests = store.guests
    .filter((guest) => guest.eventId === event.id)
    .sort((left, right) => left.name.localeCompare(right.name));
  const metrics = getDashboardMetricsFromStore(store, event.id);
  const recentAuditLogs = store.auditLogs
    .filter((log) => log.eventId === event.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 12);

  return {
    event,
    theme,
    invitationConfig,
    sessions,
    guests: guests.map((guest) => {
      const session = requireSession(store, guest.sessionId);
      const booking = getGuestBooking(store, guest);
      const bookingSeat = booking ? requireSeat(store, booking.seatId) : null;
      const activeQr = getGuestActiveCredential(store, guest.id);
      return {
        ...guest,
        sessionLabel: `${session.code} - ${session.label}`,
        bookingSeatLabel: bookingSeat?.seatLabel ?? null,
        activeQrToken: activeQr?.token ?? null,
      };
    }),
    metrics,
    recentAuditLogs,
    canManageAllEvents: user.role === "superadmin",
  };
}

export async function getDashboardMetrics(user: PublicAdminUser, eventId: string) {
  const store = await readStore();
  assertEventAccess(store, user, eventId);
  return getDashboardMetricsFromStore(store, eventId);
}

export async function createEvent(
  user: PublicAdminUser,
  input: {
    title: string;
    brideName: string;
    groomName: string;
    eventDate: string;
    venueName: string;
    welcomeMessage: string;
    guestTargetTotal: number;
    primaryColor?: string;
    secondaryColor?: string;
    heroImageDataUrl?: string;
    backgroundImageDataUrl?: string;
    initialSessionLabel: string;
    initialSessionCapacity: number;
    eventAdminName: string;
    eventAdminEmail: string;
    eventAdminPassword: string;
  },
) {
  assert(user.role === "superadmin", "Hanya superadmin yang dapat membuat event baru.");

  return withStoreMutation((store) => {
    const title = input.title.trim();
    const brideName = input.brideName.trim();
    const groomName = input.groomName.trim();
    const eventDate = input.eventDate.trim();
    const venueName = input.venueName.trim();
    const welcomeMessage = input.welcomeMessage.trim();
    const initialSessionLabel = input.initialSessionLabel.trim();
    const eventAdminName = input.eventAdminName.trim();
    const eventAdminEmail = input.eventAdminEmail.trim().toLowerCase();
    const eventAdminPassword = input.eventAdminPassword.trim();

    assert(title, "Nama event wajib diisi.");
    assert(brideName, "Nama mempelai wanita wajib diisi.");
    assert(groomName, "Nama mempelai pria wajib diisi.");
    assert(eventDate, "Tanggal acara wajib diisi.");
    assert(venueName, "Lokasi acara wajib diisi.");
    assert(initialSessionLabel, "Sesi awal wajib diisi.");
    assert(eventAdminName, "Nama event admin wajib diisi.");
    assert(eventAdminEmail, "Email event admin wajib diisi.");
    assert(eventAdminPassword.length >= 8, "Password event admin minimal 8 karakter.");
    assert(
      !store.users.some((existingUser) => existingUser.email.toLowerCase() === eventAdminEmail),
      "Email event admin sudah terpakai.",
    );

    const createdAt = nowIso();
    const eventId = generateId("event");
    const slug = ensureUniqueSlug(store, slugify(title));
    const sessionSerial = getNextSessionSerial(store, eventId);
    const session: Session = {
      id: generateId("session"),
      eventId,
      label: initialSessionLabel,
      code: `S${sessionSerial}`,
      serial: sessionSerial,
      capacity: parsePositiveInteger(input.initialSessionCapacity, "Kapasitas sesi"),
      createdAt,
      updatedAt: createdAt,
    };
    const event: Event = {
      id: eventId,
      tenantId: user.tenantId,
      slug,
      title,
      brideName,
      groomName,
      eventDate,
      venueName,
      welcomeMessage,
      guestTargetTotal: parsePositiveInteger(input.guestTargetTotal, "Target tamu"),
      createdByUserId: user.id,
      createdAt,
      updatedAt: createdAt,
    };
    const theme: EventTheme = {
      id: generateId("theme"),
      eventId,
      primaryColor: sanitizeColor(input.primaryColor, DEFAULT_THEME.primaryColor),
      secondaryColor: sanitizeColor(input.secondaryColor, DEFAULT_THEME.secondaryColor),
      heroImageDataUrl: sanitizeDataUrl(input.heroImageDataUrl ?? ""),
      backgroundImageDataUrl: sanitizeDataUrl(input.backgroundImageDataUrl ?? ""),
      createdAt,
      updatedAt: createdAt,
    };
    const eventAdmin: AdminUser = {
      id: generateId("admin"),
      tenantId: user.tenantId,
      name: eventAdminName,
      email: eventAdminEmail,
      role: "event_admin",
      passwordHash: hashPassword(eventAdminPassword),
      eventIds: [eventId],
      active: true,
      createdAt,
      updatedAt: createdAt,
    };
    const invitationConfig = buildDefaultInvitationConfigForEvent(event, theme, user.id);

    store.events.push(event);
    store.themes.push(theme);
    store.invitationConfigs.push(invitationConfig);
    store.sessions.push(session);
    store.seats.push(...createSeatsForSession(eventId, session, 1, session.capacity));
    store.users.push(eventAdmin);

    appendAuditLog(
      store,
      "admin",
      user.id,
      "event.created",
      {
        eventId,
        title,
        sessionId: session.id,
        sessionCode: session.code,
        sessionCapacity: session.capacity,
        eventAdminEmail,
      },
      eventId,
    );

    return {
      eventId,
      slug,
    };
  });
}

export async function updateEventDetails(
  user: PublicAdminUser,
  eventId: string,
  input: {
    title: string;
    brideName: string;
    groomName: string;
    eventDate: string;
    venueName: string;
    welcomeMessage: string;
    guestTargetTotal: number;
  },
) {
  return withStoreMutation((store) => {
    const event = assertEventAccess(store, user, eventId);
    event.title = input.title.trim();
    event.brideName = input.brideName.trim();
    event.groomName = input.groomName.trim();
    event.eventDate = input.eventDate.trim();
    event.venueName = input.venueName.trim();
    event.welcomeMessage = input.welcomeMessage.trim();
    event.guestTargetTotal = parsePositiveInteger(input.guestTargetTotal, "Target tamu");
    event.updatedAt = nowIso();

    assert(event.title, "Nama event wajib diisi.");
    assert(event.brideName, "Nama mempelai wanita wajib diisi.");
    assert(event.groomName, "Nama mempelai pria wajib diisi.");
    assert(event.eventDate, "Tanggal acara wajib diisi.");
    assert(event.venueName, "Lokasi acara wajib diisi.");

    appendAuditLog(
      store,
      "admin",
      user.id,
      "event.updated",
      {
        eventId,
        guestTargetTotal: event.guestTargetTotal,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function updateEventTheme(
  user: PublicAdminUser,
  eventId: string,
  input: {
    primaryColor?: string;
    secondaryColor?: string;
    heroImageDataUrl?: string;
    backgroundImageDataUrl?: string;
  },
) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    let theme = store.themes.find((item) => item.eventId === eventId);

    if (!theme) {
      const createdAt = nowIso();
      theme = {
        id: generateId("theme"),
        eventId,
        primaryColor: DEFAULT_THEME.primaryColor,
        secondaryColor: DEFAULT_THEME.secondaryColor,
        heroImageDataUrl: "",
        backgroundImageDataUrl: "",
        createdAt,
        updatedAt: createdAt,
      };
      store.themes.push(theme);
    }

    theme.primaryColor = sanitizeColor(input.primaryColor, theme.primaryColor);
    theme.secondaryColor = sanitizeColor(input.secondaryColor, theme.secondaryColor);
    theme.heroImageDataUrl = sanitizeDataUrl(input.heroImageDataUrl ?? theme.heroImageDataUrl);
    theme.backgroundImageDataUrl = sanitizeDataUrl(
      input.backgroundImageDataUrl ?? theme.backgroundImageDataUrl,
    );
    theme.updatedAt = nowIso();

    appendAuditLog(
      store,
      "admin",
      user.id,
      "theme.updated",
      {
        eventId,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function getInvitationBuilderWorkspace(user: PublicAdminUser, eventId: string) {
  const store = await readStore();
  const event = assertEventAccess(store, user, eventId);
  const theme = getThemeForEvent(store, event.id);
  const sessions = store.sessions
    .filter((session) => session.eventId === event.id)
    .sort((left, right) => left.serial - right.serial);
  const invitationConfig = getInvitationConfigForEvent(store, event, user.id);
  const preview = createInvitationPreviewSnapshot(event, sessions);

  return {
    event,
    theme,
    sessions,
    invitationConfig,
    preview,
  };
}

export async function saveInvitationConfig(
  user: PublicAdminUser,
  eventId: string,
  input: Partial<InvitationConfig> | Record<string, unknown>,
) {
  return withStoreMutation((store) => {
    const event = assertEventAccess(store, user, eventId);
    const theme = getThemeForEvent(store, event.id);
    const normalized = normalizeInvitationConfig(input, {
      eventId: event.id,
      updatedBy: user.id,
      brideName: event.brideName,
      groomName: event.groomName,
      welcomeMessage: event.welcomeMessage,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      heroImageDataUrl: theme.heroImageDataUrl,
      backgroundImageDataUrl: theme.backgroundImageDataUrl,
    });
    normalized.updatedAt = nowIso();
    normalized.updatedBy = user.id;

    const existingIndex = store.invitationConfigs.findIndex((item) => item.eventId === event.id);
    if (existingIndex >= 0) {
      store.invitationConfigs[existingIndex] = normalized;
    } else {
      store.invitationConfigs.push(normalized);
    }

    appendAuditLog(
      store,
      "admin",
      user.id,
      "invitation_config.updated",
      {
        eventId,
        preset: normalized.globalStyle.preset,
      },
      eventId,
    );

    return {
      success: true,
      invitationConfig: normalized,
    };
  });
}

export async function createSession(
  user: PublicAdminUser,
  eventId: string,
  input: {
    label: string;
    capacity: number;
  },
) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const label = input.label.trim();
    assert(label, "Label sesi wajib diisi.");

    const createdAt = nowIso();
    const serial = getNextSessionSerial(store, eventId);
    const session: Session = {
      id: generateId("session"),
      eventId,
      label,
      code: `S${serial}`,
      serial,
      capacity: parsePositiveInteger(input.capacity, "Kapasitas sesi"),
      createdAt,
      updatedAt: createdAt,
    };

    store.sessions.push(session);
    store.seats.push(...createSeatsForSession(eventId, session, 1, session.capacity));

    appendAuditLog(
      store,
      "admin",
      user.id,
      "session.created",
      {
        eventId,
        sessionId: session.id,
        code: session.code,
        capacity: session.capacity,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function updateSession(
  user: PublicAdminUser,
  eventId: string,
  sessionId: string,
  input: {
    label: string;
    capacity: number;
  },
) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const session = requireSession(store, sessionId);
    assert(session.eventId === eventId, "Sesi tidak ditemukan di event ini.");
    const nextCapacity = parsePositiveInteger(input.capacity, "Kapasitas sesi");

    if (nextCapacity < session.capacity) {
      const seatsToRemove = store.seats.filter(
        (seat) => seat.sessionId === session.id && seat.seatNumber > nextCapacity,
      );
      const seatIdsToRemove = new Set(seatsToRemove.map((seat) => seat.id));
      assert(
        !store.seatBookings.some((booking) => seatIdsToRemove.has(booking.seatId)),
        "Kapasitas baru memotong kursi yang sudah terisi. Reset booking terlebih dahulu.",
      );
      assert(
        !store.seatLocks.some((lock) => seatIdsToRemove.has(lock.seatId)),
        "Kapasitas baru memotong kursi yang sedang terkunci sementara.",
      );

      store.seats = store.seats.filter(
        (seat) => seat.sessionId !== session.id || seat.seatNumber <= nextCapacity,
      );
    }

    if (nextCapacity > session.capacity) {
      store.seats.push(...createSeatsForSession(eventId, session, session.capacity + 1, nextCapacity));
    }

    session.label = input.label.trim();
    session.capacity = nextCapacity;
    session.updatedAt = nowIso();
    assert(session.label, "Label sesi wajib diisi.");

    appendAuditLog(
      store,
      "admin",
      user.id,
      "session.updated",
      {
        eventId,
        sessionId: session.id,
        capacity: session.capacity,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function deleteSession(user: PublicAdminUser, eventId: string, sessionId: string) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const session = requireSession(store, sessionId);
    assert(session.eventId === eventId, "Sesi tidak ditemukan di event ini.");

    assert(
      !store.guests.some((guest) => guest.sessionId === session.id && guest.isActive),
      "Masih ada tamu aktif pada sesi ini. Pindahkan atau nonaktifkan dulu.",
    );
    assert(
      !store.guests.some((guest) => guest.sessionId === session.id && !guest.isActive),
      "Masih ada data tamu nonaktif pada sesi ini. Bersihkan atau pindahkan dulu sebelum menghapus sesi.",
    );
    assert(
      !store.seatLocks.some((lock) => lock.sessionId === session.id),
      "Masih ada kursi yang sedang terkunci di sesi ini.",
    );
    assert(
      !store.seatBookings.some((booking) => booking.sessionId === session.id),
      "Masih ada kursi yang sudah terisi di sesi ini.",
    );

    store.sessions = store.sessions.filter((item) => item.id !== session.id);
    store.seats = store.seats.filter((seat) => seat.sessionId !== session.id);

    appendAuditLog(
      store,
      "admin",
      user.id,
      "session.deleted",
      {
        eventId,
        sessionId: session.id,
        code: session.code,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function createGuest(
  user: PublicAdminUser,
  eventId: string,
  input: {
    name: string;
    sessionId: string;
    inviteStatus: GuestInviteStatus;
    isActive: boolean;
  },
) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const session = requireSession(store, input.sessionId);
    assert(session.eventId === eventId, "Sesi tamu tidak valid.");
    const name = input.name.trim();
    assert(name, "Nama tamu wajib diisi.");

    const result = createGuestRecord(
      store,
      eventId,
      session.id,
      name,
      input.inviteStatus,
      input.isActive,
    );

    appendAuditLog(
      store,
      "admin",
      user.id,
      "guest.created",
      {
        eventId,
        guestId: result.guest.id,
        sessionId: session.id,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function updateGuest(
  user: PublicAdminUser,
  eventId: string,
  guestId: string,
  input: {
    name: string;
    sessionId: string;
    inviteStatus: GuestInviteStatus;
    isActive: boolean;
  },
) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const guest = requireGuest(store, guestId);
    assert(guest.eventId === eventId, "Tamu tidak ditemukan di event ini.");
    const nextSession = requireSession(store, input.sessionId);
    assert(nextSession.eventId === eventId, "Sesi tamu tidak valid.");

    const previousSessionId = guest.sessionId;
    if (previousSessionId !== nextSession.id) {
      assert(!guest.finalBookingId, "Reset booking dulu sebelum memindahkan tamu ke sesi lain.");
      store.seatLocks = store.seatLocks.filter((lock) => lock.guestId !== guest.id);
      guest.sessionId = nextSession.id;
      deactivateActiveCredentials(store, guest.id);
      createQrCredential(store, guest);
    }

    guest.name = input.name.trim();
    guest.inviteStatus = input.inviteStatus;
    guest.isActive = input.isActive;
    guest.updatedAt = nowIso();
    assert(guest.name, "Nama tamu wajib diisi.");

    if (!getGuestActiveCredential(store, guest.id)) {
      createQrCredential(store, guest);
    }

    appendAuditLog(
      store,
      "admin",
      user.id,
      "guest.updated",
      {
        eventId,
        guestId: guest.id,
        previousSessionId,
        nextSessionId: nextSession.id,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function importGuests(
  user: PublicAdminUser,
  eventId: string,
  rows: Record<string, unknown>[],
) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const sessions = store.sessions.filter((session) => session.eventId === eventId);
    const errors: string[] = [];
    let createdCount = 0;

    rows.forEach((row, index) => {
      try {
        const normalizedEntries = Object.entries(row).map(([key, value]) => [
          normalizeHeader(key),
          value,
        ] as const);
        const normalizedRow = Object.fromEntries(normalizedEntries);
        const name = String(
          normalizedRow["nama tamu"] ??
            normalizedRow["name"] ??
            normalizedRow["guest name"] ??
            "",
        ).trim();
        const sessionValue = String(
          normalizedRow["sesi"] ??
            normalizedRow["session"] ??
            normalizedRow["session label"] ??
            "",
        ).trim();
        const activeValue =
          normalizedRow["status aktif"] ??
          normalizedRow["active"] ??
          normalizedRow["aktif"] ??
          true;
        const inviteValue =
          normalizedRow["status undangan terkirim"] ??
          normalizedRow["undangan terkirim"] ??
          normalizedRow["invite status"] ??
          "pending";

        assert(name, "Nama tamu wajib ada.");
        const session = sessions.find(
          (item) =>
            item.id === sessionValue ||
            item.code.toLowerCase() === sessionValue.toLowerCase() ||
            item.label.toLowerCase() === sessionValue.toLowerCase(),
        );
        assert(session, `Sesi "${sessionValue}" tidak ditemukan.`);
        const isActive = parseBooleanLike(activeValue);
        assert(isActive !== null, "Status aktif harus berupa true/false atau aktif/nonaktif.");
        const inviteStatus = parseInviteStatus(inviteValue);

        createGuestRecord(store, eventId, session.id, name, inviteStatus, isActive);
        createdCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Baris tidak valid.";
        errors.push(`Baris ${index + 2}: ${message}`);
      }
    });

    appendAuditLog(
      store,
      "admin",
      user.id,
      "guest.imported",
      {
        eventId,
        createdCount,
        failedCount: errors.length,
      },
      eventId,
    );

    return {
      createdCount,
      errors,
    };
  });
}

export async function regenerateGuestQr(user: PublicAdminUser, eventId: string, guestId: string) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const guest = requireGuest(store, guestId);
    assert(guest.eventId === eventId, "Tamu tidak ditemukan di event ini.");

    deactivateActiveCredentials(store, guest.id);
    const credential = createQrCredential(store, guest);

    appendAuditLog(
      store,
      "admin",
      user.id,
      "guest.qr_regenerated",
      {
        eventId,
        guestId,
        qrId: credential.id,
      },
      eventId,
    );

    return {
      token: credential.token,
    };
  });
}

export async function resetGuestBooking(user: PublicAdminUser, eventId: string, guestId: string) {
  return withStoreMutation((store) => {
    assertEventAccess(store, user, eventId);
    const guest = requireGuest(store, guestId);
    assert(guest.eventId === eventId, "Tamu tidak ditemukan di event ini.");

    if (guest.finalBookingId) {
      store.seatBookings = store.seatBookings.filter((booking) => booking.id !== guest.finalBookingId);
      guest.finalBookingId = null;
    }

    store.seatLocks = store.seatLocks.filter((lock) => lock.guestId !== guest.id);
    guest.updatedAt = nowIso();

    appendAuditLog(
      store,
      "admin",
      user.id,
      "guest.booking_reset",
      {
        eventId,
        guestId,
      },
      eventId,
    );

    return {
      success: true,
    };
  });
}

export async function getGuestPortal(token: string) {
  const store = await readStore();
  const snapshot = getGuestPortalSnapshotFromStore(store, token);

  return {
    guest: snapshot.guest,
    event: snapshot.event,
    session: snapshot.session,
    theme: snapshot.theme,
    invitationConfig: snapshot.invitationConfig,
    seats: snapshot.seats,
    currentLockSeatId: snapshot.currentLockSeat?.id ?? null,
    booking: snapshot.booking
      ? {
          id: snapshot.booking.id,
          seatLabel: snapshot.bookingSeat?.seatLabel ?? null,
          confirmedAt: snapshot.booking.confirmedAt,
        }
      : null,
  };
}

export async function getGuestTicket(token: string) {
  const store = await readStore();
  const snapshot = getGuestPortalSnapshotFromStore(store, token);
  assert(snapshot.booking && snapshot.bookingSeat, "Tiket belum tersedia untuk QR ini.");

  return {
    guest: snapshot.guest,
    event: snapshot.event,
    session: snapshot.session,
    theme: snapshot.theme,
    invitationConfig: snapshot.invitationConfig,
    booking: snapshot.booking,
    bookingSeat: snapshot.bookingSeat,
  };
}

export async function getGuestQrDetails(user: PublicAdminUser, eventId: string, guestId: string) {
  const store = await readStore();
  assertEventAccess(store, user, eventId);
  const guest = requireGuest(store, guestId);
  assert(guest.eventId === eventId, "Tamu tidak ditemukan di event ini.");
  const event = requireEvent(store, eventId);
  const session = requireSession(store, guest.sessionId);
  const credential = getGuestActiveCredential(store, guest.id);
  assert(credential, "QR aktif untuk tamu ini tidak ditemukan.");

  return {
    guest,
    event,
    session,
    credential,
  };
}

export async function lockSeat(token: string, seatId: string) {
  return withStoreMutation((store) => {
    const snapshot = getGuestPortalSnapshotFromStore(store, token);
    assert(!snapshot.booking, "Booking sudah final dan tidak bisa diubah lagi.");
    const seat = requireSeat(store, seatId);

    assert(seat.eventId === snapshot.event.id, "Kursi tidak valid untuk event ini.");
    assert(seat.sessionId === snapshot.session.id, "Anda tidak bisa mengakses kursi di sesi lain.");

    const existingBooking = store.seatBookings.find((booking) => booking.seatId === seat.id);
    assert(!existingBooking, "Kursi ini sudah terisi.");

    const existingLock = store.seatLocks.find((lock) => lock.seatId === seat.id);
    assert(
      !existingLock || existingLock.guestId === snapshot.guest.id,
      "Kursi ini sedang dikunci sementara oleh tamu lain.",
    );

    store.seatLocks = store.seatLocks.filter(
      (lock) => lock.guestId !== snapshot.guest.id && lock.seatId !== seat.id,
    );

    const issuedAt = nowIso();
    store.seatLocks.push({
      id: generateId("lock"),
      eventId: snapshot.event.id,
      sessionId: snapshot.session.id,
      seatId: seat.id,
      guestId: snapshot.guest.id,
      token,
      expiresAt: addMinutes(issuedAt, LOCK_DURATION_MINUTES),
      createdAt: issuedAt,
    });

    const nextSnapshot = getGuestPortalSnapshotFromStore(store, token);
    return {
      seats: nextSnapshot.seats,
      currentLockSeatId: nextSnapshot.currentLockSeat?.id ?? null,
    };
  });
}

export async function confirmSeat(token: string, seatId: string) {
  return withStoreMutation((store) => {
    const snapshot = getGuestPortalSnapshotFromStore(store, token);
    assert(!snapshot.booking, "Booking sudah final dan tidak bisa diubah lagi.");
    const seat = requireSeat(store, seatId);

    assert(seat.eventId === snapshot.event.id, "Kursi tidak valid untuk event ini.");
    assert(seat.sessionId === snapshot.session.id, "Anda tidak bisa mengakses kursi di sesi lain.");
    assert(
      store.seatLocks.some(
        (lock) => lock.seatId === seat.id && lock.guestId === snapshot.guest.id && lock.token === token,
      ),
      "Kursi ini tidak sedang Anda kunci. Silakan pilih ulang kursi.",
    );
    assert(
      !store.seatBookings.some((booking) => booking.seatId === seat.id),
      "Kursi ini sudah direservasi tamu lain.",
    );
    assert(snapshot.session.capacity > 0, "Sesi ini tidak memiliki kapasitas kursi.");
    assert(
      store.seatBookings.filter((booking) => booking.sessionId === snapshot.session.id).length <
        snapshot.session.capacity,
      "Kuota sesi ini sudah penuh.",
    );

    const confirmedAt = nowIso();
    const booking: SeatBooking = {
      id: generateId("booking"),
      eventId: snapshot.event.id,
      sessionId: snapshot.session.id,
      seatId: seat.id,
      guestId: snapshot.guest.id,
      confirmedAt,
    };

    store.seatBookings.push(booking);
    store.seatLocks = store.seatLocks.filter((lock) => lock.guestId !== snapshot.guest.id);
    snapshot.guest.finalBookingId = booking.id;
    snapshot.guest.updatedAt = confirmedAt;

    appendAuditLog(
      store,
      "guest",
      snapshot.guest.id,
      "guest.booking_confirmed",
      {
        eventId: snapshot.event.id,
        guestId: snapshot.guest.id,
        sessionId: snapshot.session.id,
        seatId: seat.id,
        seatLabel: seat.seatLabel,
      },
      snapshot.event.id,
    );

    return {
      seatLabel: seat.seatLabel,
      ticketUrl: `/guest/${token}/ticket`,
    };
  });
}
