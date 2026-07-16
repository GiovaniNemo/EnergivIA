import { PreviewDocument } from "@/components/proposals/editor/preview-document";
import { verifyThumbnailPayload } from "@/lib/thumbnail-render-token";
import { getThumbnailRenderSession } from "@/lib/thumbnail-render-store";

export default async function InternalTemplateThumbnailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const params = await searchParams;
  const sessionId = typeof params["id"] === "string" ? params["id"] : "";
  const sig = typeof params["sig"] === "string" ? params["sig"] : "";
  console.info("[thumbnail-render-page] request", {
    hasSessionId: Boolean(sessionId),
    hasSig: Boolean(sig),
  });
  const validSig = sessionId && sig && verifyThumbnailPayload(sessionId, sig);
  console.info("[thumbnail-render-page] signature", {
    sessionId: sessionId || undefined,
    validSig: Boolean(validSig),
  });
  const session = validSig ? getThumbnailRenderSession(sessionId) : null;
  console.info("[thumbnail-render-page] session lookup", {
    sessionId: sessionId || undefined,
    found: Boolean(session),
    sectionCount: session?.documentState.sections?.length ?? 0,
  });
  if (!session) {
    return <main>invalid thumbnail token</main>;
  }

  return (
    <main className="min-h-screen bg-[#060b16] p-6">
      <div className="mx-auto w-full max-w-[1200px]">
        <PreviewDocument
          title={session.title}
          documentState={session.documentState}
          mode="web"
          viewport="desktop"
        />
      </div>
    </main>
  );
}
