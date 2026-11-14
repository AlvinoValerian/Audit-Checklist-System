"use client";

import { useEffect, useRef } from "react";
import { AuthService } from "@/lib/auth";

type EventCallback = (data: any) => void;

interface UseRealtimeOptions {
  workspaceId?: string;
  onAuditSubmitted?: EventCallback;
  onScheduleUpdated?: EventCallback;
  onIssueNew?: EventCallback;
}

/**
 * Hook Server-Sent Events (SSE) untuk realtime multi-tenant yang ringan
 * Menghubungkan browser langsung ke backend /api/realtime/events dengan auto-reconnect
 */
export function useRealtimeEvents({
  workspaceId,
  onAuditSubmitted,
  onScheduleUpdated,
  onIssueNew,
}: UseRealtimeOptions) {
  const onAuditSubmittedRef = useRef(onAuditSubmitted);
  onAuditSubmittedRef.current = onAuditSubmitted;

  const onScheduleUpdatedRef = useRef(onScheduleUpdated);
  onScheduleUpdatedRef.current = onScheduleUpdated;

  const onIssueNewRef = useRef(onIssueNew);
  onIssueNewRef.current = onIssueNew;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = AuthService.getToken();
    if (!token) return;

    const activeWs = AuthService.getActiveWorkspace();
    const wsId = workspaceId || activeWs?.id || "all";

    const params = new URLSearchParams();
    if (wsId) params.set("workspaceId", wsId);
    if (token) params.set("token", token);

    const sseUrl = `/api/realtime/events?${params.toString()}`;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener("connected", () => {
          // Handshake connected successfully
        });

        eventSource.addEventListener("audit:submitted", (e) => {
          try {
            const parsed = JSON.parse(e.data);
            onAuditSubmittedRef.current?.(parsed);
          } catch {}
        });

        eventSource.addEventListener("schedule:updated", (e) => {
          try {
            const parsed = JSON.parse(e.data);
            onScheduleUpdatedRef.current?.(parsed);
          } catch {}
        });

        eventSource.addEventListener("issue:new", (e) => {
          try {
            const parsed = JSON.parse(e.data);
            onIssueNewRef.current?.(parsed);
          } catch {}
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isDisposed) {
            // Auto reconnect backoff after 5s
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch {
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [workspaceId]);
}
