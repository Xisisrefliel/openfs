/* ------------------------------------------------------------------ */
/* Students (Fahrschüler) — DB access + validation.                    */
/* The HTTP wrappers live in routes.ts (studentRoutes).                */
/* ------------------------------------------------------------------ */

import type { Database } from "bun:sqlite";

import type { Student } from "../lib/student-data";
import { ValidationError } from "./engine";

export type StudentRecord = Student & { id: number };

type StudentRow = {
  id: number;
  first_name: string;
  last_name: string;
  birthday: string;
  phone: string;
  email: string;
  address: string;
  classes: string;
  driving_school: string;
  registration_date: string;
  contract_number: string;
  customer_number: string;
  status: Student["status"];
  instructor: string;
  vehicle: string;
  balance: string;
  last_lesson: string;
  next_lesson: string;
  progress: number;
  lessons: string;
  documents: string;
  theory: string;
  price_plan_id: number | null;
};

const toStudent = (row: StudentRow): StudentRecord => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  birthday: row.birthday,
  phone: row.phone,
  email: row.email,
  address: row.address,
  classes: row.classes,
  drivingSchool: row.driving_school,
  registrationDate: row.registration_date,
  contractNumber: row.contract_number,
  customerNumber: row.customer_number,
  status: row.status,
  instructor: row.instructor,
  vehicle: row.vehicle,
  balance: row.balance,
  lastLesson: row.last_lesson,
  nextLesson: row.next_lesson,
  progress: row.progress,
  lessons: JSON.parse(row.lessons),
  documents: JSON.parse(row.documents),
  theory: JSON.parse(row.theory),
  pricePlanId: row.price_plan_id,
});

const SELECT = `SELECT id, first_name, last_name, birthday, phone, email, address,
  classes, driving_school, registration_date, contract_number, customer_number,
  status, instructor, vehicle, balance, last_lesson, next_lesson, progress,
  lessons, documents, theory, price_plan_id FROM students`;

export function listStudents(db: Database): StudentRecord[] {
  return db
    .query<StudentRow, []>(`${SELECT} ORDER BY last_name, first_name`)
    .all()
    .map(toStudent);
}

export function getStudent(db: Database, id: number): StudentRecord {
  const row = db.query<StudentRow, [number]>(`${SELECT} WHERE id = ?`).get(id);
  if (!row) throw new ValidationError("Fahrschüler/in nicht gefunden.");
  return toStudent(row);
}

const STRING_KEYS = [
  "firstName",
  "lastName",
  "birthday",
  "phone",
  "email",
  "address",
  "classes",
  "drivingSchool",
  "registrationDate",
  "contractNumber",
  "customerNumber",
  "instructor",
  "vehicle",
  "balance",
  "lastLesson",
  "nextLesson",
] as const;

type StringKey = (typeof STRING_KEYS)[number];

/* Merge a partial payload over current values, trimming strings and
   rejecting anything that would leave the record unusable. */
function normalize(input: Partial<Student>, current: Student): Student {
  const next: Student = { ...current };

  for (const key of STRING_KEYS) {
    const value = input[key as StringKey];
    if (value === undefined) continue;
    if (typeof value !== "string") {
      throw new ValidationError(`Feld '${key}' muss ein Text sein.`);
    }
    next[key as StringKey] = value.trim();
  }

  if (input.status !== undefined) {
    if (input.status !== "aktiv" && input.status !== "inaktiv") {
      throw new ValidationError("Status muss 'aktiv' oder 'inaktiv' sein.");
    }
    next.status = input.status;
  }

  if (input.progress !== undefined) {
    const progress = Number(input.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      throw new ValidationError("Fortschritt muss zwischen 0 und 100 liegen.");
    }
    next.progress = Math.round(progress);
  }

  if (input.lessons !== undefined) {
    if (!Array.isArray(input.lessons)) {
      throw new ValidationError("Feld 'lessons' muss eine Liste sein.");
    }
    next.lessons = input.lessons;
  }

  if (input.documents !== undefined) {
    if (!Array.isArray(input.documents)) {
      throw new ValidationError("Feld 'documents' muss eine Liste sein.");
    }
    next.documents = input.documents;
  }

  if (input.theory !== undefined) {
    if (typeof input.theory !== "object" || input.theory === null) {
      throw new ValidationError("Feld 'theory' muss ein Objekt sein.");
    }
    next.theory = input.theory;
  }

  if (input.pricePlanId !== undefined) {
    if (
      input.pricePlanId !== null &&
      (!Number.isInteger(input.pricePlanId) || input.pricePlanId <= 0)
    ) {
      throw new ValidationError(
        "Feld 'pricePlanId' muss eine Preisplan-ID oder null sein."
      );
    }
    next.pricePlanId = input.pricePlanId;
  }

  if (!next.firstName || !next.lastName) {
    throw new ValidationError("Vor- und Nachname sind Pflichtfelder.");
  }
  if (!next.contractNumber || !next.customerNumber) {
    throw new ValidationError("Kunden- und Vertragsnummer sind Pflichtfelder.");
  }

  return next;
}

const EMPTY: Student = {
  firstName: "",
  lastName: "",
  birthday: "",
  phone: "",
  email: "",
  address: "",
  classes: "",
  drivingSchool: "",
  registrationDate: "",
  contractNumber: "",
  customerNumber: "",
  status: "aktiv",
  instructor: "Nicht zugeteilt",
  vehicle: "Nicht zugeteilt",
  balance: "0,00 EUR",
  lastLesson: "Nicht geplant",
  nextLesson: "Nicht geplant",
  progress: 0,
  lessons: [],
  documents: [],
  theory: {
    lastLogin: "Noch nie",
    preExams: "Keine",
    exam: "Nicht geplant",
    status: "Aktiv",
    progress: 0,
  },
};

/* SQLite UNIQUE violations on the number columns become user-readable
   validation errors instead of opaque 500s. */
function guardUnique<T>(write: () => T): T {
  try {
    return write();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new ValidationError(
        "Kunden- oder Vertragsnummer ist bereits vergeben."
      );
    }
    throw error;
  }
}

function writeParams(data: Student) {
  return [
    data.firstName,
    data.lastName,
    data.birthday,
    data.phone,
    data.email,
    data.address,
    data.classes,
    data.drivingSchool,
    data.registrationDate,
    data.contractNumber,
    data.customerNumber,
    data.status,
    data.instructor,
    data.vehicle,
    data.balance,
    data.lastLesson,
    data.nextLesson,
    data.progress,
    JSON.stringify(data.lessons),
    JSON.stringify(data.documents),
    JSON.stringify(data.theory),
    data.pricePlanId ?? null,
  ] as const;
}

export function createStudent(
  db: Database,
  input: Partial<Student>
): StudentRecord {
  const data = normalize(input, EMPTY);
  const row = guardUnique(() =>
    db
      .query<{ id: number }, ReturnType<typeof writeParams>>(
        `INSERT INTO students (
           first_name, last_name, birthday, phone, email, address, classes,
           driving_school, registration_date, contract_number, customer_number,
           status, instructor, vehicle, balance, last_lesson, next_lesson,
           progress, lessons, documents, theory, price_plan_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`
      )
      .get(...writeParams(data))
  )!;
  return getStudent(db, row.id);
}

export function updateStudent(
  db: Database,
  id: number,
  input: Partial<Student>
): StudentRecord {
  const current = getStudent(db, id);
  const data = normalize(input, current);
  guardUnique(() =>
    db
      .prepare(
        `UPDATE students SET
           first_name = ?, last_name = ?, birthday = ?, phone = ?, email = ?,
           address = ?, classes = ?, driving_school = ?, registration_date = ?,
           contract_number = ?, customer_number = ?, status = ?, instructor = ?,
           vehicle = ?, balance = ?, last_lesson = ?, next_lesson = ?,
           progress = ?, lessons = ?, documents = ?, theory = ?,
           price_plan_id = ?
         WHERE id = ?`
      )
      .run(...writeParams(data), id)
  );
  return getStudent(db, id);
}
