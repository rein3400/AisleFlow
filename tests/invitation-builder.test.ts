import { describe, expect, it } from "vitest";

import {
  createDefaultInvitationConfig,
  getBlocksForPage,
  getStylePresetTokens,
  normalizeInvitationConfig,
  type InvitationConfig,
} from "@/lib/invitation-builder";

describe("invitation builder helpers", () => {
  it("creates a default config from legacy event and theme data", () => {
    const config = createDefaultInvitationConfig({
      eventId: "evt-1",
      updatedBy: "admin-1",
      brideName: "Dita",
      groomName: "Raka",
      welcomeMessage: "Selamat datang di perayaan kami.",
      primaryColor: "#9f4f34",
      secondaryColor: "#f4e9da",
      heroImageDataUrl: "data:image/png;base64,hero",
      backgroundImageDataUrl: "data:image/png;base64,bg",
    });

    expect(config.eventId).toBe("evt-1");
    expect(config.globalStyle.preset).toBe("garden-keepsake");
    expect(config.globalStyle.primaryColor).toBe("#9f4f34");
    expect(config.globalStyle.secondaryColor).toBe("#f4e9da");
    expect(config.blocks.heroCover.enabled).toBe(true);
    expect(config.blocks.heroCover.content.heroImageDataUrl).toBe("data:image/png;base64,hero");
    expect(config.blocks.welcomeNote.content.body).toContain("Selamat datang");
    expect(config.blocks.ticketHero.page).toBe("ticket");
  });

  it("normalizes unknown presets, pages, and blocks back to safe defaults", () => {
    const malformed = {
      eventId: "evt-2",
      updatedAt: "2026-03-29T00:00:00.000Z",
      updatedBy: "admin-2",
      globalStyle: {
        preset: "chaotic-future",
        primaryColor: "not-a-color",
        secondaryColor: "#fff111",
      },
      pageConfigs: {
        invitation: { title: "Undangan" },
        nonsense: { title: "Bad" },
      },
      blocks: {
        heroCover: {
          page: "invitation",
          enabled: true,
          order: 8,
          variant: "classic",
          content: { eyebrow: "Halo" },
          style: {},
        },
        alienBlock: {
          page: "mars",
          enabled: true,
          order: 1,
          variant: "bad",
          content: {},
          style: {},
        },
      },
    } satisfies Partial<InvitationConfig> & Record<string, unknown>;

    const config = normalizeInvitationConfig(malformed, {
      eventId: "evt-2",
      updatedBy: "admin-2",
    });

    expect(config.globalStyle.preset).toBe("garden-keepsake");
    expect(config.globalStyle.primaryColor).toBe("#9f4f34");
    expect(config.pageConfigs.ticket.title).toBeTruthy();
    expect(config.blocks.heroCover.page).toBe("invitation");
    expect((config.blocks as Record<string, unknown>).alienBlock).toBeUndefined();
  });

  it("returns page blocks in sorted order and excludes hidden blocks", () => {
    const config = createDefaultInvitationConfig({
      eventId: "evt-3",
      updatedBy: "admin-3",
      brideName: "Nadia",
      groomName: "Arga",
      welcomeMessage: "Sampai jumpa di hari bahagia kami.",
      primaryColor: "#8f5d49",
      secondaryColor: "#ecd8ca",
      heroImageDataUrl: "",
      backgroundImageDataUrl: "",
    });

    config.blocks.welcomeNote.enabled = false;
    config.blocks.eventDetails.order = 1;
    config.blocks.heroCover.order = 3;
    config.blocks.guestCard.order = 2;

    expect(getBlocksForPage(config, "invitation").map((block) => block.type)).toEqual([
      "eventDetails",
      "guestCard",
      "heroCover",
      "storyAgenda",
      "galleryPanel",
      "seatingBridge",
    ]);
  });

  it("exposes stable tokens for curated style presets", () => {
    expect(getStylePresetTokens("modern-editorial")).toMatchObject({
      headingFontClass: "preset-modern-editorial",
      buttonTone: "outlined",
      cardTreatment: "glass",
    });
    expect(getStylePresetTokens("warm-minimalist")).toMatchObject({
      spacingDensity: "airy",
      ornamentIntensity: "subtle",
    });
  });
});
