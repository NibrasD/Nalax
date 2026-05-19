/**
 * IPFS Service using Pinata
 * Uploads markdown content to IPFS to persist text data off-chain.
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export async function uploadToIPFS(content: string, title?: string): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT is not configured in .env");
  }

  // Create a blob from the markdown content
  const blob = new Blob([content], { type: 'text/markdown' });
  const data = new FormData();
  
  // Format the filename for Pinata visualization
  const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` : 'article.md';
  data.append('file', blob, filename);

  // Optional: add some pinata metadata
  const metadata = JSON.stringify({
    name: `StellarScribe Article: ${title || 'Untitled'}`,
  });
  data.append('pinataMetadata', metadata);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: data,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to upload to IPFS: ${res.status} - ${errorBody}`);
  }

  const resData = await res.json();
  // Pinata returns the CID as 'IpfsHash'
  return resData.IpfsHash;
}

/**
 * Helper to get the public gateway URL for an IPFS CID
 */
export function getIPFSGatewayUrl(cid: string): string {
  // Using Pinata's public gateway or standard ipfs.io
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

// ─── IPFS Content Cache ─────────────────────────────────────────────────────

const CACHE_PREFIX = 'ipfs_cache_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** In-memory LRU-style cache for the current session */
const memoryCache = new Map<string, string>();

/**
 * Fetch IPFS content with two-layer caching:
 * 1. In-memory Map (instant, current tab)
 * 2. sessionStorage (persists across navigations within same tab)
 * 3. Network fetch (gateway) as fallback
 *
 * Returns null if the CID is not a valid IPFS hash or the fetch fails.
 */
export async function fetchIPFSContent(cid: string): Promise<string | null> {
  if (!cid || (!cid.startsWith('Qm') && !cid.startsWith('ba'))) {
    return null;
  }

  // Layer 1: In-memory cache
  if (memoryCache.has(cid)) {
    return memoryCache.get(cid)!;
  }

  // Layer 2: sessionStorage cache
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + cid);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiresAt > Date.now()) {
        // Still valid — promote to memory cache and return
        memoryCache.set(cid, parsed.content);
        return parsed.content;
      } else {
        // Expired — clean up
        sessionStorage.removeItem(CACHE_PREFIX + cid);
      }
    }
  } catch {
    // sessionStorage not available or corrupt — continue to network
  }

  // Layer 3: Network fetch from IPFS gateway
  try {
    const url = getIPFSGatewayUrl(cid);
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();

    // Store in both cache layers
    memoryCache.set(cid, text);
    try {
      sessionStorage.setItem(
        CACHE_PREFIX + cid,
        JSON.stringify({ content: text, expiresAt: Date.now() + CACHE_TTL_MS })
      );
    } catch {
      // sessionStorage full — silently skip
    }

    return text;
  } catch (e) {
    console.error('Failed to fetch IPFS content:', e);
    return null;
  }
}

/**
 * Preload / warm the cache for a list of CIDs.
 * Useful when loading the Explore page to prefetch article content in the background.
 */
export function preloadIPFSContent(cids: string[]): void {
  for (const cid of cids) {
    if (cid && !memoryCache.has(cid)) {
      // Fire and forget — don't block the UI
      fetchIPFSContent(cid).catch(() => {});
    }
  }
}

