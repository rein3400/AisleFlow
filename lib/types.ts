export type AdminRole = "superadmin" | "event_admin";

export type GuestInviteStatus = "pending" | "sent";

export type AuditActorType = "admin" | "guest" | "system";

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: AdminRole;
  passwordHash: string;
  eventIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAdminUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: AdminRole;
  eventIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  venueName: string;
  welcomeMessage: string;
  guestTargetTotal: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventTheme {
  id: string;
  eventId: string;
  primaryColor: string;
  secondaryColor: string;
  heroImageDataUrl: string;
  backgroundImageDataUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  eventId: string;
  label: string;
  code: string;
  serial: number;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: string;
  eventId: string;
  sessionId: string;
  seatNumber: number;
  seatLabel: string;
  createdAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  sessionId: string;
  name: string;
  inviteStatus: GuestInviteStatus;
  isActive: boolean;
  finalBookingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QrCredential {
  id: string;
  eventId: string;
  guestId: string;
  sessionId: string;
  token: string;
  version: number;
  active: boolean;
  createdAt: string;
  deactivatedAt: string | null;
}

export interface SeatLock {
  id: string;
  eventId: string;
  sessionId: string;
  seatId: string;
  guestId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface SeatBooking {
  id: string;
  eventId: string;
  sessionId: string;
  seatId: string;
  guestId: string;
  confirmedAt: string;
}

export interface AuditLog {
  id: string;
  eventId: string | null;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AppStore {
  tenants: Tenant[];
  users: AdminUser[];
  events: Event[];
  themes: EventTheme[];
  sessions: Session[];
  seats: Seat[];
  guests: Guest[];
  qrCredentials: QrCredential[];
  seatLocks: SeatLock[];
  seatBookings: SeatBooking[];
  auditLogs: AuditLog[];
}

export interface AdminSessionPayload {
  userId: string;
  issuedAt: string;
}

export interface DashboardSessionMetric {
  sessionId: string;
  label: string;
  code: string;
  capacity: number;
  allocatedGuests: number;
  bookedSeats: number;
  remainingSeats: number;
  isFull: boolean;
  isAlmostFull: boolean;
}

export interface DashboardMetrics {
  totalGuests: number;
  totalInvitationsSent: number;
  totalBookings: number;
  totalRemainingSeats: number;
  sessions: DashboardSessionMetric[];
}

export interface SeatState {
  seatId: string;
  seatLabel: string;
  seatNumber: number;
  status: "available" | "locked" | "booked";
  occupantLabel: string | null;
  selectedByGuest: boolean;
}
