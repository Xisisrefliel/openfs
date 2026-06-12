import { describe, expect, test } from "bun:test";

import { parseOrThrow } from "./api";

describe("parseOrThrow", () => {
  test("200 + valid JSON → resolves with the data", async () => {
    const response = new Response(JSON.stringify({ name: "Max" }), {
      status: 200,
    });
    const result = await parseOrThrow<{ name: string }>(response);
    expect(result).toEqual({ name: "Max" });
  });

  test("400 + { error } → rejects with the error message", async () => {
    const response = new Response(JSON.stringify({ error: "Kaputt." }), {
      status: 400,
    });
    await expect(parseOrThrow(response)).rejects.toThrow("Kaputt.");
  });

  test("500 + non-JSON body → rejects with fallback message", async () => {
    const response = new Response("Internal Server Error", { status: 500 });
    await expect(parseOrThrow(response)).rejects.toThrow("Anfrage fehlgeschlagen.");
  });

  test("200 + empty/invalid JSON body → rejects with fallback message", async () => {
    const response = new Response("", { status: 200 });
    await expect(parseOrThrow(response)).rejects.toThrow("Anfrage fehlgeschlagen.");
  });
});
