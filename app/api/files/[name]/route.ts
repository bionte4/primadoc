import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { watermarkPdf } from "@/lib/pdf-watermark";
import { canViewPolicy } from "@/lib/rbac";
import { verifyFileSignature } from "@/lib/signed-file";
import { isSafeStoredName, readStoredFile } from "@/lib/upload";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ name: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await context.params;
  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  const uid = url.searchParams.get("uid") ?? "";
  const exp = url.searchParams.get("exp") ?? "";
  const sig = url.searchParams.get("sig") ?? "";

  if (
    uid !== session.user.id ||
    !verifyFileSignature({ storedName: name, userId: uid, exp, sig, inline })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSafeStoredName(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const policy = await prisma.policy.findFirst({
    where: { fileUrl: name },
    select: { status: true, authorId: true, fileName: true },
  });

  if (
    !policy ||
    !canViewPolicy(session.user.role, policy.status, policy.authorId === session.user.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(name);
    const downloadName = policy.fileName ?? name;
    let body = file.data;
    if (file.contentType === "application/pdf") {
      const label = `${session.user.name || "Karyawan"} · ${session.user.email || session.user.id}`;
      body = await watermarkPdf(file.data, label);
    }

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(body.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${downloadName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
