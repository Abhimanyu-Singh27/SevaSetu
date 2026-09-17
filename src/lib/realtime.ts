export type RealtimeEventName =
  | "request.created"
  | "request.updated"
  | "request.status_changed"
  | "message.created"
  | "notification.created"
  | "review.created"
  | "report.updated"
  | "availability.updated";

export type RealtimeEvent<TPayload = Record<string, unknown>> = {
  id: string;
  name: RealtimeEventName;
  occurredAt: string;
  actorId: string;
  audienceUserIds: string[];
  payload: TPayload;
};

export type RequestStatusAction =
  | "submit"
  | "accept"
  | "reject"
  | "schedule"
  | "en_route"
  | "start"
  | "complete"
  | "cancel"
  | "dispute";

export function createRealtimeEvent<TPayload>(
  name: RealtimeEventName,
  actorId: string,
  audienceUserIds: string[],
  payload: TPayload,
): RealtimeEvent<TPayload> {
  return {
    id: crypto.randomUUID(),
    name,
    occurredAt: new Date().toISOString(),
    actorId,
    audienceUserIds,
    payload,
  };
}