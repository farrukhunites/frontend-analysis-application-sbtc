const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

export const cached = async (key, fetcher) => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < TTL) return entry.data;
  const data = await fetcher();
  cache.set(key, { data, ts: Date.now() });
  return data;
};

export const invalidateCache = (key) => cache.delete(key);
export const clearCache = () => cache.clear();
