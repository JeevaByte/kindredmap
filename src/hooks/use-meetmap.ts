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
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
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

const urlCache = new Map<string, string>();

/** Resolves a stored image reference: storage path, "preset:🦊", or null. */
export function useStoredUrl(reference: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() =>
    reference && urlCache.has(reference) ? (urlCache.get(reference) as string) : null,
  );

  useEffect(() => {
    let active = true;
    if (!reference || reference.startsWith("preset:")) {
      setUrl(null);
      return;
    }
    if (reference.startsWith("http")) {
      setUrl(reference);
      return;
    }
    const cached = urlCache.get(reference);
    if (cached) {
      setUrl(cached);
      return;
    }
    supabase.storage
      .from("meetmap")
      .createSignedUrl(reference, 3600)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        urlCache.set(reference, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
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
