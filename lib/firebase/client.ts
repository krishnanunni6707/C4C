/**
 * @deprecated Client-side Firebase SDK has been completely removed in P-06.
 * All database operations are performed server-side via authenticated Next.js API routes
 * and firebase-admin. Browser client SDK is no longer initialized and public Firebase
 * config variables are no longer required in the frontend bundle.
 */

export const db = null as any;
export const storage = null as any;
export const auth = null as any;
export const app = null as any;
