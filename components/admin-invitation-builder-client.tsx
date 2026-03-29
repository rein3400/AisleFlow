"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { InvitationPageRenderer, InvitationSeatPreview, InvitationTicketRenderer } from "@/components/invitation-renderer";
import {
  INVITATION_BLOCK_LABELS,
  INVITATION_PAGE_LABELS,
  createDefaultInvitationConfig,
  getStylePresetTokens,
  type InvitationBlockConfig,
  type InvitationBlockType,
  type InvitationConfig,
  type InvitationPageKey,
  type InvitationStylePreset,
} from "@/lib/invitation-builder";

type BuilderWorkspace = Awaited<ReturnType<typeof import("@/lib/domain").getInvitationBuilderWorkspace>>;

type BuilderTab = "structure" | "content" | "style";
type PreviewDevice = "desktop" | "tablet" | "mobile";

const PAGE_ORDER: InvitationPageKey[] = ["invitation", "seating", "ticket"];
const STYLE_PRESET_OPTIONS: Array<{ value: InvitationStylePreset; label: string }> = [
  { value: "garden-keepsake", label: "Garden Keepsake" },
  { value: "modern-editorial", label: "Modern Editorial" },
  { value: "warm-minimalist", label: "Warm Minimalist" },
];

function fileToDataUrl(file: File | null) {
  if (!file) {
    return Promise.resolve("");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca gambar."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function orderBlocksForPage(config: InvitationConfig, page: InvitationPageKey) {
  return (Object.values(config.blocks) as InvitationBlockConfig[])
    .filter((block) => block.page === page)
    .sort((left, right) => left.order - right.order);
}

function buildSelectedBlockMap(config: InvitationConfig) {
  return PAGE_ORDER.reduce<Record<InvitationPageKey, InvitationBlockType | null>>((accumulator, page) => {
    accumulator[page] = orderBlocksForPage(config, page)[0]?.type ?? null;
    return accumulator;
  }, {
    invitation: null,
    seating: null,
    ticket: null,
  });
}

function swapBlockOrder(config: InvitationConfig, page: InvitationPageKey, blockType: InvitationBlockType, direction: -1 | 1) {
  const pageBlocks = orderBlocksForPage(config, page);
  const currentIndex = pageBlocks.findIndex((block) => block.type === blockType);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pageBlocks.length) {
    return config;
  }

  const currentBlock = pageBlocks[currentIndex];
  const targetBlock = pageBlocks[targetIndex];

  return {
    ...config,
    blocks: {
      ...config.blocks,
      [currentBlock.type]: {
        ...currentBlock,
        order: targetBlock.order,
      },
      [targetBlock.type]: {
        ...targetBlock,
        order: currentBlock.order,
      },
    },
  };
}

export function AdminInvitationBuilderClient({ workspace }: { workspace: BuilderWorkspace }) {
  const router = useRouter();
  const [draft, setDraft] = useState(workspace.invitationConfig);
  const [savedConfig, setSavedConfig] = useState(workspace.invitationConfig);
  const [currentPage, setCurrentPage] = useState<InvitationPageKey>("invitation");
  const [activeTab, setActiveTab] = useState<BuilderTab>("structure");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState(() => buildSelectedBlockMap(workspace.invitationConfig));
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultSeedConfig = useMemo(
    () =>
      createDefaultInvitationConfig({
        eventId: workspace.event.id,
        updatedBy: workspace.invitationConfig.updatedBy,
        brideName: workspace.event.brideName,
        groomName: workspace.event.groomName,
        welcomeMessage: workspace.event.welcomeMessage,
        primaryColor: workspace.theme.primaryColor,
        secondaryColor: workspace.theme.secondaryColor,
        heroImageDataUrl: workspace.theme.heroImageDataUrl,
        backgroundImageDataUrl: workspace.theme.backgroundImageDataUrl,
      }),
    [workspace.event, workspace.invitationConfig.updatedBy, workspace.theme],
  );

  useEffect(() => {
    setDraft(workspace.invitationConfig);
    setSavedConfig(workspace.invitationConfig);
    setSelectedBlocks(buildSelectedBlockMap(workspace.invitationConfig));
    setNotice(null);
  }, [workspace.invitationConfig]);

  const pageBlocks = useMemo(() => orderBlocksForPage(draft, currentPage), [draft, currentPage]);
  const activeBlockType = selectedBlocks[currentPage] ?? pageBlocks[0]?.type ?? null;
  const activeBlock = activeBlockType ? draft.blocks[activeBlockType] : null;
  const unsavedChanges = JSON.stringify(draft) !== JSON.stringify(savedConfig);
  function updateDraft(mutator: (current: InvitationConfig) => InvitationConfig) {
    setDraft((current) => mutator(current));
  }

  function selectPage(page: InvitationPageKey) {
    setCurrentPage(page);
    setSelectedBlocks((current) => {
      if (current[page]) {
        return current;
      }

      return {
        ...current,
        [page]: orderBlocksForPage(draft, page)[0]?.type ?? null,
      };
    });
  }

  function updateBlockContent(blockType: InvitationBlockType, key: string, value: string) {
    updateDraft((current) => ({
      ...current,
      blocks: {
        ...current.blocks,
        [blockType]: {
          ...current.blocks[blockType],
          content: {
            ...current.blocks[blockType].content,
            [key]: value,
          },
        },
      },
    }));
  }

  function updateBlockStyle(blockType: InvitationBlockType, key: string, value: string) {
    updateDraft((current) => ({
      ...current,
      blocks: {
        ...current.blocks,
        [blockType]: {
          ...current.blocks[blockType],
          style: {
            ...current.blocks[blockType].style,
            [key]: value,
          },
        },
      },
    }));
  }

  async function updateImageField(blockType: InvitationBlockType, key: string, event: ChangeEvent<HTMLInputElement>) {
    try {
      const value = await fileToDataUrl(event.target.files?.[0] ?? null);
      updateBlockContent(blockType, key, value);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Gagal membaca gambar.",
      });
    }
  }

  function restoreSelectedBlock() {
    if (!activeBlockType) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      blocks: {
        ...current.blocks,
        [activeBlockType]: {
          ...defaultSeedConfig.blocks[activeBlockType],
          order: current.blocks[activeBlockType].order,
          enabled: current.blocks[activeBlockType].enabled,
        },
      },
    }));
  }

  function resetDraft() {
    setDraft(savedConfig);
    setSelectedBlocks(buildSelectedBlockMap(savedConfig));
    setNotice(null);
  }

  function saveDraft() {
    startTransition(async () => {
      setNotice(null);
      const response = await fetch(`/api/admin/events/${workspace.event.id}/invitation`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationConfig: draft,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        invitationConfig?: InvitationConfig;
      };

      if (!response.ok || !payload.ok || !payload.invitationConfig) {
        setNotice({
          kind: "error",
          message: payload.error ?? "Invitation config belum berhasil disimpan.",
        });
        return;
      }

      setSavedConfig(payload.invitationConfig);
      setDraft(payload.invitationConfig);
      setSelectedBlocks(buildSelectedBlockMap(payload.invitationConfig));
      setNotice({
        kind: "success",
        message: "Invitation Builder berhasil disimpan dan kini menjadi tampilan aktif untuk guest flow.",
      });
      router.refresh();
    });
  }

  const controlsPane = (
    <>
      <div className="admin-builder-tab-row">
        {(["structure", "content", "style"] as BuilderTab[]).map((tab) => (
          <button
            className={`button-ghost${activeTab === tab ? " admin-builder-chip-active" : ""}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === "structure" ? "Structure" : tab === "content" ? "Content" : "Style"}
          </button>
        ))}
      </div>

      {activeTab === "structure" ? (
        <div className="stack">
          <p className="muted small">
            Atur urutan blok, tampilkan/sembunyikan blok, lalu klik salah satu blok untuk mengedit detailnya.
          </p>
          <div className="list">
            {pageBlocks.map((block, index) => (
              <div className="row-card admin-builder-block-row" key={block.type}>
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{INVITATION_BLOCK_LABELS[block.type]}</strong>
                  <span className="muted small">
                    {block.enabled ? "Aktif di halaman ini." : "Saat ini disembunyikan dari guest flow."}
                  </span>
                </div>
                <div className="admin-card-actions">
                  <button
                    className="button-ghost"
                    disabled={index === 0}
                    onClick={() => updateDraft((current) => swapBlockOrder(current, currentPage, block.type, -1))}
                    type="button"
                  >
                    Naik
                  </button>
                  <button
                    className="button-ghost"
                    disabled={index === pageBlocks.length - 1}
                    onClick={() => updateDraft((current) => swapBlockOrder(current, currentPage, block.type, 1))}
                    type="button"
                  >
                    Turun
                  </button>
                  <button
                    className="button-ghost"
                    onClick={() => setSelectedBlocks((current) => ({ ...current, [currentPage]: block.type }))}
                    type="button"
                  >
                    Pilih
                  </button>
                  <button
                    className={block.enabled ? "button-danger" : "button"}
                    onClick={() =>
                      updateDraft((current) => ({
                        ...current,
                        blocks: {
                          ...current.blocks,
                          [block.type]: {
                            ...current.blocks[block.type],
                            enabled: !current.blocks[block.type].enabled,
                          },
                        },
                      }))
                    }
                    type="button"
                  >
                    {block.enabled ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "content" ? (
        <div className="stack">
          {activeBlock ? (
            <>
              <div className="stack" style={{ gap: 6 }}>
                <strong>{INVITATION_BLOCK_LABELS[activeBlock.type]}</strong>
                <span className="muted small">
                  Edit hanya field milik blok yang sedang dipilih agar builder tetap ringan dipakai.
                </span>
              </div>
              <button className="button-ghost" onClick={restoreSelectedBlock} type="button">
                Pulihkan copy default blok ini
              </button>
              {Object.entries(activeBlock.content).map(([key, value]) => {
                const isImageField = key.toLowerCase().includes("image");
                const isLongText = key === "body" || key.toLowerCase().includes("note");

                return (
                  <div className="field" key={key}>
                    <label htmlFor={`block-content-${activeBlock.type}-${key}`}>{key}</label>
                    {isLongText ? (
                      <textarea
                        id={`block-content-${activeBlock.type}-${key}`}
                        onChange={(event) => updateBlockContent(activeBlock.type, key, event.target.value)}
                        value={value}
                      />
                    ) : (
                      <input
                        id={`block-content-${activeBlock.type}-${key}`}
                        onChange={(event) => updateBlockContent(activeBlock.type, key, event.target.value)}
                        value={value}
                      />
                    )}
                    {isImageField ? (
                      <input
                        id={`block-content-file-${activeBlock.type}-${key}`}
                        onChange={(event) => void updateImageField(activeBlock.type, key, event)}
                        type="file"
                      />
                    ) : null}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="admin-readonly-card">
              <strong>Pilih blok terlebih dahulu.</strong>
              <p className="muted">Daftar field akan muncul setelah Anda memilih salah satu blok di tab Structure.</p>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "style" ? (
        <div className="stack">
          <div className="field">
            <label htmlFor="builder-preset">Style preset</label>
            <select
              className="admin-toolbar-select"
              id="builder-preset"
              onChange={(event) => {
                const preset = event.target.value as InvitationStylePreset;
                const tokens = getStylePresetTokens(preset);
                updateDraft((current) => ({
                  ...current,
                  globalStyle: {
                    ...current.globalStyle,
                    preset,
                    buttonTone: tokens.buttonTone,
                    cardTreatment: tokens.cardTreatment,
                    spacingDensity: tokens.spacingDensity,
                    ornamentIntensity: tokens.ornamentIntensity,
                  },
                }));
              }}
              value={draft.globalStyle.preset}
            >
              {STYLE_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-split-grid">
            <div className="field">
              <label htmlFor="builder-primary">Primary color</label>
              <input
                id="builder-primary"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    globalStyle: {
                      ...current.globalStyle,
                      primaryColor: event.target.value,
                    },
                  }))
                }
                type="color"
                value={draft.globalStyle.primaryColor}
              />
            </div>
            <div className="field">
              <label htmlFor="builder-secondary">Secondary color</label>
              <input
                id="builder-secondary"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    globalStyle: {
                      ...current.globalStyle,
                      secondaryColor: event.target.value,
                    },
                  }))
                }
                type="color"
                value={draft.globalStyle.secondaryColor}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="builder-imagery">Imagery emphasis</label>
            <select
              className="admin-toolbar-select"
              id="builder-imagery"
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  globalStyle: {
                    ...current.globalStyle,
                    imageryEmphasis: event.target.value as InvitationConfig["globalStyle"]["imageryEmphasis"],
                  },
                }))
              }
              value={draft.globalStyle.imageryEmphasis}
            >
              <option value="balanced">Balanced</option>
              <option value="cinematic">Cinematic</option>
              <option value="editorial">Editorial</option>
            </select>
          </div>

          <div className="admin-split-grid">
            <div className="field">
              <label htmlFor="builder-button-tone">Button tone</label>
              <select
                className="admin-toolbar-select"
                id="builder-button-tone"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    globalStyle: {
                      ...current.globalStyle,
                      buttonTone: event.target.value as InvitationConfig["globalStyle"]["buttonTone"],
                    },
                  }))
                }
                value={draft.globalStyle.buttonTone}
              >
                <option value="solid">Solid</option>
                <option value="outlined">Outlined</option>
                <option value="soft">Soft</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="builder-card-treatment">Card treatment</label>
              <select
                className="admin-toolbar-select"
                id="builder-card-treatment"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    globalStyle: {
                      ...current.globalStyle,
                      cardTreatment: event.target.value as InvitationConfig["globalStyle"]["cardTreatment"],
                    },
                  }))
                }
                value={draft.globalStyle.cardTreatment}
              >
                <option value="paper">Paper</option>
                <option value="glass">Glass</option>
                <option value="matte">Matte</option>
              </select>
            </div>
          </div>

          <div className="admin-split-grid">
            <div className="field">
              <label htmlFor="builder-spacing">Spacing density</label>
              <select
                className="admin-toolbar-select"
                id="builder-spacing"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    globalStyle: {
                      ...current.globalStyle,
                      spacingDensity: event.target.value as InvitationConfig["globalStyle"]["spacingDensity"],
                    },
                  }))
                }
                value={draft.globalStyle.spacingDensity}
              >
                <option value="compact">Compact</option>
                <option value="balanced">Balanced</option>
                <option value="airy">Airy</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="builder-ornament">Ornament intensity</label>
              <select
                className="admin-toolbar-select"
                id="builder-ornament"
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    globalStyle: {
                      ...current.globalStyle,
                      ornamentIntensity: event.target.value as InvitationConfig["globalStyle"]["ornamentIntensity"],
                    },
                  }))
                }
                value={draft.globalStyle.ornamentIntensity}
              >
                <option value="subtle">Subtle</option>
                <option value="medium">Medium</option>
                <option value="lush">Lush</option>
              </select>
            </div>
          </div>

          {activeBlock ? (
            <>
              <div className="admin-readonly-card">
                <strong>Block style override</strong>
                <p className="muted small">Fase v1 menjaga override tetap ringan: alignment dan penekanan blok.</p>
              </div>

              <div className="admin-split-grid">
                <div className="field">
                  <label htmlFor="builder-block-align">Text align</label>
                  <select
                    className="admin-toolbar-select"
                    id="builder-block-align"
                    onChange={(event) => updateBlockStyle(activeBlock.type, "align", event.target.value)}
                    value={activeBlock.style.align ?? "left"}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="builder-block-emphasis">Panel emphasis</label>
                  <select
                    className="admin-toolbar-select"
                    id="builder-block-emphasis"
                    onChange={(event) => updateBlockStyle(activeBlock.type, "emphasis", event.target.value)}
                    value={activeBlock.style.emphasis ?? "soft"}
                  >
                    <option value="soft">Soft</option>
                    <option value="strong">Strong</option>
                    <option value="plain">Plain</option>
                  </select>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const previewPane =
    currentPage === "invitation" ? (
      <InvitationPageRenderer
        anchorHref="#preview-seat"
        config={draft}
        event={workspace.event}
        guest={workspace.preview.guest}
        onSelectBlock={(blockType) => setSelectedBlocks((current) => ({ ...current, [currentPage]: blockType }))}
        selectedBlock={activeBlockType}
        session={workspace.preview.session}
      />
    ) : currentPage === "seating" ? (
      <div id="preview-seat">
        <InvitationSeatPreview
          booking={workspace.preview.booking}
          config={draft}
          currentLockSeatId={workspace.preview.currentLockSeatId}
          event={workspace.event}
          guest={workspace.preview.guest}
          onSelectBlock={(blockType) => setSelectedBlocks((current) => ({ ...current, [currentPage]: blockType }))}
          selectedBlock={activeBlockType}
          seats={workspace.preview.seats}
          session={workspace.preview.session}
        />
      </div>
    ) : (
      <InvitationTicketRenderer
        booking={workspace.preview.booking}
        config={draft}
        event={workspace.event}
        guest={workspace.preview.guest}
        onSelectBlock={(blockType) => setSelectedBlocks((current) => ({ ...current, [currentPage]: blockType }))}
        selectedBlock={activeBlockType}
        session={workspace.preview.session}
      />
    );

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="stack" style={{ gap: 14 }}>
          <div className="inline-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="stack" style={{ gap: 6 }}>
              <p className="eyebrow">Invitation Builder</p>
              <h1 className="display-title" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
                Kelola tampilan undangan aktif untuk {workspace.event.title}
              </h1>
              <p className="lede" style={{ maxWidth: 860 }}>
                Builder ini mengendalikan halaman undangan, framing seat selection, dan ticket final. Preview berubah
                real-time, tetapi tamu live baru melihatnya setelah Anda menekan Simpan.
              </p>
            </div>
            <Link className="button-ghost" href={`/admin/events/${workspace.event.id}`}>
              Kembali ke Workspace
            </Link>
          </div>

          <div className="admin-builder-toolbar">
            <div className="admin-builder-toggle-row">
              {PAGE_ORDER.map((page) => (
                <button
                  className={`button-ghost${currentPage === page ? " admin-builder-chip-active" : ""}`}
                  key={page}
                  onClick={() => selectPage(page)}
                  type="button"
                >
                  {INVITATION_PAGE_LABELS[page]}
                </button>
              ))}
            </div>

            <div className="admin-builder-toggle-row">
              {(["desktop", "tablet", "mobile"] as PreviewDevice[]).map((item) => (
                <button
                  className={`button-ghost${device === item ? " admin-builder-chip-active" : ""}`}
                  key={item}
                  onClick={() => setDevice(item)}
                  type="button"
                >
                  {item === "desktop" ? "Desktop" : item === "tablet" ? "Tablet" : "Mobile"}
                </button>
              ))}
            </div>

            <div className="admin-builder-status">
              <span className={`pill ${unsavedChanges ? "warn" : "good"}`}>
                {unsavedChanges ? "Unsaved changes" : "Semua perubahan tersimpan"}
              </span>
              <button className="button-ghost" disabled={!unsavedChanges || isPending} onClick={resetDraft} type="button">
                Reset
              </button>
              <button className="button" disabled={!unsavedChanges || isPending} onClick={saveDraft} type="button">
                {isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>

          {notice ? <div className={`status ${notice.kind}`}>{notice.message}</div> : null}
        </div>
      </section>

      <div className="admin-builder-mobile-actions">
        <button className="button-ghost" onClick={() => setMobilePanelOpen(true)} type="button">
          Edit Structure / Content / Style
        </button>
      </div>

      <div className="admin-builder-layout">
        <aside className="panel stack admin-builder-sidebar">{controlsPane}</aside>

        <section className="panel stack admin-builder-preview-panel">
          <div className="admin-toolbar-meta">
            <div className="stack" style={{ gap: 4 }}>
              <strong>{INVITATION_PAGE_LABELS[currentPage]}</strong>
              <span className="muted small">
                Preview menggunakan sample guest context yang konsisten dan tidak menyentuh data tamu asli.
              </span>
            </div>
            {activeBlockType ? <span className="pill">{INVITATION_BLOCK_LABELS[activeBlockType]}</span> : null}
          </div>

          <div className={`admin-builder-preview-surface device-${device}`}>{previewPane}</div>
        </section>
      </div>

      {mobilePanelOpen ? (
        <div className="admin-dialog-backdrop" onClick={() => setMobilePanelOpen(false)} role="presentation">
          <div className="admin-dialog-card admin-builder-mobile-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="admin-toolbar-meta">
              <strong>Builder Controls</strong>
              <button className="button-ghost" onClick={() => setMobilePanelOpen(false)} type="button">
                Tutup
              </button>
            </div>
            <div className="stack" style={{ gap: 12 }}>{controlsPane}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
