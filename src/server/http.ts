import { ValidationError } from "./engine";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function handle<A extends unknown[]>(
  fn: (...args: A) => Response | Promise<Response>
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ValidationError) {
        return err(error.message);
      }
      console.error(error);
      return err("Interner Fehler.", 500);
    }
  };
}
