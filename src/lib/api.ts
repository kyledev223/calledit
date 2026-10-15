import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(e: unknown) {
  if (e instanceof AuthError || e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input" }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

/** Wrap a route handler so thrown errors become JSON responses. */
export function handler<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("Body must be JSON.", 400);
  }
}
