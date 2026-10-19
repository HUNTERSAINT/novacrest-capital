import { useState, useEffect } from "react";

const TOKEN_KEY = "novacrest_token";
const cache = new Map<string, string>(); // objectPath → blob URL

/**
 * Fetches a private storage object with the auth token and returns
 * a local blob: URL safe to use in <img src> or anchor[href].
 * `objectPath` should be in the form "/objects/<uuid>" as stored in the DB.
 */
export function useObjectUrl(objectPath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!objectPath) { setUrl(null); return; }
    if (cache.has(objectPath)) { setUrl(cache.get(objectPath)!); return; }

    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY) ?? "";

    // Convert "/objects/uuid" → "/api/storage/objects/uuid"
    const apiPath = `/api/storage${objectPath}`;

    fetch(apiPath, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.blob() : Promise.reject(r.status))
      .then(blob => {
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        cache.set(objectPath, blobUrl);
        setUrl(blobUrl);
      })
      .catch(() => { if (!cancelled) setUrl(null); });

    return () => { cancelled = true; };
  }, [objectPath]);

  return url;
}

/** Trigger a browser download for an object path. */
export async function downloadObject(objectPath: string, filename: string) {
  const token = localStorage.getItem(TOKEN_KEY) ?? "";
  const apiPath = `/api/storage${objectPath}`;
  const res = await fetch(apiPath, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
