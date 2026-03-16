/**
 * Module-level data cache — survives component remounts, not page reloads.
 * Returns cached data immediately, refetches in background if stale (>5 min).
 *
 * Usage:
 *   const { data, loading } = useDataCache("dashboard", fetchDashboard);
 */
import { useState, useEffect, useRef } from "react";

const _cache = new Map();   // key → { data, ts }
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export default function useDataCache(key, fetchFn) {
  const entry = _cache.get(key);
  const [data, setData] = useState(entry?.data ?? null);
  const [loading, setLoading] = useState(!entry);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    const cached = _cache.get(key);
    if (cached) {
      setData(cached.data);
      setLoading(false);
      // Background refresh if stale
      if (Date.now() - cached.ts > STALE_MS) {
        fetchRef.current().then(d => {
          _cache.set(key, { data: d, ts: Date.now() });
          setData(d);
        }).catch(() => {});
      }
      return;
    }
    // No cache — fetch fresh
    setLoading(true);
    fetchRef.current().then(d => {
      _cache.set(key, { data: d, ts: Date.now() });
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [key]);

  return { data, loading };
}

/** Manually set a cache entry (e.g. from polling results). */
export function setCacheEntry(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

/** Check if a key is already cached. */
export function hasCacheEntry(key) {
  return _cache.has(key);
}
