"use client";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";

export function useTraces(service = "gateway-service", limit = 20) {
  return useSWR(
    `/api/traces?service=${service}&limit=${limit}`,
    (path: string) => apiFetch<any[]>(path),
    { refreshInterval: 10000 }
  );
}

export function useTraceDetail(traceId: string | null) {
  return useSWR(
    traceId ? `/api/traces/${traceId}` : null,
    (path: string) => apiFetch<any>(path)
  );
}
