/** Upload via Vite proxy with HttpOnly session cookie (backend auth). */
export async function uploadAdminFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
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
