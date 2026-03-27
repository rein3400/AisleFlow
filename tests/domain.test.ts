import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, afterEach, describe, expect, it } from "vitest";

import {
  confirmSeat,
  createEvent,
  createGuest,
  createSession,
  getAdminUserById,
  getEventWorkspace,
  getGuestPortal,
  importGuests,
  lockSeat,
  resetGuestBooking,
  updateSession,
} from "@/lib/domain";
import { readStore } from "@/lib/store";

let tempDir = "";

async function getSuperadmin() {
  const store = await readStore();
  const user = await getAdminUserById(store.users[0].id);
  if (!user) {
    throw new Error("Superadmin seed not found.");
  }

  return user;
}

async function bootstrapEvent() {
  const superadmin = await getSuperadmin();
  const created = await createEvent(superadmin, {
    title: "Wedding Raka Dita",
    brideName: "Dita",
    groomName: "Raka",
    eventDate: "2026-09-09",
    venueName: "Jakarta Ballroom",
    welcomeMessage: "Selamat datang di hari bahagia kami.",
    guestTargetTotal: 200,
    primaryColor: "#9f4f34",
    secondaryColor: "#f4e9da",
    heroImageDataUrl: "",
    backgroundImageDataUrl: "",
    initialSessionLabel: "Sesi 1",
    initialSessionCapacity: 2,
    eventAdminName: "WO Event",
    eventAdminEmail: "wo@example.com",
    eventAdminPassword: "eventadmin123",
  });

  return {
    superadmin,
    eventId: created.eventId,
  };
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "aisleflow-test-"));
  process.env.WEDDING_STORE_PATH = path.join(tempDir, "store.json");
});

afterEach(async () => {
  delete process.env.WEDDING_STORE_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

describe("domain rules", () => {
  it("prevents session leakage and double booking", async () => {
    const { superadmin, eventId } = await bootstrapEvent();
    await createSession(superadmin, eventId, {
      label: "Sesi 2",
      capacity: 1,
    });

    let workspace = await getEventWorkspace(superadmin, eventId);
    const firstSessionId = workspace.sessions[0].id;
    const secondSessionId = workspace.sessions[1].id;

    await createGuest(superadmin, eventId, {
      name: "Tamu Satu",
      sessionId: firstSessionId,
      inviteStatus: "sent",
      isActive: true,
    });
    await createGuest(superadmin, eventId, {
      name: "Tamu Dua",
      sessionId: firstSessionId,
      inviteStatus: "sent",
      isActive: true,
    });
    await createGuest(superadmin, eventId, {
      name: "Tamu Tiga",
      sessionId: secondSessionId,
      inviteStatus: "pending",
      isActive: true,
    });

    workspace = await getEventWorkspace(superadmin, eventId);
    const guestOneToken = workspace.guests.find((guest) => guest.name === "Tamu Satu")?.activeQrToken;
    const guestTwoToken = workspace.guests.find((guest) => guest.name === "Tamu Dua")?.activeQrToken;
    const guestThreeToken = workspace.guests.find((guest) => guest.name === "Tamu Tiga")?.activeQrToken;

    expect(guestOneToken).toBeTruthy();
    expect(guestTwoToken).toBeTruthy();
    expect(guestThreeToken).toBeTruthy();

    const portalOne = await getGuestPortal(guestOneToken!);
    const firstSeatId = portalOne.seats[0]?.seatId;
    expect(firstSeatId).toBeTruthy();

    const store = await readStore();
    const outOfSessionSeatId = store.seats.find((seat) => seat.sessionId === secondSessionId)?.id;
    expect(outOfSessionSeatId).toBeTruthy();

    await expect(lockSeat(guestOneToken!, outOfSessionSeatId!)).rejects.toThrow(/sesi lain/i);

    await lockSeat(guestOneToken!, firstSeatId!);
    await expect(lockSeat(guestTwoToken!, firstSeatId!)).rejects.toThrow(/dikunci sementara/i);
    await confirmSeat(guestOneToken!, firstSeatId!);
    await expect(lockSeat(guestTwoToken!, firstSeatId!)).rejects.toThrow(/sudah terisi/i);

    const portalThree = await getGuestPortal(guestThreeToken!);
    expect(portalThree.session.id).toBe(secondSessionId);
    expect(portalThree.seats).toHaveLength(1);
  });

  it("resets a final booking so the same guest can book again", async () => {
    const { superadmin, eventId } = await bootstrapEvent();
    let workspace = await getEventWorkspace(superadmin, eventId);
    const sessionId = workspace.sessions[0].id;

    await createGuest(superadmin, eventId, {
      name: "Resettable Guest",
      sessionId,
      inviteStatus: "sent",
      isActive: true,
    });

    workspace = await getEventWorkspace(superadmin, eventId);
    const guest = workspace.guests.find((item) => item.name === "Resettable Guest");
    expect(guest?.activeQrToken).toBeTruthy();

    const portal = await getGuestPortal(guest!.activeQrToken!);
    const seatId = portal.seats[0].seatId;
    await lockSeat(guest!.activeQrToken!, seatId);
    await confirmSeat(guest!.activeQrToken!, seatId);

    await resetGuestBooking(superadmin, eventId, guest!.id);

    const portalAfterReset = await getGuestPortal(guest!.activeQrToken!);
    expect(portalAfterReset.booking).toBeNull();

    await lockSeat(guest!.activeQrToken!, seatId);
    const reconfirmed = await confirmSeat(guest!.activeQrToken!, seatId);
    expect(reconfirmed.seatLabel).toMatch(/^S1-/);
  });

  it("rejects capacity reductions that would chop booked seats", async () => {
    const { superadmin, eventId } = await bootstrapEvent();
    let workspace = await getEventWorkspace(superadmin, eventId);
    const sessionId = workspace.sessions[0].id;

    await createGuest(superadmin, eventId, {
      name: "Seat Owner",
      sessionId,
      inviteStatus: "sent",
      isActive: true,
    });

    workspace = await getEventWorkspace(superadmin, eventId);
    const guestToken = workspace.guests.find((item) => item.name === "Seat Owner")?.activeQrToken;
    const portal = await getGuestPortal(guestToken!);
    const seatId = portal.seats[1].seatId;
    await lockSeat(guestToken!, seatId);
    await confirmSeat(guestToken!, seatId);

    await expect(
      updateSession(superadmin, eventId, sessionId, {
        label: "Sesi 1",
        capacity: 1,
      }),
    ).rejects.toThrow(/memotong kursi/i);
  });

  it("imports valid rows and reports invalid ones", async () => {
    const { superadmin, eventId } = await bootstrapEvent();
    const workspace = await getEventWorkspace(superadmin, eventId);
    const session = workspace.sessions[0];

    const result = await importGuests(superadmin, eventId, [
      {
        "nama tamu": "CSV Guest",
        sesi: session.code,
        "status aktif": "aktif",
        "status undangan terkirim": "sent",
      },
      {
        "nama tamu": "",
        sesi: session.code,
        "status aktif": "aktif",
        "status undangan terkirim": "pending",
      },
      {
        "nama tamu": "Missing Session",
        sesi: "S99",
        "status aktif": "aktif",
        "status undangan terkirim": "sent",
      },
    ]);

    expect(result.createdCount).toBe(1);
    expect(result.errors).toHaveLength(2);

    const refreshedWorkspace = await getEventWorkspace(superadmin, eventId);
    expect(refreshedWorkspace.guests.some((guest) => guest.name === "CSV Guest")).toBe(true);
  });
});
