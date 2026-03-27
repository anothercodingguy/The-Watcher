"use client";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";

export function useLogs(service?: string, level?: string, limit = 50) {
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (level) params.set("level", level);
  params.set("limit", String(limit));

  return useSWR(
    `/api/logs?${params.toString()}`,
    (path: string) => apiFetch<any[]>(path),
    { refreshInterval: 5000 }
  );
}
