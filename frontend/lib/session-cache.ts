import { supabase } from "./supabase";
import { Profile } from "./types";

interface CachedSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedSession: CachedSession | null = null;

export async function getCachedSession(): Promise<CachedSession> {
  // Return cached session if still valid
  if (cachedSession && Date.now() - cachedSession.timestamp < CACHE_DURATION) {
    return cachedSession;
  }

  // Fetch fresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cachedSession = { user: null, profile: null, timestamp: Date.now() };
    return cachedSession;
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  cachedSession = {
    user: { id: user.id, email: user.email || "" },
    profile: profile as Profile,
    timestamp: Date.now(),
  };

  return cachedSession;
}

export function clearSessionCache() {
  cachedSession = null;
}

export function updateSessionCache(profile: Profile) {
  if (cachedSession) {
    cachedSession.profile = profile;
    cachedSession.timestamp = Date.now();
  }
}

// Prefetch common data
const dataCache = new Map<string, { data: unknown; timestamp: number }>();
const DATA_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  forceRefresh = false,
): Promise<T> {
  const cached = dataCache.get(key);

  if (
    !forceRefresh &&
    cached &&
    Date.now() - cached.timestamp < DATA_CACHE_DURATION
  ) {
    return cached.data as T;
  }

  const data = await fetcher();
  dataCache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function invalidateCache(keyPrefix?: string) {
  if (keyPrefix) {
    const keysToDelete: string[] = [];
    dataCache.forEach((_, key) => {
      if (key.startsWith(keyPrefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => dataCache.delete(key));
  } else {
    dataCache.clear();
  }
}
