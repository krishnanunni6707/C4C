import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  try {
    const fileRes = await fetch(guard.job.fileUrl, { cache: "no-store" });
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch uploaded file: HTTP ${fileRes.status}` },
        { status: 502 }
      );
    }

    const bytes = Buffer.from(await fileRes.arrayBuffer());

    return NextResponse.json({
      fileName: guard.job.fileName,
      contentType: fileRes.headers.get("content-type") ?? "application/pdf",
      base64Data: bytes.toString("base64"),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load print file" },
      { status: 500 }
    );
  }
}
