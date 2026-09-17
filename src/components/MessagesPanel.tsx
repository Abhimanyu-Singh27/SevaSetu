"use client";

import { FormEvent, useEffect, useState } from "react";

type Conversation = { id: string; request: { id: string; status: string; service: { name: string } } | null; members: { userId: string; user: { displayName: string | null; customerProfile: { fullName: string } | null; workerProfile: { fullName: string } | null } }[]; messages: { body: string | null; createdAt: string }[] };
type Message = { id: string; senderId: string; body: string | null; createdAt: string };

export function MessagesPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/conversations", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("Unable to load conversations"); return response.json(); }).then((result) => setConversations(result.data)).catch(() => setError("Unable to load messages." )).finally(() => setLoading(false));
  }, []);

  async function openConversation(conversation: Conversation) {
    setSelected(conversation); setError("");
    const response = await fetch(`/api/v1/conversations/${conversation.id}/messages`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to load conversation"); return; }
    setMessages(result.data.reverse());
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    const response = await fetch(`/api/v1/conversations/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ conversationId: selected.id, body }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to send message"); return; }
    setMessages((current) => [...current, result.data]); setBody("");
  }

  if (loading) return <div className="workspace-empty" aria-busy="true">Loading messages...</div>;
  if (error && !selected) return <div className="workspace-empty"><h2>{error}</h2><button className="button" type="button" onClick={() => window.location.reload()}>Try Again</button></div>;
  return <div className="messages-layout"><section className="workspace-table">{conversations.length ? conversations.map((conversation) => <button className="workspace-row message-conversation" type="button" key={conversation.id} onClick={() => openConversation(conversation)}><strong>{conversation.request?.service.name || "Service conversation"}</strong><small>{conversation.messages[0]?.body || "No messages yet"}</small><span className="status-pill">{conversation.request?.status || "Open"}</span></button>) : <div className="workspace-empty"><h2>No conversations yet</h2><p>Messages appear after a service request connects you with another participant.</p></div>}</section><section className="portal-panel message-thread"><h2>{selected?.request?.service.name || "Select a conversation"}</h2>{selected && <><div className="message-list">{messages.map((message) => <p key={message.id}>{message.body}<small>{new Date(message.createdAt).toLocaleString("en-IN")}</small></p>)}</div><form onSubmit={send} className="message-compose"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message" maxLength={5000} /><button className="button" type="submit">Send</button></form></>}</section></div>;
}
