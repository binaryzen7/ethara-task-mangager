export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json());
  if (!body.success) {
    return validationError(body.error.flatten());
  }

  const { email, password } = body.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonError("Invalid email or password", 401);
  }

  await setSessionCookie(user.id);
  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  });
}
