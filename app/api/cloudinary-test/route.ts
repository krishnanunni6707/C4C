/**
 * GET /api/cloudinary-test
 * Pings Cloudinary with the current env config.
 * Use this to verify your cloud name before uploading.
 * Remove before production.
 */

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

export const dynamic = "force-dynamic";

export async function GET() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({
      ok: false,
      error: "Missing env vars",
      missing: {
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: !cloudName,
        CLOUDINARY_API_KEY: !apiKey,
        CLOUDINARY_API_SECRET: !apiSecret,
      },
    });
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  try {
    const result = await cloudinary.api.ping();
    return NextResponse.json({
      ok: true,
      cloud_name: cloudName,
      ping: result,
      message: "✅ Cloudinary connection successful",
    });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    const inner = e?.error as Record<string, unknown> | undefined;
    return NextResponse.json({
      ok: false,
      cloud_name: cloudName,
      error: inner?.message ?? e?.message ?? String(err),
      http_code: inner?.http_code,
      hint: inner?.message === "cloud_name mismatch"
        ? "The cloud name in NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME does not match your Cloudinary account. Go to https://cloudinary.com/console and copy the exact Cloud Name shown at the top."
        : undefined,
    }, { status: 400 });
  }
}
