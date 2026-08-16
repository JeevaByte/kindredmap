import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Connection, Profile } from "@/lib/meetmap";

export function useCurrentUserId() {
  const { data } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 60_000,
  });
  return data ?? null;
}

export function useMyProfile() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** True only when the backend says this member finished registration. */
export function useIsRegistered() {
  const { data, isLoading } = useMyProfile();
  return { registered: data?.registration_status === "complete", loading: isLoading };
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("registration_status", "complete")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useMyConnections() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["connections", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Connection[];
    },
  });
}

export function useInvalidateMeetMap() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["connections"] });
    void qc.invalidateQueries({ queryKey: ["members"] });
    void qc.invalidateQueries({ queryKey: ["profile"] });
    void qc.invalidateQueries({ queryKey: ["fun-facts"] });
  };
}

export async function uploadImage(file: File, userId: string, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("meetmap").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Treat a signed URL as stale slightly before it actually dies, so an <img>
 * never starts loading a URL that expires mid-flight.
 */
const SIGNED_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;

type CachedUrl = { url: string; expiresAt: number };

/**
 * Signed URLs are expensive to mint and are requested for the same avatar by
 * many components at once, so they are cached module-wide. Entries carry an
 * expiry: the URLs are only valid for an hour, and a cache that never expired
 * meant every image silently broke once a session ran long enough.
 */
const urlCache = new Map<string, CachedUrl>();

/** De-duplicates concurrent signing requests for the same object. */
const inflight = new Map<string, Promise<string | null>>();

function readCachedUrl(reference: string): string | null {
  const hit = urlCache.get(reference);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    urlCache.delete(reference);
    return null;
  }
  return hit.url;
}

function signStoredUrl(reference: string): Promise<string | null> {
  const pending = inflight.get(reference);
  if (pending) return pending;

  const request = supabase.storage
    .from("meetmap")
    .createSignedUrl(reference, SIGNED_URL_TTL_SECONDS)
    .then(({ data }) => {
      const signed = data?.signedUrl ?? null;
      if (signed) {
        urlCache.set(reference, {
          url: signed,
          expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 - SIGNED_URL_REFRESH_MARGIN_MS,
        });
      }
      return signed;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(reference);
    });

  inflight.set(reference, request);
  return request;
}

/** Resolves a stored image reference: storage path, "preset:🦊", or null. */
export function useStoredUrl(reference: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() =>
    reference ? readCachedUrl(reference) : null,
  );

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!reference || reference.startsWith("preset:")) {
      setUrl(null);
      return;
    }
    if (reference.startsWith("http")) {
      setUrl(reference);
      return;
    }

    // Long-lived screens (the map, the network orbit) can outlive a signed
    // URL, and the effect will not re-run because `reference` never changes.
    // Re-sign on a timer so those images keep working.
    function scheduleRefresh() {
      const hit = urlCache.get(reference as string);
      if (!hit) return;
      timer = setTimeout(resolve, Math.max(hit.expiresAt - Date.now(), 0));
    }

    function resolve() {
      if (!active) return;
      const cached = readCachedUrl(reference as string);
      if (cached) {
        setUrl(cached);
        scheduleRefresh();
        return;
      }
      void signStoredUrl(reference as string).then((signed) => {
        if (!active) return;
        setUrl(signed);
        scheduleRefresh();
      });
    }

    resolve();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [reference]);

  return url;
}

/** Anonymous fun facts other members added about someone. */
export function useFunFacts(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["fun-facts", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fun_facts_about", { _target: profileId! });
      if (error) throw error;
      return ((data ?? []) as { fun_fact: string }[])
        .map((row) => row.fun_fact?.trim())
        .filter((f): f is string => !!f);
    },
  });
}
