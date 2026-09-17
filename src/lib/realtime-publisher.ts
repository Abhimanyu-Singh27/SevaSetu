import type { RealtimeEvent } from "@/lib/realtime";

export interface RealtimePublisher {
  publish(event: RealtimeEvent): Promise<void>;
}

export class RedisRealtimePublisher implements RealtimePublisher {
  async publish(event: RealtimeEvent) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return;
    const response = await fetch(`${url}/publish/sevasetu-events/${encodeURIComponent(JSON.stringify(event))}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Realtime publication failed");
  }
}

export class WebSocketRealtimePublisher implements RealtimePublisher {
  constructor(private readonly publishUrl = process.env.WEBSOCKET_PUBLISH_URL, private readonly token = process.env.WEBSOCKET_PUBLISH_TOKEN) {}

  async publish(event: RealtimeEvent) {
    if (!this.publishUrl || !this.token) return;
    const response = await fetch(this.publishUrl, { method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }, body: JSON.stringify(event), cache: "no-store" });
    if (!response.ok) throw new Error("WebSocket gateway publication failed");
  }
}

export function realtimePublisher(): RealtimePublisher {
  return process.env.WEBSOCKET_PUBLISH_URL ? new WebSocketRealtimePublisher() : new RedisRealtimePublisher();
}
