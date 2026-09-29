import { Download } from "lucide-react";
import type { DocumentView } from "@/lib/document-view";
import { fileUrlTtlSeconds, signFileUrl } from "@/lib/signed-file";
import { fill, getDictionary } from "@/lib/i18n";

export async function DocumentViewer({
  fileUrl,
  fileName,
  view,
  viewer,
}: {
  fileUrl: string;
  fileName: string | null;
  view: DocumentView;
  viewer: { id: string; name?: string | null; email?: string | null };
}) {
  const { t } = await getDictionary();
  const downloadHref = signFileUrl(fileUrl, viewer.id, false);
  const inlineHref = signFileUrl(fileUrl, viewer.id, true);
  const label = `${viewer.name || t.common.employeeFallback} · ${viewer.email || ""}`.trim();
  const minutes = Math.round(fileUrlTtlSeconds() / 60);

  return (
    <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.detail.read}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {fill(t.detail.linkNote, { minutes })}
          </p>
        </div>
        <a
          href={downloadHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Download className="size-3.5" />
          {t.detail.download}
        </a>
      </div>
      {fileName && <p className="mt-2 text-xs text-muted-foreground">{fileName}</p>}
      <div className="relative mt-2">
        {view.kind === "pdf" && (
          <iframe
            title={fileName ?? t.detail.pdfTitle}
            src={`${inlineHref}#toolbar=1`}
            className="h-[72vh] min-h-112 w-full rounded-md border bg-white"
          />
        )}
        {view.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inlineHref}
            alt={fileName ?? t.detail.imageAlt}
            className="max-h-[72vh] w-full rounded-md border bg-white object-contain"
          />
        )}
        {view.kind === "html" && (
          <div
            className="h-[72vh] min-h-112 overflow-auto rounded-md border bg-white px-6 py-5 text-sm leading-6 text-slate-900 [&_a]:text-blue-700 [&_a]:underline [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_table]:mb-3 [&_table]:w-full [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: view.html }}
          />
        )}
        {view.kind === "text" && (
          <pre className="h-[72vh] min-h-112 overflow-auto rounded-md border bg-white px-6 py-5 font-sans text-sm leading-6 whitespace-pre-wrap text-slate-900">
            {view.text}
          </pre>
        )}
        {view.kind === "unavailable" && (
          <p className="text-xs text-muted-foreground">
            {t.detail.unavailable}
          </p>
        )}
        {view.kind !== "pdf" && view.kind !== "unavailable" && <ScreenWatermark label={label} />}
      </div>
    </section>
  );
}

function ScreenWatermark({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md" aria-hidden>
      <div className="flex h-full flex-wrap content-center justify-center gap-x-16 gap-y-20 p-8">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="rotate-[32deg] text-sm font-medium text-slate-500/35">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
