export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { jsonError, jsonOk, validationError } from "@/lib/api";
import { signupSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = signupSchema.safeParse(await request.json());
  if (!body.success) {
    return validationError(body.error.flatten());
  }

  const { email, password, name } = body.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  await setSessionCookie(user.id);
  return jsonOk({ user }, 201);
}
