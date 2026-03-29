import { describe, expect, it } from "vitest";

import {
  filterAndSortAdminEvents,
  filterGuests,
  type AdminEventDirectoryItem,
  type AdminGuestFilterState,
  type AdminGuestListItem,
} from "@/lib/admin-ui";

const events: AdminEventDirectoryItem[] = [
  {
    event: {
      id: "evt-1",
      title: "Pernikahan Raka & Dita",
      brideName: "Dita",
      groomName: "Raka",
      eventDate: "2026-06-20",
      venueName: "Gedung Melati",
    },
    metrics: {
      totalGuests: 300,
      totalBookings: 120,
      totalInvitationsSent: 150,
    },
  },
  {
    event: {
      id: "evt-2",
      title: "Akad Nadia & Arga",
      brideName: "Nadia",
      groomName: "Arga",
      eventDate: "2026-05-10",
      venueName: "The Manor",
    },
    metrics: {
      totalGuests: 200,
      totalBookings: 180,
      totalInvitationsSent: 190,
    },
  },
  {
    event: {
      id: "evt-3",
      title: "Resepsi Kinan & Bayu",
      brideName: "Kinan",
      groomName: "Bayu",
      eventDate: "2026-08-01",
      venueName: "Garden Terrace",
    },
    metrics: {
      totalGuests: 250,
      totalBookings: 75,
      totalInvitationsSent: 80,
    },
  },
];

const guests: AdminGuestListItem[] = [
  {
    id: "guest-1",
    name: "Nadia Putri",
    sessionId: "session-1",
    inviteStatus: "sent",
    isActive: true,
    bookingSeatLabel: "S1-001",
  },
  {
    id: "guest-2",
    name: "Arga Pratama",
    sessionId: "session-1",
    inviteStatus: "pending",
    isActive: false,
    bookingSeatLabel: null,
  },
  {
    id: "guest-3",
    name: "Kirana Dewi",
    sessionId: "session-2",
    inviteStatus: "sent",
    isActive: true,
    bookingSeatLabel: null,
  },
];

describe("admin UI helpers", () => {
  it("filters events by title, couple names, and venue", () => {
    expect(filterAndSortAdminEvents(events, { search: "nadia", sort: "event-date" }).map((item) => item.event.id)).toEqual([
      "evt-2",
    ]);
    expect(filterAndSortAdminEvents(events, { search: "garden", sort: "event-date" }).map((item) => item.event.id)).toEqual([
      "evt-3",
    ]);
  });

  it("sorts events by nearest event date by default", () => {
    expect(filterAndSortAdminEvents(events, { search: "", sort: "event-date" }).map((item) => item.event.id)).toEqual([
      "evt-2",
      "evt-1",
      "evt-3",
    ]);
  });

  it("supports alternative admin directory sorting", () => {
    expect(filterAndSortAdminEvents(events, { search: "", sort: "bookings-desc" }).map((item) => item.event.id)).toEqual([
      "evt-2",
      "evt-1",
      "evt-3",
    ]);
  });

  it("filters guests by combined toolbar criteria", () => {
    const filters: AdminGuestFilterState = {
      search: "nadia",
      sessionId: "session-1",
      inviteStatus: "sent",
      activeState: "active",
      bookingState: "booked",
    };

    expect(filterGuests(guests, filters).map((guest) => guest.id)).toEqual(["guest-1"]);
  });

  it("can isolate guests without bookings in a specific session", () => {
    const filters: AdminGuestFilterState = {
      search: "",
      sessionId: "session-2",
      inviteStatus: "all",
      activeState: "all",
      bookingState: "unbooked",
    };

    expect(filterGuests(guests, filters).map((guest) => guest.id)).toEqual(["guest-3"]);
  });
});
