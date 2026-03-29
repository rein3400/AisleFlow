import type { GuestInviteStatus } from "@/lib/types";

export type AdminEventDirectorySort = "event-date" | "bookings-desc";

export interface AdminEventDirectoryItem {
  event: {
    id: string;
    title: string;
    brideName: string;
    groomName: string;
    eventDate: string;
    venueName: string;
  };
  metrics: {
    totalGuests: number;
    totalBookings: number;
    totalInvitationsSent: number;
  };
}

export interface AdminEventDirectoryFilters {
  search: string;
  sort: AdminEventDirectorySort;
}

export type AdminGuestActiveState = "all" | "active" | "inactive";
export type AdminGuestBookingState = "all" | "booked" | "unbooked";

export interface AdminGuestFilterState {
  search: string;
  sessionId: string;
  inviteStatus: GuestInviteStatus | "all";
  activeState: AdminGuestActiveState;
  bookingState: AdminGuestBookingState;
}

export interface AdminGuestListItem {
  id: string;
  name: string;
  sessionId: string;
  inviteStatus: GuestInviteStatus;
  isActive: boolean;
  bookingSeatLabel: string | null;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function compareEventDate(left: string, right: string) {
  return left.localeCompare(right);
}

export function filterAndSortAdminEvents<T extends AdminEventDirectoryItem>(
  events: T[],
  filters: AdminEventDirectoryFilters,
) {
  const search = normalizeText(filters.search);
  const filtered = events.filter((item) => {
    if (!search) {
      return true;
    }

    const haystacks = [
      item.event.title,
      item.event.brideName,
      item.event.groomName,
      item.event.venueName,
      `${item.event.brideName} ${item.event.groomName}`,
      `${item.event.groomName} ${item.event.brideName}`,
    ];

    return haystacks.some((value) => normalizeText(value).includes(search));
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === "bookings-desc") {
      return right.metrics.totalBookings - left.metrics.totalBookings;
    }

    return compareEventDate(left.event.eventDate, right.event.eventDate);
  });
}

export function filterGuests<T extends AdminGuestListItem>(guests: T[], filters: AdminGuestFilterState): T[] {
  const search = normalizeText(filters.search);

  return guests.filter((guest) => {
    if (search && !normalizeText(guest.name).includes(search)) {
      return false;
    }

    if (filters.sessionId !== "all" && guest.sessionId !== filters.sessionId) {
      return false;
    }

    if (filters.inviteStatus !== "all" && guest.inviteStatus !== filters.inviteStatus) {
      return false;
    }

    if (filters.activeState === "active" && !guest.isActive) {
      return false;
    }

    if (filters.activeState === "inactive" && guest.isActive) {
      return false;
    }

    if (filters.bookingState === "booked" && !guest.bookingSeatLabel) {
      return false;
    }

    if (filters.bookingState === "unbooked" && guest.bookingSeatLabel) {
      return false;
    }

    return true;
  });
}
