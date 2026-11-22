import { NextResponse } from "next/server";

export function apiError(error: unknown, message = "Unable to save changes. Please try again.") {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "P2002") return NextResponse.json({ error: "This record already exists." }, { status: 409 });
  if (code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
  console.error("Portal operation failed", error);
  return NextResponse.json({ error: message }, { status: 503 });
}
