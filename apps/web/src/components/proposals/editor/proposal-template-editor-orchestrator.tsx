"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useOrganization } from "@/components/providers/organization-provider";
import type { Product } from "@/lib/admin-api";
import {
  createProposalTemplate,
  listProposalTemplates,
  listProposalTemplateRevisions,
  publishProposalTemplate,
  restoreProposalTemplateRevision,
  uploadProposalTemplateImage,
  updateProposalTemplate,
  type ProposalTemplateRevisionEntity,
  type ProposalTemplateEntity,
} from "@/lib/proposal-templates-api";
import { ImportTemplateModal } from "./import-template-modal";
import { SettingsPanel } from "./settings-panel";
import { TemplateHistoryModal } from "./template-history-modal";
import { VariableMark } from "./extensions";
import { BUILTIN_TEMPLATE_PRESETS, createBaseDocument, createId } from "./utils";
import {
  getSectionVariantOptions,
  SECTION_DEFAULT_FIELDS,
  SECTION_TYPE_LABELS,
} from "./section-fields";
import { HeaderBar } from "./header-bar";
import { SidebarPanel } from "./sidebar-panel";
import { EditorPanel } from "./editor-panel";
import { PreviewPanel } from "./preview-panel";
import {
  type ProposalDocumentJson,
  type ProposalSection,
  type SavedTemplate,
  type SettingsTab,
  type TypographyPreset,
  type VariableToken,
} from "./types";
import { proposalDocumentJsonToTemplateConfig } from "@/lib/proposal-document-to-template-config";
import {
  adminCreateTemplateBlueprint,
  adminGetTemplateBlueprint,
  adminUpdateTemplateBlueprint,
  getTemplateBlueprint,
  listPublishedTemplateBlueprints,
  type BlueprintDocumentInput,
} from "@/lib/template-blueprints-api";
import {
  validateTemplateBeforeCriticalAction,
  renderSectionHtml,
  extractTemplateThumbnail,
  resolvePersistableThumbnailUrl,
  captureTemplateThumbnail,
  isLikelyInvalidThumbnailDataUrl,
  fromTemplateConfig,
} from "./proposal-template-editor-orchestrator-helpers";

interface ProposalTemplateEditorProps {
  templateId?: string;
  variant?: "proposal" | "blueprint";
  templateBlueprintId?: string;
  initialNewTemplateFlow?: "import";
}
type MobilePane = "structure" | "editor" | "preview";

export function ProposalTemplateEditor({
  templateId,
  variant = "proposal",
  templateBlueprintId,
  initialNewTemplateFlow,
}: ProposalTemplateEditorProps): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganizationId, currentOrganization } = useOrganization();
  const previewPanelRef = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState("Template de Proposta Solar Residencial");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [documentState, setDocumentState] = useState<ProposalDocumentJson>(() =>
    createBaseDocument("Template de Proposta Solar Residencial", [
      "Capa",
      "Introdução",
      "Sobre a Empresa",
      "Solução proposta",
      "Investimento",
      "Depoimentos",
      "Assinatura",
    ])
  );
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("branding");
  const [importOpen, setImportOpen] = useState(false);
  const [catalogImportingId, setCatalogImportingId] = useState<string | null>(null);
  const [blueprintRecordId, setBlueprintRecordId] = useState<string | null>(null);
  const [blueprintPublished, setBlueprintPublished] = useState(false);
  const [blueprintThumbnailUrl, setBlueprintThumbnailUrl] = useState<string | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState(
    () => variant === "blueprint" && Boolean(templateBlueprintId)
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [remoteTemplates, setRemoteTemplates] = useState<ProposalTemplateEntity[]>([]);
  const [templateRevisions, setTemplateRevisions] = useState<ProposalTemplateRevisionEntity[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeMobilePane, setActiveMobilePane] = useState<MobilePane>("editor");

  const [productCatalogById] = useState<Record<string, Product>>({});
  const newTemplateFlowConsumedRef = useRef(false);
  const [editorFocusRequest, setEditorFocusRequest] = useState<{
    sectionId: string;
    fieldName?: string;
    token: number;
  } | null>(null);

  const tenantStorageKey = useMemo(() => {
    if (variant === "blueprint") {
      return `blueprint_editor_templates_${currentOrganizationId ?? "default"}_${templateBlueprintId ?? "new"}`;
    }
    return `proposal_editor_templates_${currentOrganizationId ?? "default"}`;
  }, [variant, currentOrganizationId, templateBlueprintId]);

  const {
    data: catalogBlueprints = [],
    isLoading: catalogBlueprintsLoading,
    isError: catalogBlueprintsIsError,
    error: catalogBlueprintsError,
  } = useQuery({
    queryKey: ["published-template-blueprints", currentOrganizationId],
    queryFn: () => listPublishedTemplateBlueprints(currentOrganizationId!),
    enabled: importOpen && Boolean(currentOrganizationId),
  });

  const selectedSection = documentState.sections.find(
    (section) => section.id === selectedSectionId
  );
  const selectedRemoteTemplate = useMemo(
    () => remoteTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [remoteTemplates, selectedTemplateId]
  );
  const headerTemplateStatus = useMemo(() => {
    if (variant === "blueprint") {
      return blueprintPublished ? ("PUBLISHED" as const) : ("DRAFT" as const);
    }
    return selectedRemoteTemplate?.status ?? ("DRAFT" as const);
  }, [variant, blueprintPublished, selectedRemoteTemplate]);
  const previousPersistedThumbnailUrl = useMemo(() => {
    if (variant === "blueprint") {
      return blueprintThumbnailUrl ?? undefined;
    }
    return selectedRemoteTemplate
      ? extractTemplateThumbnail(selectedRemoteTemplate.config)
      : undefined;
  }, [variant, blueprintThumbnailUrl, selectedRemoteTemplate]);
  const previewDocumentState = documentState;
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function selectSection(sectionId: string, fieldName?: string) {
    setSettingsOpen(false);
    setSelectedSectionId(sectionId);
    if (fieldName) {
      setEditorFocusRequest({ sectionId, fieldName, token: Date.now() });
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tenantStorageKey);
      setSavedTemplates(raw ? (JSON.parse(raw) as SavedTemplate[]) : []);
    } catch {
      setSavedTemplates([]);
    }
  }, [tenantStorageKey]);

  useEffect(() => {
    if (variant === "blueprint") return;
    if (!currentOrganizationId) return;
    void (async () => {
      try {
        const templates = await listProposalTemplates(currentOrganizationId);
        setRemoteTemplates(templates);
        const selected = templateId
          ? (templates.find((template) => template.id === templateId) ?? null)
          : (templates[0] ?? null);

        if (!selected) {
          setStatusMessage("Template nao encontrado.");
          return;
        }
        setSelectedTemplateId(selected.id);
        setTitle(selected.name);
        const doc = fromTemplateConfig(selected.config);
        if (doc) setDocumentState(doc);
        setSettingsOpen(true);
        setSelectedSectionId("");
        setActiveMobilePane("editor");
        await loadTemplateRevisions(selected.id);
      } catch {
        setStatusMessage("Nao foi possivel carregar templates salvos no backend.");
      }
    })();
  }, [currentOrganizationId, templateId, variant]);

  useEffect(() => {
    if (variant !== "proposal" || !initialNewTemplateFlow || !templateId) return;
    if (selectedTemplateId !== templateId) return;
    if (newTemplateFlowConsumedRef.current) return;
    newTemplateFlowConsumedRef.current = true;
    setImportOpen(true);
    router.replace(`/proposals/templates/${templateId}`, { scroll: false });
  }, [variant, initialNewTemplateFlow, templateId, selectedTemplateId, router]);

  useEffect(() => {
    if (variant !== "blueprint" || !currentOrganizationId) return;
    if (!templateBlueprintId) {
      setBlueprintRecordId(null);
      setBlueprintPublished(false);
      setBlueprintThumbnailUrl(null);
      setBlueprintLoading(false);
      return;
    }
    setBlueprintLoading(true);
    void (async () => {
      try {
        const bp = await adminGetTemplateBlueprint(templateBlueprintId, currentOrganizationId);
        setBlueprintRecordId(bp.id);
        setBlueprintPublished(bp.published);
        setBlueprintThumbnailUrl(bp.thumbnailUrl);
        setTitle(bp.name);
        setDocumentState(bp.document);
        setSettingsOpen(true);
        setSelectedSectionId("");
        setActiveMobilePane("editor");
      } catch {
        setStatusMessage("Modelo de catálogo não encontrado.");
        router.replace("/admin/template-models");
      } finally {
        setBlueprintLoading(false);
      }
    })();
  }, [variant, templateBlueprintId, currentOrganizationId, router]);

  useEffect(() => {
    if (settingsOpen) return;
    if (!selectedSectionId && documentState.sections.length) {
      setSelectedSectionId(documentState.sections[0]!.id);
    }
  }, [selectedSectionId, documentState.sections, settingsOpen]);

  useEffect(() => {
    if (!selectedSectionId || settingsOpen) return;
    const panel = previewPanelRef.current;
    if (!panel) return;
    const sections = panel.querySelectorAll<HTMLElement>("[data-preview-section-id]");
    const target = Array.from(sections).find(
      (sectionElement) => sectionElement.dataset["previewSectionId"] === selectedSectionId
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedSectionId, settingsOpen, previewDocumentState.sections]);

  useEffect(() => {
    if (!currentOrganization?.name) return;
    setDocumentState((prev) => {
      const shouldSyncCompanyName =
        !prev.variables["nome_empresa"] ||
        prev.variables["nome_empresa"] === "Solar Energia Co." ||
        prev.variables["nome_empresa"] === "Solar Prime Energia";
      const shouldSyncFooterCompany =
        !prev.styles.footer.companyName || prev.styles.footer.companyName === "Solar Energy Co.";
      if (!shouldSyncCompanyName && !shouldSyncFooterCompany) return prev;
      return {
        ...prev,
        variables: shouldSyncCompanyName
          ? { ...prev.variables, ["nome_empresa"]: currentOrganization.name }
          : prev.variables,
        styles: shouldSyncFooterCompany
          ? {
              ...prev.styles,
              footer: { ...prev.styles.footer, companyName: currentOrganization.name },
            }
          : prev.styles,
      };
    });
  }, [currentOrganization?.name]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escreva o conteúdo da seção da proposta..." }),
      VariableMark,
    ],
    content: selectedSection?.content ?? "<p></p>",
    editorProps: {
      attributes: {
        class: "min-h-[360px] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none",
      },
    },
    onUpdate({ editor: instance }) {
      const html = instance.getHTML();
      setDocumentState((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== selectedSectionId) return section;
          const syncTextField = section.type === "introduction" || section.type === "custom";
          return {
            ...section,
            content: html,
            fields: syncTextField ? { ...section.fields, text: html } : section.fields,
          };
        }),
      }));
    },
  });

  useEffect(() => {
    if (!editor || !selectedSection) return;
    if (editor.getHTML() !== selectedSection.content) {
      editor.commands.setContent(selectedSection.content, false);
    }
  }, [editor, selectedSection]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDocumentState((prev) => {
      const oldIndex = prev.sections.findIndex((section) => section.id === active.id);
      const newIndex = prev.sections.findIndex((section) => section.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) };
    });
  }

  function updateSection(id: string, updates: Partial<ProposalSection>) {
    setDocumentState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === id ? { ...section, ...updates } : section
      ),
    }));
  }

  function addSection(
    type: ProposalSection["type"],
    draft?: { content?: string; fieldsPatch?: Record<string, unknown>; variant?: string }
  ) {
    const section: ProposalSection = {
      id: createId(),
      type,
      variant:
        draft?.variant ??
        (type === "cover" ? "full-image" : (getSectionVariantOptions(type)[0]?.value ?? "default")),
      title: SECTION_TYPE_LABELS[type],
      hidden: false,
      content:
        draft?.content ?? "<p>Use os campos específicos da seção para configurar este bloco.</p>",
      fields: { ...SECTION_DEFAULT_FIELDS[type], ...(draft?.fieldsPatch ?? {}) },
    };
    const next = {
      ...section,
      content: renderSectionHtml(
        section,
        productCatalogById,
        documentState.styles.branding,
        documentState.variables
      ),
    };
    setDocumentState((prev) => ({ ...prev, sections: [...prev.sections, next] }));
    setSelectedSectionId(next.id);
  }

  function duplicateSection(id: string) {
    setDocumentState((prev) => {
      const index = prev.sections.findIndex((section) => section.id === id);
      if (index < 0) return prev;
      const source = prev.sections[index]!;
      const next = [...prev.sections];
      next.splice(index + 1, 0, { ...source, id: createId(), title: `${source.title} Copy` });
      return { ...prev, sections: next };
    });
  }

  function deleteSection(id: string) {
    setDocumentState((prev) => {
      if (prev.sections.length <= 1) return prev;
      return { ...prev, sections: prev.sections.filter((section) => section.id !== id) };
    });
    if (selectedSectionId === id) {
      const next = documentState.sections.find((section) => section.id !== id);
      if (next) setSelectedSectionId(next.id);
    }
  }

  function insertVariable(token: VariableToken) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "text",
          text: `{{${token}}}`,
          marks: [{ type: "variableToken", attrs: { name: token } }],
        },
        { type: "text", text: " " },
      ])
      .run();
  }

  function applyAiAction(action: "improve" | "newVersion") {
    if (!editor) return;
    if (action === "improve") {
      editor.commands.setContent(
        "<p>Refinamos esta seção para ficar mais clara, objetiva e fácil de escanear.</p>"
      );
      return;
    }
    editor.commands.setContent(
      '<p>Preparado para <span data-variable-token="nome_cliente">{{nome_cliente}}</span> por <span data-variable-token="nome_empresa">{{nome_empresa}}</span>.</p>'
    );
  }

  async function handleImageUpload(file: File | undefined, target: "logoUrl") {
    if (!file) return;
    try {
      const fileUrl = await uploadProposalTemplateImage(file, currentOrganizationId ?? undefined);
      setDocumentState((prev) => ({
        ...prev,
        styles: {
          ...prev.styles,
          branding:
            target === "logoUrl"
              ? { ...prev.styles.branding, logoUrl: fileUrl }
              : prev.styles.branding,
          cover: prev.styles.cover,
        },
      }));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao enviar imagem.");
    }
  }

  async function handleSectionImageUpload(fieldName: string, file: File | undefined) {
    if (!file || !selectedSectionId) return;
    try {
      const fileUrl = await uploadProposalTemplateImage(file, currentOrganizationId ?? undefined);
      if (selectedSection?.type === "cover" && fieldName === "backgroundImage") {
        setDocumentState((prev) => ({
          ...prev,
          styles: {
            ...prev.styles,
            cover: {
              ...prev.styles.cover,
              imageUrl: fileUrl,
            },
          },
        }));
      }
      updateSection(selectedSectionId, {
        fields: {
          ...(selectedSection?.fields ?? {}),
          [fieldName]: fileUrl,
        },
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao enviar imagem.");
    }
  }

  function handleSectionFieldChange(fieldName: string, value: unknown) {
    if (!selectedSectionId || !selectedSection) return;
    const nextFields = {
      ...selectedSection.fields,
      [fieldName]: value,
    };
    const nextSection = { ...selectedSection, fields: nextFields };
    if (selectedSection.type === "cover") {
      setDocumentState((prev) => ({
        ...prev,
        styles: {
          ...prev.styles,
          cover: {
            ...prev.styles.cover,
            imageUrl:
              fieldName === "backgroundImage"
                ? String(value ?? prev.styles.cover.imageUrl)
                : prev.styles.cover.imageUrl,
            overlayColor:
              fieldName === "overlayColor"
                ? typeof value === "string"
                  ? value
                  : ""
                : prev.styles.cover.overlayColor,
            overlayOpacity:
              fieldName === "overlayOpacity"
                ? Math.max(
                    0,
                    Math.min(
                      1,
                      Number(value ?? 0) > 1 ? Number(value ?? 0) / 100 : Number(value ?? 0)
                    )
                  )
                : prev.styles.cover.overlayOpacity,
            titleText:
              fieldName === "title"
                ? String(value ?? prev.styles.cover.titleText)
                : prev.styles.cover.titleText,
            showLogo: prev.styles.cover.showLogo,
          },
        },
      }));
    }
    updateSection(selectedSectionId, {
      fields: nextFields,
      content: renderSectionHtml(
        nextSection,
        productCatalogById,
        documentState.styles.branding,
        documentState.variables
      ),
    });
  }

  function handlePreviewSectionHeightChange(sectionId: string, heightPercent: number) {
    const safeHeight = Math.max(100, Math.min(300, Math.round(heightPercent)));
    setDocumentState((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const nextFields = { ...section.fields, coverHeight: safeHeight };
        const nextSection = { ...section, fields: nextFields };
        return {
          ...nextSection,
          content: renderSectionHtml(
            nextSection,
            productCatalogById,
            prev.styles.branding,
            prev.variables
          ),
        };
      }),
    }));
  }

  async function saveTemplate(customName?: string) {
    const issues = validateTemplateBeforeCriticalAction(documentState);
    if (issues.length) {
      setStatusMessage(`Checklist: ${issues[0]}`);
    }
    const rawCapturedThumbnailUrl = await captureTemplateThumbnail(
      previewPanelRef.current,
      title,
      previewDocumentState
    );
    const capturedThumbnailUrl = isLikelyInvalidThumbnailDataUrl(rawCapturedThumbnailUrl)
      ? undefined
      : rawCapturedThumbnailUrl;
    const thumbnailUrl = await resolvePersistableThumbnailUrl(
      capturedThumbnailUrl,
      previousPersistedThumbnailUrl,
      currentOrganizationId ?? undefined
    );
    console.info("[template-save] thumbnail decision", {
      hasRawCapture: Boolean(rawCapturedThumbnailUrl),
      rawCaptureLength: rawCapturedThumbnailUrl?.length ?? 0,
      hasCapturedThumbnail: Boolean(capturedThumbnailUrl),
      hasPreviousThumbnail: Boolean(previousPersistedThumbnailUrl),
      usingPreviousThumbnail: !capturedThumbnailUrl && Boolean(previousPersistedThumbnailUrl),
    });

    if (variant === "blueprint") {
      if (!currentOrganizationId) {
        setStatusMessage("Selecione uma organização para salvar o modelo de catálogo.");
        return;
      }
      try {
        const id = blueprintRecordId ?? templateBlueprintId;
        if (id) {
          const updated = await adminUpdateTemplateBlueprint(currentOrganizationId, id, {
            name: customName ?? title,
            document: documentState as unknown as BlueprintDocumentInput,
            thumbnailUrl: thumbnailUrl ?? undefined,
          });
          setBlueprintThumbnailUrl(updated.thumbnailUrl);
          setBlueprintPublished(updated.published);
        } else {
          const created = await adminCreateTemplateBlueprint(currentOrganizationId, {
            name: customName ?? title,
            document: documentState as unknown as BlueprintDocumentInput,
            thumbnailUrl: thumbnailUrl ?? undefined,
            published: false,
            sortOrder: 0,
          });
          setBlueprintRecordId(created.id);
          setBlueprintPublished(created.published);
          setBlueprintThumbnailUrl(created.thumbnailUrl);
          router.replace(`/admin/template-models/${created.id}`);
        }
        void queryClient.invalidateQueries({
          queryKey: ["admin", "template-blueprints", currentOrganizationId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["admin", "template-blueprint", currentOrganizationId],
        });
        if (!capturedThumbnailUrl && previousPersistedThumbnailUrl) {
          setStatusMessage("Modelo salvo. Preview mantido da versão anterior (falha na captura).");
        } else if (!capturedThumbnailUrl && !previousPersistedThumbnailUrl) {
          setStatusMessage("Modelo salvo. Não foi possível gerar preview agora.");
        } else {
          setStatusMessage("Modelo salvo.");
        }
      } catch (error) {
        console.error("[blueprint-save] failed", { error });
        setStatusMessage("Falha ao salvar modelo de catálogo no servidor.");
      }
      return;
    }

    const entry: SavedTemplate = {
      id: createId(),
      name: customName ?? title,
      createdAt: new Date().toISOString(),
      payload: documentState,
      thumbnailUrl,
    };
    const next = [entry, ...savedTemplates];
    setSavedTemplates(next);
    window.localStorage.setItem(tenantStorageKey, JSON.stringify(next));
    if (!currentOrganizationId) {
      setStatusMessage("Template salvo localmente para esta organizacao.");
      return;
    }

    try {
      const payloadConfig = proposalDocumentJsonToTemplateConfig(documentState, thumbnailUrl);
      if (selectedTemplateId) {
        const updated = await updateProposalTemplate(
          selectedTemplateId,
          { name: customName ?? title, config: payloadConfig },
          currentOrganizationId
        );
        const updatedWithLatestConfig = {
          ...updated,
          config: payloadConfig,
        };
        setRemoteTemplates((prev) => {
          const hasTemplate = prev.some((template) => template.id === updated.id);
          if (hasTemplate) {
            return prev.map((template) =>
              template.id === updated.id ? updatedWithLatestConfig : template
            );
          }
          return [updatedWithLatestConfig, ...prev];
        });
      } else {
        const created = await createProposalTemplate(
          {
            name: customName ?? title,
            description: "Editor visual de proposta SaaS",
            config: payloadConfig,
          },
          currentOrganizationId
        );
        const createdWithLatestConfig = {
          ...created,
          config: payloadConfig,
        };
        setSelectedTemplateId(created.id);
        setRemoteTemplates((prev) => [createdWithLatestConfig, ...prev]);
      }
      if (!capturedThumbnailUrl && previousPersistedThumbnailUrl) {
        setStatusMessage(
          "Alterações salvas. Preview mantido da versão anterior (falha na captura)."
        );
      } else if (!capturedThumbnailUrl && !previousPersistedThumbnailUrl) {
        setStatusMessage("Alterações salvas. Não foi possível gerar preview agora.");
      } else {
        setStatusMessage("Alterações salvas.");
      }
    } catch (error) {
      console.error("[template-save] backend save failed", {
        selectedTemplateId,
        hasThumbnailUrl: Boolean(thumbnailUrl),
        error,
      });
      setStatusMessage("Template salvo localmente, mas falhou no backend.");
    }
  }

  function importTemplate(payload: ProposalDocumentJson, name: string) {
    setDocumentState(payload);
    setTitle(name);
    setSettingsOpen(true);
    setSelectedSectionId("");
    setActiveMobilePane("editor");
    setImportOpen(false);
    setStatusMessage(`Template carregado: ${name}`);
  }

  async function handleImportCatalogBlueprint(blueprintId: string) {
    if (!currentOrganizationId) {
      setStatusMessage("Selecione uma organização para carregar modelos do catálogo.");
      return;
    }
    setCatalogImportingId(blueprintId);
    try {
      const detail = await getTemplateBlueprint(blueprintId, currentOrganizationId);
      importTemplate(detail.document, detail.name);
    } catch (e) {
      setStatusMessage(e instanceof Error ? e.message : "Falha ao carregar modelo do catálogo.");
    } finally {
      setCatalogImportingId(null);
    }
  }

  async function publishTemplate() {
    const issues = validateTemplateBeforeCriticalAction(documentState);
    if (issues.length) {
      const proceed = window.confirm(
        `Foram encontrados problemas antes da publicação:\n- ${issues.join("\n- ")}\n\nDeseja publicar mesmo assim?`
      );
      if (!proceed) {
        setStatusMessage("Publicação cancelada para revisão do checklist.");
        return;
      }
    }
    if (!currentOrganizationId) {
      setStatusMessage("Defina uma organizacao para publicar no backend.");
      return;
    }
    try {
      const rawCapturedThumbnailUrl = await captureTemplateThumbnail(
        previewPanelRef.current,
        title,
        previewDocumentState
      );
      const capturedThumbnailUrl = isLikelyInvalidThumbnailDataUrl(rawCapturedThumbnailUrl)
        ? undefined
        : rawCapturedThumbnailUrl;
      const thumbnailUrl = await resolvePersistableThumbnailUrl(
        capturedThumbnailUrl,
        previousPersistedThumbnailUrl,
        currentOrganizationId
      );
      console.info("[template-publish] thumbnail decision", {
        hasRawCapture: Boolean(rawCapturedThumbnailUrl),
        rawCaptureLength: rawCapturedThumbnailUrl?.length ?? 0,
        hasCapturedThumbnail: Boolean(capturedThumbnailUrl),
        hasPreviousThumbnail: Boolean(previousPersistedThumbnailUrl),
        usingPreviousThumbnail: !capturedThumbnailUrl && Boolean(previousPersistedThumbnailUrl),
      });

      if (variant === "blueprint") {
        const id = blueprintRecordId ?? templateBlueprintId;
        if (id) {
          const updated = await adminUpdateTemplateBlueprint(currentOrganizationId, id, {
            name: title,
            document: documentState as unknown as BlueprintDocumentInput,
            thumbnailUrl: thumbnailUrl ?? undefined,
            published: true,
          });
          setBlueprintPublished(updated.published);
          setBlueprintThumbnailUrl(updated.thumbnailUrl);
        } else {
          const created = await adminCreateTemplateBlueprint(currentOrganizationId, {
            name: title,
            document: documentState as unknown as BlueprintDocumentInput,
            thumbnailUrl: thumbnailUrl ?? undefined,
            published: true,
            sortOrder: 0,
          });
          setBlueprintRecordId(created.id);
          setBlueprintPublished(true);
          setBlueprintThumbnailUrl(created.thumbnailUrl);
          router.replace(`/admin/template-models/${created.id}`);
        }
        void queryClient.invalidateQueries({
          queryKey: ["admin", "template-blueprints", currentOrganizationId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["admin", "template-blueprint", currentOrganizationId],
        });
        if (!capturedThumbnailUrl && previousPersistedThumbnailUrl) {
          setStatusMessage(
            "Modelo publicado no catálogo. Preview mantido da versão anterior (falha na captura)."
          );
        } else if (!capturedThumbnailUrl && !previousPersistedThumbnailUrl) {
          setStatusMessage("Modelo publicado no catálogo. Não foi possível gerar preview agora.");
        } else {
          setStatusMessage("Modelo publicado no catálogo.");
        }
        return;
      }

      let templateId = selectedTemplateId;
      if (!templateId) {
        const created = await createProposalTemplate(
          {
            name: title,
            description: "Editor visual de proposta SaaS",
            config: proposalDocumentJsonToTemplateConfig(documentState, thumbnailUrl),
          },
          currentOrganizationId
        );
        templateId = created.id;
        setSelectedTemplateId(created.id);
        setRemoteTemplates((prev) => [created, ...prev]);
      } else {
        const updatedDraft = await updateProposalTemplate(
          templateId,
          {
            name: title,
            config: proposalDocumentJsonToTemplateConfig(documentState, thumbnailUrl),
          },
          currentOrganizationId
        );
        setRemoteTemplates((prev) =>
          prev.map((template) => (template.id === updatedDraft.id ? updatedDraft : template))
        );
      }
      const published = await publishProposalTemplate(templateId, currentOrganizationId);
      setRemoteTemplates((prev) => {
        const hasTemplate = prev.some((template) => template.id === published.id);
        if (hasTemplate) {
          return prev.map((template) => (template.id === published.id ? published : template));
        }
        return [published, ...prev];
      });
      await loadTemplateRevisions(templateId);
      if (!capturedThumbnailUrl && previousPersistedThumbnailUrl) {
        setStatusMessage(
          `Versao ${published.version} publicada. Preview mantido da versão anterior (falha na captura).`
        );
      } else if (!capturedThumbnailUrl && !previousPersistedThumbnailUrl) {
        setStatusMessage(
          `Versao ${published.version} publicada. Não foi possível gerar preview agora.`
        );
      } else {
        setStatusMessage(`Versao ${published.version} publicada.`);
      }
    } catch (error) {
      console.error("[template-publish] publish failed", {
        selectedTemplateId,
        error,
      });
      setStatusMessage("Falha ao publicar template no backend.");
    }
  }

  async function loadTemplateRevisions(targetTemplateId: string) {
    if (!currentOrganizationId || !targetTemplateId) {
      setTemplateRevisions([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const revisions = await listProposalTemplateRevisions(
        targetTemplateId,
        currentOrganizationId
      );
      setTemplateRevisions(revisions);
    } catch {
      setTemplateRevisions([]);
      setStatusMessage("Nao foi possivel carregar o historico de versoes.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleRestoreRevision(revision: ProposalTemplateRevisionEntity) {
    if (!currentOrganizationId || !selectedTemplateId) return;
    const confirmed = window.confirm(
      `Restaurar a versao ${revision.version} como rascunho? A publicacao ativa nao muda ate publicar novamente.`
    );
    if (!confirmed) return;

    try {
      const restored = await restoreProposalTemplateRevision(
        selectedTemplateId,
        revision.id,
        currentOrganizationId
      );
      setRemoteTemplates((prev) =>
        prev.map((template) => (template.id === restored.id ? restored : template))
      );
      const restoredDoc = fromTemplateConfig(restored.config);
      if (restoredDoc) {
        setDocumentState(restoredDoc);
        setSettingsOpen(true);
        setSelectedSectionId("");
        setActiveMobilePane("editor");
      }
      await loadTemplateRevisions(selectedTemplateId);
      setHistoryOpen(false);
      setStatusMessage(`Versao ${revision.version} restaurada como rascunho.`);
    } catch {
      setStatusMessage("Falha ao restaurar versao.");
    }
  }

  function handlePreviewRevision(revision: ProposalTemplateRevisionEntity) {
    const previewDoc = fromTemplateConfig(revision.config);
    if (!previewDoc) {
      setStatusMessage("Nao foi possivel visualizar a versao selecionada.");
      return;
    }
    setDocumentState(previewDoc);
    setSelectedSectionId(previewDoc.sections[0]?.id ?? "");
    setStatusMessage(`Versao ${revision.version} carregada para visualizacao.`);
  }

  function applyPalette(primary: string, secondary: string, background: string, text: string) {
    setDocumentState((prev) => ({
      ...prev,
      styles: {
        ...prev.styles,
        branding: {
          ...prev.styles.branding,
          primaryColor: primary,
          secondaryColor: secondary,
          backgroundColor: background,
          textColor: text,
        },
      },
    }));
  }

  function applyTypographyPreset(preset: TypographyPreset) {
    const map = {
      small: { title: 26, subtitle: 18, body: 13 },
      medium: { title: 30, subtitle: 20, body: 14 },
      large: { title: 34, subtitle: 22, body: 16 },
    } as const;
    const value = map[preset];
    setDocumentState((prev) => ({
      ...prev,
      styles: {
        ...prev.styles,
        typography: {
          ...prev.styles.typography,
          preset,
          titleSize: value.title,
          subtitleSize: value.subtitle,
          bodySize: value.body,
        },
      },
    }));
  }

  async function downloadPdf(): Promise<void> {
    try {
      setStatusMessage("Gerando PDF...");
      const previewRoot = previewPanelRef.current?.querySelector(
        "[data-preview-scroll='true']"
      ) as HTMLElement | null;
      const bodyHtml = previewRoot?.innerHTML?.trim() ?? "";
      if (!bodyHtml) {
        throw new Error("Nao foi possivel capturar o preview para gerar o PDF.");
      }
      const styleTags = Array.from(document.querySelectorAll("style"))
        .map((node) => node.outerHTML)
        .join("\n");
      const stylesheetLinks = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
      )
        .map((node) => {
          const href = node.href || "";
          if (!href) return "";
          return `<link rel="stylesheet" href="${href}" />`;
        })
        .filter(Boolean)
        .join("\n");
      const extraHeadHtml = `${stylesheetLinks}\n${styleTags}`;
      const response = await fetch("/api/proposals/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bodyHtml,
          branding: previewDocumentState.styles.branding,
          extraHeadHtml,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Falha ao gerar PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.replace(/\s+/g, "-").toLowerCase() || "proposta"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatusMessage("PDF gerado com sucesso.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Nao foi possivel gerar o PDF.");
    }
  }

  if (variant === "blueprint" && blueprintLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Carregando modelo de catálogo…
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "blueprint"
          ? "relative min-h-screen space-y-3 bg-[var(--color-background)] p-3 lg:space-y-4 lg:p-4"
          : "relative min-h-[calc(100vh-132px)] space-y-3 rounded-[24px] bg-[var(--color-background)] p-3 lg:space-y-4 lg:p-4"
      }
    >
      <HeaderBar
        title={title}
        templateStatus={headerTemplateStatus}
        templateVersion={selectedRemoteTemplate?.version ?? 1}
        catalogEditor={variant === "blueprint"}
        onTitleChange={setTitle}
        onBack={() =>
          router.push(variant === "blueprint" ? "/admin/template-models" : "/proposals/templates")
        }
        onSave={() => void saveTemplate()}
        onImport={() => setImportOpen(true)}
        onViewHistory={() => {
          if (!selectedTemplateId) {
            setStatusMessage("Salve o template antes de abrir o historico.");
            return;
          }
          setHistoryOpen(true);
          void loadTemplateRevisions(selectedTemplateId);
        }}
        onPreview={() => setStatusMessage("Visualizacao sincronizada.")}
        onDownloadPdf={() => void downloadPdf()}
        onPublish={() => void publishTemplate()}
      />

      <div className="lg:hidden">
        <div className="inline-flex w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
          {[
            { id: "structure", label: "Estrutura" },
            { id: "editor", label: "Editor" },
            { id: "preview", label: "Preview" },
          ].map((tab) => {
            const active = activeMobilePane === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMobilePane(tab.id as MobilePane)}
                className={`relative min-w-0 flex-1 rounded-lg px-2 py-2 text-center text-sm font-medium transition ${
                  active
                    ? "bg-emerald-500 text-zinc-950"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:flex-row lg:gap-4">
        <div className={activeMobilePane === "structure" ? "block lg:block" : "hidden lg:block"}>
          <SidebarPanel
            sections={documentState.sections}
            selectedSectionId={selectedSectionId}
            sensors={dndSensors}
            onDragEnd={onDragEnd}
            onAddSection={(type, variant, fieldsPatch) =>
              addSection(type, { variant, fieldsPatch })
            }
            onSelectSection={selectSection}
            onDuplicateSection={duplicateSection}
            onDeleteSection={deleteSection}
            onToggleSectionHidden={(id) =>
              updateSection(id, {
                hidden: !documentState.sections.find((s) => s.id === id)?.hidden,
              })
            }
            onOpenSettings={() => {
              setSettingsOpen(true);
              setSelectedSectionId("");
              setActiveMobilePane("editor");
            }}
            settingsSelected={settingsOpen}
            branding={documentState.styles.branding}
          />
        </div>

        <div className={activeMobilePane === "editor" ? "block lg:block" : "hidden lg:block"}>
          {settingsOpen ? (
            <SettingsPanel
              mode="inline"
              settingsTab={settingsTab}
              onChangeTab={setSettingsTab}
              documentState={documentState}
              onClose={() => setSettingsOpen(false)}
              onApplyPalette={applyPalette}
              onChangeDocument={setDocumentState}
              onTypographyPreset={applyTypographyPreset}
              onLogoUpload={(file) => void handleImageUpload(file, "logoUrl")}
            />
          ) : (
            <EditorPanel
              selectedSection={selectedSection}
              onSectionTitleChange={(value) => {
                if (!selectedSectionId) return;
                updateSection(selectedSectionId, { title: value });
              }}
              onSectionVariantChange={(value) => {
                if (!selectedSectionId) return;
                setDocumentState((prev) => ({
                  ...prev,
                  sections: prev.sections.map((section) => {
                    if (section.id !== selectedSectionId) return section;
                    const next = { ...section, variant: value };
                    if (next.type === "generation_consumption") {
                      return {
                        ...next,
                        content: renderSectionHtml(
                          next,
                          productCatalogById,
                          prev.styles.branding,
                          prev.variables
                        ),
                      };
                    }
                    return next;
                  }),
                }));
              }}
              onSectionFieldChange={handleSectionFieldChange}
              onSectionImageUpload={handleSectionImageUpload}
              editor={editor}
              onAction={applyAiAction}
              onInsertVariable={insertVariable}
              focusFieldName={
                editorFocusRequest?.sectionId === selectedSectionId
                  ? editorFocusRequest.fieldName
                  : undefined
              }
              focusRequestToken={
                editorFocusRequest?.sectionId === selectedSectionId
                  ? editorFocusRequest.token
                  : undefined
              }
            />
          )}
        </div>

        <div
          className={
            activeMobilePane === "preview"
              ? "block min-w-0 lg:block lg:flex-1"
              : "hidden min-w-0 lg:block lg:flex-1"
          }
        >
          <PreviewPanel
            title={title}
            documentState={previewDocumentState}
            containerRef={previewPanelRef}
            selectedSectionId={selectedSectionId}
            onSelectSection={selectSection}
            onSectionHeightChange={handlePreviewSectionHeightChange}
            sectionRenderOptions={{
              productCatalogById,
              branding: previewDocumentState.styles.branding,
            }}
          />
        </div>
      </div>
      {statusMessage ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {statusMessage}
        </div>
      ) : null}

      {importOpen ? (
        <ImportTemplateModal
          onClose={() => setImportOpen(false)}
          catalogItems={catalogBlueprints}
          catalogLoading={catalogBlueprintsLoading}
          catalogError={
            catalogBlueprintsIsError
              ? catalogBlueprintsError instanceof Error
                ? catalogBlueprintsError.message
                : "Não foi possível carregar o catálogo de modelos."
              : null
          }
          catalogImportingId={catalogImportingId}
          onImportCatalog={handleImportCatalogBlueprint}
          presets={BUILTIN_TEMPLATE_PRESETS}
          savedTemplates={[
            ...(variant === "blueprint"
              ? []
              : remoteTemplates.map((template) => ({
                  id: template.id,
                  name: `${template.name}${template.status === "PUBLISHED" ? " (published)" : ""}`,
                  createdAt: template.createdAt,
                  payload: fromTemplateConfig(template.config) ?? documentState,
                  thumbnailUrl: extractTemplateThumbnail(template.config),
                }))),
            ...savedTemplates,
          ]}
          onImport={importTemplate}
        />
      ) : null}
      <TemplateHistoryModal
        open={historyOpen}
        loading={historyLoading}
        revisions={templateRevisions}
        onClose={() => setHistoryOpen(false)}
        onPreviewRevision={handlePreviewRevision}
        onRestoreRevision={(revision) => void handleRestoreRevision(revision)}
      />
    </div>
  );
}
