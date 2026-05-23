/** Admin helpers for collection (album) CRUD during upload flows. */
import { BACKEND_URL } from "@/lib/api";

export async function createCollection(name: string): Promise<{ ok: boolean; id?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        description: `Created on ${new Date().toLocaleDateString()}`,
      }),
    });
    if (!response.ok) return { ok: false };
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false };
  }
}

export function collectionExists(collections: { name: string }[], name: string): boolean {
  return collections.some((c) => c.name.toLowerCase() === name.toLowerCase());
}
