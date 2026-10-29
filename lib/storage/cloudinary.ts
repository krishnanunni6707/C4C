import { v2 as cloudinary } from "cloudinary";

/**
 * Configure and get the Cloudinary client instance.
 */
export function getCloudinaryClient() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

/**
 * Generate a short-lived signed delivery URL for an authenticated raw asset.
 * URL expires after `expiresMinutes` (default: 5 minutes).
 */
export function getSignedAssetUrl(publicId: string, expiresMinutes = 5): string {
  const client = getCloudinaryClient();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresMinutes * 60;

  return client.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  });
}

/**
 * Delete a file asset from Cloudinary.
 * Attempts authenticated deletion first, then falls back to public upload deletion.
 */
export async function destroyAsset(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  try {
    const client = getCloudinaryClient();
    const res = await client.uploader.destroy(publicId, {
      resource_type: "raw",
      type: "authenticated",
    });

    if (res?.result === "not found" || res?.result === "notFound") {
      // Fallback for legacy assets uploaded with type 'upload'
      const fallbackRes = await client.uploader.destroy(publicId, {
        resource_type: "raw",
        type: "upload",
      });
      return fallbackRes?.result === "ok";
    }

    return res?.result === "ok";
  } catch (error) {
    console.error(`[storage/cloudinary] Failed to destroy asset ${publicId}:`, error);
    return false;
  }
}
