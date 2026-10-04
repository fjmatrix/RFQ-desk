import { buildReply } from "../../../../../lib/server/email-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: "Invalid JSON request." }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload) ||
    !("body" in payload) ||
    typeof payload.body !== "string" ||
    !payload.body.trim()
  ) {
    return Response.json(
      { message: "Email body must be a nonempty string." },
      { status: 400 },
    );
  }

  const { vendorId } = await params;
  const email = buildReply(vendorId, payload.body);
  if (!email) {
    return Response.json({ message: "Vendor not found." }, { status: 404 });
  }
  return Response.json({ email }, { status: 201 });
}
