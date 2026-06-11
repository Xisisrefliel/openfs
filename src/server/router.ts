/* ------------------------------------------------------------------ */
/* Minimal Bun.serve()-compatible router over web-standard Requests.   */
/*                                                                     */
/* Electron's protocol.handle() speaks the same Request/Response pair  */
/* as Bun.serve(), so the route factories run unchanged in the         */
/* desktop app — this module only replicates Bun's path matching       */
/* (static segments beat :params) and attaches req.params.             */
/* ------------------------------------------------------------------ */

/* `any` on purpose: the factories type their handlers against Bun's
   BunRequest (Request + params + cookies); a structural Request type
   here would reject them even though only .params is ever touched. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any) => Response | Promise<Response>;
type MethodMap = Partial<
  Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS", Handler>
>;
export type RouteEntry = Handler | MethodMap;

type CompiledRoute = {
  segments: string[];
  paramCount: number;
  entry: RouteEntry;
};

function compile(pattern: string, entry: RouteEntry): CompiledRoute {
  const segments = pattern.split("/").filter(Boolean);
  return {
    segments,
    paramCount: segments.filter(s => s.startsWith(":")).length,
    entry,
  };
}

function match(
  route: CompiledRoute,
  pathSegments: string[]
): Record<string, string> | null {
  if (route.segments.length !== pathSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < route.segments.length; i++) {
    const expected = route.segments[i]!;
    const actual = pathSegments[i]!;
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}

/** Returns a dispatcher resolving to null when no route matches
 *  (the caller then falls through to static file serving). */
export function createRouter(routes: Record<string, RouteEntry>) {
  // Fewer params = more specific; matches Bun's static-before-param order.
  const compiled = Object.entries(routes)
    .map(([pattern, entry]) => compile(pattern, entry))
    .sort((a, b) => a.paramCount - b.paramCount);

  return async function route(req: Request): Promise<Response | null> {
    const pathSegments = new URL(req.url).pathname.split("/").filter(Boolean);

    for (const candidate of compiled) {
      const params = match(candidate, pathSegments);
      if (!params) continue;

      const entry = candidate.entry;
      const handler =
        typeof entry === "function"
          ? entry
          : entry[req.method as keyof MethodMap] ??
            (req.method === "HEAD" ? entry.GET : undefined);
      if (!handler) {
        return Response.json({ error: "Method Not Allowed" }, { status: 405 });
      }

      Object.defineProperty(req, "params", { value: params, writable: true });
      return handler(req);
    }
    return null;
  };
}
