"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LocalizedNav, LocalizedDate, LocalizedInput, LocalizedText as T } from "./LocalizedText";
import { Feedback } from "./portal/Actions";

type Conversation = { id: string; request: { id: string; status: string; service: { name: string } } | null; members: { userId: string; user: { displayName: string | null; customerProfile: { fullName: string } | null; workerProfile: { fullName: string } | null } }[]; messages: { body: string | null; createdAt: string }[] };
type Message = { id: string; senderId: string; body: string | null; createdAt: string };
export function MessagesPanel({ currentUserId = "", initialConversationId = "", role = "customer" }: { currentUserId?: string; initialConversationId?: string; role?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]); const [cursor, setCursor] = useState<string | null>(null);
  const [body, setBody] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [sending, setSending] = useState(false); const [loadingOlder, setLoadingOlder] = useState(false);
  const selectedRef = useRef(selectedId); const bottom = useRef<HTMLDivElement>(null);
  const loadedConversation = useRef("");
  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const loadConversations = useCallback(async (signal?: AbortSignal) => {
    try { const response = await fetch("/api/v1/conversations", { cache: "no-store", signal }); if (!response.ok) throw new Error("Unable to load conversations"); const result = await response.json(); if (!signal?.aborted) { setConversations(result.data); setError(""); } }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Unable to load messages."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  const loadMessages = useCallback(async (id: string, olderCursor?: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/v1/conversations/${id}/messages${olderCursor ? `?cursor=${encodeURIComponent(olderCursor)}` : ""}`, { cache: "no-store", signal });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "Unable to load conversation");
      if (signal?.aborted || selectedRef.current !== id) return;
      setMessages((current) => { const merged = new Map(current.map((message) => [message.id, message])); for (const message of result.data as Message[]) merged.set(message.id, message); return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)); });
      if (olderCursor || loadedConversation.current !== id) { setCursor(result.meta.nextCursor); loadedConversation.current = id; }
      setError(""); window.dispatchEvent(new Event("sevasetu:refresh"));
    } catch (cause) { if (!signal?.aborted && selectedRef.current === id) setError(cause instanceof Error ? cause.message : "Unable to load conversation"); }
  }, []);
  useEffect(() => { const controller = new AbortController(); queueMicrotask(() => { if (!controller.signal.aborted) void loadConversations(controller.signal); }); const timer = window.setInterval(() => { if (!document.hidden) void loadConversations(controller.signal); }, 15000); return () => { controller.abort(); clearInterval(timer); }; }, [loadConversations]);
  useEffect(() => {
    selectedRef.current = selectedId;
    if (!selectedId) return;
    const controller = new AbortController(); queueMicrotask(() => { if (!controller.signal.aborted) void loadMessages(selectedId, undefined, controller.signal); });
    const timer = window.setInterval(() => { if (!document.hidden) void loadMessages(selectedId, undefined, controller.signal); }, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selectedId, loadMessages]);
  async function send(event: FormEvent) {
    event.preventDefault(); if (!selectedId || !body.trim() || sending) return; setSending(true); setError("");
    try {
      const response = await fetch(`/api/v1/conversations/${selectedId}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ conversationId: selectedId, body: body.trim() }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "Unable to send message");
      setMessages((current) => [...current.filter((message) => message.id !== result.data.id), result.data]); setBody(""); void loadConversations(); queueMicrotask(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send message"); } finally { setSending(false); }
  }
  return <><Feedback error={error} />{loading ? <div className="portal-empty" role="status"><T>Loading messages...</T></div> : !conversations.length ? <div className="portal-empty"><h2><T>No conversations yet</T></h2><p><T>Messages appear after a service request connects you with another participant.</T></p><Link className="button" href={`/${role}/requests`}><T>View requests</T></Link></div> : <div className="portal-messages"><LocalizedNav className="portal-conversations" aria-label="Conversations">{conversations.map((conversation) => { const other = conversation.members.find((member) => member.userId !== currentUserId)?.user; return <button key={conversation.id} type="button" aria-pressed={selectedId === conversation.id} onClick={() => { if (conversation.id !== selectedId) { selectedRef.current = conversation.id; setMessages([]); setCursor(null); setBody(""); setError(""); setSelectedId(conversation.id); } }}><strong>{other?.workerProfile?.fullName || other?.customerProfile?.fullName || other?.displayName || <T>Service conversation</T>}</strong><span><T>{conversation.request?.service.name || "Service conversation"}</T></span><small>{conversation.messages[0]?.body || <T>No messages yet</T>}</small></button>; })}</LocalizedNav><section className="portal-message-thread">{selected ? <><header><h2><T>{selected.request?.service.name || "Service conversation"}</T></h2>{selected.request && <Link className="text-button" href={`/${role}/requests?request=${selected.request.id}`}><T>View request</T></Link>}</header><div className="portal-message-history" aria-live="polite">{cursor && <button className="outline-button" type="button" disabled={loadingOlder} onClick={async () => { setLoadingOlder(true); await loadMessages(selectedId, cursor); setLoadingOlder(false); }}><T>{loadingOlder ? "Loading..." : "Load older messages"}</T></button>}{!messages.length && <p><T>No messages yet</T></p>}{messages.map((message) => <article className={`portal-chat-bubble${message.senderId === currentUserId ? " is-mine" : ""}`} key={message.id}><p>{message.body}</p><small><LocalizedDate value={message.createdAt} time /></small></article>)}<div ref={bottom} /></div><form onSubmit={send} className="message-compose"><LocalizedInput value={body} required onChange={(event) => setBody(event.target.value)} placeholder="Write a message" aria-label="Write a message" maxLength={5000} disabled={sending} /><button type="submit" className="button" disabled={sending || !body.trim()}><T>{sending ? "Sending..." : "Send"}</T></button></form></> : <div className="portal-empty"><h2><T>Select a conversation</T></h2></div>}</section></div>}</>;
}
