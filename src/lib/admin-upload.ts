/** Upload via backend API with HttpOnly session cookie (backend auth).
 *  Uses BACKEND_URL so it works in both browser (via Vite proxy) and
 *  Capacitor native builds where there is no proxy.
 */
import { BACKEND_URL } from "@/lib/api";

export async function uploadAdminFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Upload failed");
  }
  return data as { ok: true; url: string; thumbnailUrl?: string; duration?: number };
}
