/* ------------------------------------------------------------------ */
/* Unit tests for the Plaudern chat module: ensure/seed, send/read/    */
/* unread flow, conversation reuse and cascade delete.                 */
/* In-memory DB per test.                                              */
/* ------------------------------------------------------------------ */

import { beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import {
  createConversation,
  deleteConversation,
  ensureChatTables,
  getConversation,
  listConversations,
  listMessages,
  markRead,
  sendMessage,
} from "./chat";
import { openDb } from "./db";
import { ValidationError } from "./engine";

let db: Database;

beforeEach(() => {
  db = openDb(":memory:");
  ensureChatTables(db);
});

describe("ensureChatTables", () => {
  test("a fresh DB seeds 4 conversations with messages", () => {
    const conversations = listConversations(db);
    expect(conversations).toHaveLength(4);
    for (const conversation of conversations) {
      expect(conversation.studentName.length).toBeGreaterThan(0);
      expect(conversation.lastMessage.length).toBeGreaterThan(0);
      expect(conversation.lastMessageAt).not.toBeNull();
      expect(listMessages(db, conversation.id).length).toBeGreaterThan(0);
    }
  });

  test("is idempotent — a second call does not duplicate the seed", () => {
    ensureChatTables(db);
    expect(listConversations(db)).toHaveLength(4);
  });

  test("seed links student ids when the students table has rows", () => {
    const conversations = listConversations(db);
    expect(conversations.some(c => c.studentId !== null)).toBe(true);
  });

  test("works on a bare DB without a students table (plain names)", () => {
    const bare = new Database(":memory:");
    ensureChatTables(bare);
    const conversations = listConversations(bare);
    expect(conversations).toHaveLength(4);
    expect(conversations.every(c => c.studentId === null)).toBe(true);
    expect(conversations.every(c => c.studentName.length > 0)).toBe(true);
  });

  test("conversations are ordered by last_message_at desc", () => {
    const conversations = listConversations(db);
    for (let i = 1; i < conversations.length; i++) {
      expect(
        conversations[i - 1]!.lastMessageAt! >= conversations[i]!.lastMessageAt!
      ).toBe(true);
    }
  });
});

describe("sendMessage", () => {
  test("appends a 'schule' message, bumps last_message_at and resets unread", () => {
    const target = listConversations(db).find(c => c.unread > 0)!;
    expect(target).toBeDefined();
    const before = listMessages(db, target.id).length;

    const message = sendMessage(db, target.id, "Alles klar, bis dann!");
    expect(message.sender).toBe("schule");
    expect(message.text).toBe("Alles klar, bis dann!");
    expect(message.conversationId).toBe(target.id);

    const after = getConversation(db, target.id);
    expect(listMessages(db, target.id)).toHaveLength(before + 1);
    expect(after.unread).toBe(0);
    expect(after.lastMessageAt).toBe(message.sentAt);
    expect(after.lastMessage).toBe("Alles klar, bis dann!");
  });

  test("trims the text", () => {
    const [first] = listConversations(db);
    const message = sendMessage(db, first!.id, "  Hallo!  ");
    expect(message.text).toBe("Hallo!");
  });

  test("empty or non-string text → ValidationError", () => {
    const [first] = listConversations(db);
    expect(() => sendMessage(db, first!.id, "   ")).toThrow(ValidationError);
    expect(() => sendMessage(db, first!.id, 42)).toThrow(ValidationError);
  });

  test("unknown conversation → ValidationError", () => {
    expect(() => sendMessage(db, 9999, "Hallo")).toThrow(ValidationError);
  });
});

describe("markRead", () => {
  test("sets unread to 0", () => {
    const target = listConversations(db).find(c => c.unread > 0)!;
    const updated = markRead(db, target.id);
    expect(updated.unread).toBe(0);
    expect(getConversation(db, target.id).unread).toBe(0);
  });

  test("unknown conversation → ValidationError", () => {
    expect(() => markRead(db, 9999)).toThrow(ValidationError);
  });
});

describe("listMessages", () => {
  test("returns messages in chronological order", () => {
    const [first] = listConversations(db);
    const messages = listMessages(db, first!.id);
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i - 1]!.sentAt <= messages[i]!.sentAt).toBe(true);
    }
  });

  test("unknown conversation → ValidationError", () => {
    expect(() => listMessages(db, 9999)).toThrow(ValidationError);
  });
});

describe("createConversation", () => {
  test("creates a new thread for an unknown student", () => {
    const before = listConversations(db).length;
    const conversation = createConversation(db, {
      student_id: 777,
      student_name: "Maja Neumann",
    });
    expect(conversation.studentId).toBe(777);
    expect(conversation.studentName).toBe("Maja Neumann");
    expect(conversation.unread).toBe(0);
    expect(conversation.lastMessage).toBe("");
    expect(listConversations(db)).toHaveLength(before + 1);
  });

  test("reuses the existing thread for the same student_id", () => {
    const created = createConversation(db, {
      student_id: 777,
      student_name: "Maja Neumann",
    });
    const reused = createConversation(db, {
      student_id: 777,
      student_name: "Maja Neumann",
    });
    expect(reused.id).toBe(created.id);
  });

  test("reuses the existing thread by name when no student_id is given", () => {
    const created = createConversation(db, { student_name: "Ohne Akte" });
    const reused = createConversation(db, { student_name: "Ohne Akte" });
    expect(reused.id).toBe(created.id);
    expect(created.studentId).toBeNull();
  });

  test("missing name → ValidationError", () => {
    expect(() => createConversation(db, { student_name: "  " })).toThrow(
      ValidationError
    );
    expect(() => createConversation(db, {})).toThrow(ValidationError);
  });

  test("invalid student_id → ValidationError", () => {
    expect(() =>
      createConversation(db, { student_id: -1, student_name: "X Y" })
    ).toThrow(ValidationError);
  });
});

describe("deleteConversation", () => {
  test("removes the conversation and cascades its messages", () => {
    const [first] = listConversations(db);
    expect(listMessages(db, first!.id).length).toBeGreaterThan(0);

    deleteConversation(db, first!.id);

    expect(() => getConversation(db, first!.id)).toThrow(ValidationError);
    const orphaned = db
      .query<{ n: number }, [number]>(
        "SELECT count(*) AS n FROM chat_messages WHERE conversation_id = ?"
      )
      .get(first!.id)!.n;
    expect(orphaned).toBe(0);
  });

  test("unknown conversation → ValidationError", () => {
    expect(() => deleteConversation(db, 9999)).toThrow(ValidationError);
  });
});
