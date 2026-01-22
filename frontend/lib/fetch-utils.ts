// Optimized data fetching utilities

import { supabase } from "./supabase";

// Generic fetch with timeout and retry
export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  options: { retries?: number; timeout?: number } = {},
): Promise<T> {
  const { retries = 2, timeout = 10000 } = options;

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await fetcher();
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      if (i === retries) throw error;
      // Wait before retry (exponential backoff)
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
    }
  }

  throw new Error("Failed after retries");
}

// Batch multiple Supabase queries for parallel execution
export async function batchQueries<
  T extends Record<string, () => Promise<any>>,
>(queries: T): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(queries) as (keyof T)[];
  const promises = keys.map((key) => queries[key]());
  const results = await Promise.all(promises);

  return keys.reduce(
    (acc, key, index) => {
      acc[key] = results[index];
      return acc;
    },
    {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> },
  );
}

// Preload data for upcoming navigation
const preloadCache = new Map<string, { data: any; timestamp: number }>();
const PRELOAD_TTL = 30000; // 30 seconds

export function preloadData(key: string, fetcher: () => Promise<any>) {
  // Don't preload if already cached and fresh
  const cached = preloadCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRELOAD_TTL) {
    return;
  }

  // Fetch in background
  fetcher()
    .then((data) => {
      preloadCache.set(key, { data, timestamp: Date.now() });
    })
    .catch(() => {
      // Silently fail preloading
    });
}

export function getPreloadedData<T>(key: string): T | null {
  const cached = preloadCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRELOAD_TTL) {
    return cached.data as T;
  }
  return null;
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle function for scroll handlers
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Intersection Observer hook for lazy loading
export function createLazyLoader(
  callback: () => void,
): IntersectionObserver | null {
  if (typeof window === "undefined") return null;

  return new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        callback();
      }
    },
    { rootMargin: "100px" },
  );
}
