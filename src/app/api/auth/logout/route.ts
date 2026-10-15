import { cookies } from "next/headers";
import { handler, json } from "@/lib/api";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = handler(async () => {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return json({ ok: true });
});
