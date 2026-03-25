const INGESTOR_URL = process.env.NEXT_PUBLIC_INGESTOR_URL;

function getAnonymousId(): string {
  const key = "_aid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

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
      user_id: getAnonymousId(),
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
