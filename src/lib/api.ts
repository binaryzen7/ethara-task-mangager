import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function validationError(errors: unknown) {
  return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
}
