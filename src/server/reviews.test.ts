/* ------------------------------------------------------------------ */
/* Unit tests for the reviews DB module: ensure/seed, CRUD and          */
/* validation. In-memory DB per test.                                   */
/* ------------------------------------------------------------------ */

import { beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import {
  createReview,
  deleteReview,
  ensureReviewTables,
  getReview,
  listReviews,
  updateReview,
} from "./reviews";
import { ValidationError } from "./engine";

let db: Database;

beforeEach(() => {
  db = new Database(":memory:");
  ensureReviewTables(db);
});

const VALID = {
  author: "Max Mustermann",
  rating: 5,
  source: "Google" as const,
  text: "Sehr gute Fahrschule!",
  date: "2026-06-01",
};

describe("ensureReviewTables", () => {
  test("a fresh DB seeds 10 reviews", () => {
    expect(listReviews(db)).toHaveLength(10);
  });

  test("calling it again does not re-seed", () => {
    ensureReviewTables(db);
    expect(listReviews(db)).toHaveLength(10);
  });

  test("does not seed when the table already has rows", () => {
    const fresh = new Database(":memory:");
    ensureReviewTables(fresh);
    fresh.exec("DELETE FROM reviews");
    createReview(fresh, VALID);
    ensureReviewTables(fresh);
    expect(listReviews(fresh)).toHaveLength(1);
  });

  test("seeded reviews carry valid ratings, sources and statuses", () => {
    for (const review of listReviews(db)) {
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
      expect(["Google", "Facebook", "Webseite", "Intern"]).toContain(
        review.source
      );
      expect(["neu", "beantwortet", "ausgeblendet"]).toContain(review.status);
    }
  });
});

describe("listReviews", () => {
  test("orders newest first (date DESC)", () => {
    const reviews = listReviews(db);
    for (let i = 1; i < reviews.length; i++) {
      expect(reviews[i - 1]!.date >= reviews[i]!.date).toBe(true);
    }
  });
});

describe("createReview", () => {
  test("happy path returns the stored review with defaults", () => {
    const review = createReview(db, VALID);
    expect(review.id).toBeGreaterThan(0);
    expect(review.author).toBe("Max Mustermann");
    expect(review.rating).toBe(5);
    expect(review.source).toBe("Google");
    expect(review.reply).toBe(""); // default
    expect(review.status).toBe("neu"); // default
  });

  test("trims string fields", () => {
    const review = createReview(db, { ...VALID, author: "  Anna Beispiel  " });
    expect(review.author).toBe("Anna Beispiel");
  });

  test("defaults the date to today when omitted", () => {
    const review = createReview(db, { ...VALID, date: undefined });
    expect(review.date).toBe(new Date().toISOString().slice(0, 10));
  });

  test("empty author → ValidationError 'Name ist ein Pflichtfeld.'", () => {
    expect(() => createReview(db, { ...VALID, author: "   " })).toThrow(
      "Name ist ein Pflichtfeld."
    );
  });

  test("missing rating → ValidationError", () => {
    expect(() => createReview(db, { ...VALID, rating: undefined })).toThrow(
      ValidationError
    );
  });

  test.each([0, 6, 4.5])("rating %p → ValidationError", rating => {
    expect(() => createReview(db, { ...VALID, rating })).toThrow(
      "Bewertung muss eine ganze Zahl zwischen 1 und 5 sein."
    );
  });

  test("non-numeric rating → ValidationError", () => {
    expect(() =>
      createReview(db, { ...VALID, rating: "5" as never })
    ).toThrow(ValidationError);
  });

  test("invalid source → ValidationError", () => {
    expect(() =>
      createReview(db, { ...VALID, source: "Yelp" as never })
    ).toThrow("Quelle muss 'Google', 'Facebook', 'Webseite' oder 'Intern' sein.");
  });

  test("invalid status → ValidationError", () => {
    expect(() =>
      createReview(db, { ...VALID, status: "offen" as never })
    ).toThrow("Status muss 'neu', 'beantwortet' oder 'ausgeblendet' sein.");
  });

  test("malformed date → ValidationError", () => {
    expect(() => createReview(db, { ...VALID, date: "01.06.2026" })).toThrow(
      "Datum muss im Format JJJJ-MM-TT vorliegen."
    );
  });

  test("non-string text → ValidationError", () => {
    expect(() => createReview(db, { ...VALID, text: 42 as never })).toThrow(
      "Feld 'text' muss ein Text sein."
    );
  });
});

describe("getReview", () => {
  test("missing id → ValidationError 'Bewertung nicht gefunden.'", () => {
    expect(() => getReview(db, 999999)).toThrow("Bewertung nicht gefunden.");
  });
});

describe("updateReview", () => {
  test("reply + status change merges over current values", () => {
    const created = createReview(db, VALID);
    const updated = updateReview(db, created.id, {
      reply: "Vielen Dank für das Feedback!",
      status: "beantwortet",
    });
    expect(updated.reply).toBe("Vielen Dank für das Feedback!");
    expect(updated.status).toBe("beantwortet");
    expect(updated.author).toBe("Max Mustermann"); // unchanged field preserved
    expect(updated.rating).toBe(5);
  });

  test("can hide and unhide via status", () => {
    const created = createReview(db, VALID);
    expect(updateReview(db, created.id, { status: "ausgeblendet" }).status).toBe(
      "ausgeblendet"
    );
    expect(updateReview(db, created.id, { status: "neu" }).status).toBe("neu");
  });

  test("invalid update is rejected and leaves the row unchanged", () => {
    const created = createReview(db, VALID);
    expect(() => updateReview(db, created.id, { rating: 99 })).toThrow(
      ValidationError
    );
    expect(getReview(db, created.id).rating).toBe(5);
  });

  test("update on missing id → ValidationError", () => {
    expect(() => updateReview(db, 999999, { status: "neu" })).toThrow(
      "Bewertung nicht gefunden."
    );
  });
});

describe("deleteReview", () => {
  test("removes the review (hard delete)", () => {
    const created = createReview(db, VALID);
    const before = listReviews(db).length;
    deleteReview(db, created.id);
    expect(listReviews(db).length).toBe(before - 1);
    expect(() => getReview(db, created.id)).toThrow(
      "Bewertung nicht gefunden."
    );
  });

  test("delete on missing id → ValidationError", () => {
    expect(() => deleteReview(db, 999999)).toThrow("Bewertung nicht gefunden.");
  });
});
