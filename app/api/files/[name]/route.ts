import { auth } from "@/lib/auth";
import { isSafeStoredName, readStoredFile } from "@/lib/upload";
import { prisma } from "@/lib/db";
import { canViewPolicy } from "@/lib/rbac";
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
  if (!isSafeStoredName(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const policy = await prisma.policy.findFirst({
    where: { fileUrl: name },
    select: { status: true, authorId: true, fileName: true },
  });

  if (
    !policy ||
    !canViewPolicy(
      session.user.role,
      policy.status,
      policy.authorId === session.user.id,
    )
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(name);
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    const downloadName = policy.fileName ?? name;

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.data.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${downloadName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
