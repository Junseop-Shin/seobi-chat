const INGESTOR_URL = process.env.NEXT_PUBLIC_INGESTOR_URL;

export function trackEvent(
  eventType: string,
  metadata: Record<string, unknown> = {}
) {
  if (!INGESTOR_URL || typeof window === "undefined") return;
  fetch(`${INGESTOR_URL}/v1/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: eventType,
      service_id: "seobi-chat",
      metadata: {
        ...metadata,
        path: window.location.pathname,
        referrer: document.referrer || undefined,
        utm_source:
          new URLSearchParams(window.location.search).get("utm_source") ||
          undefined,
      },
    }),
  }).catch(() => {});
}
