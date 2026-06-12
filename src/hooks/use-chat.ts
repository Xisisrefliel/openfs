/* ------------------------------------------------------------------ */
/* Plaudern — single client-side source of truth                       */
/*                                                                     */
/* /plaudern reads the DB-backed conversation list from                */
/* /api/conversations via useConversations and the active thread from  */
/* /api/conversations/:id/messages via useMessages. Sends go through   */
/* sendChatMessage + refresh, so everything persists across reloads.   */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";

import { parseOrThrow, useFetchList } from "@/lib/api";

export type ChatSender = "schule" | "schueler";

export type Conversation = {
  id: number;
  studentId: number | null;
  studentName: string;
  lastMessageAt: string | null;
  unread: number;
  createdAt: string;
  lastMessage: string;
};

export type ChatMessage = {
  id: number;
  conversationId: number;
  sender: ChatSender;
  text: string;
  sentAt: string;
};

export type ConversationInput = {
  student_id?: number | null;
  student_name: string;
};

export async function fetchConversations(): Promise<Conversation[]> {
  const data = await parseOrThrow<{ conversations: Conversation[] }>(
    await fetch("/api/conversations")
  );
  return data.conversations;
}

export async function fetchMessages(
  conversationId: number
): Promise<ChatMessage[]> {
  const data = await parseOrThrow<{ messages: ChatMessage[] }>(
    await fetch(`/api/conversations/${conversationId}/messages`)
  );
  return data.messages;
}

export async function sendChatMessage(
  conversationId: number,
  text: string
): Promise<ChatMessage> {
  return parseOrThrow<ChatMessage>(
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
  );
}

export async function markConversationRead(
  conversationId: number
): Promise<Conversation> {
  return parseOrThrow<Conversation>(
    await fetch(`/api/conversations/${conversationId}/read`, {
      method: "POST",
    })
  );
}

export async function createConversation(
  input: ConversationInput
): Promise<Conversation> {
  return parseOrThrow<Conversation>(
    await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteConversation(
  conversationId: number
): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" })
  );
}

export function useConversations() {
  const { items: conversations, loading, refresh } = useFetchList(
    fetchConversations,
    "Unterhaltungen konnten nicht geladen werden"
  );
  return { conversations, loading, refresh };
}

/** Messages of the active thread — refetches whenever the id changes.
 *  Pass null while no conversation is selected. */
export function useMessages(conversationId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (conversationId === null) {
      setMessages([]);
      return;
    }
    const version = ++requestVersion.current;
    try {
      const result = await fetchMessages(conversationId);
      if (requestVersion.current === version) setMessages(result);
    } catch (error) {
      console.error("Nachrichten konnten nicht geladen werden:", error);
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    setLoading(conversationId !== null);
    void refresh();
  }, [conversationId, refresh]);

  return { messages, loading, refresh };
}
