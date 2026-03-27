"use client";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";

export function useCurrentIncident() {
  return useSWR("/api/incidents/current", (path: string) => apiFetch<any>(path), {
    refreshInterval: 10000,
  });
}

export async function askAI(question: string) {
  return apiFetch<any>("/api/incidents/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
