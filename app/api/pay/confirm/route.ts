import { NextResponse } from "next/server";
import { intents } from "../route";

export const dynamic = "force-dynamic";

/** تأكيد 3-D Secure للعملية المعلقة (نفس شكل confirm في Stripe/Paymob) */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const reference = typeof body.reference === "string" ? body.reference : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const intent = intents.get(reference);

  if (!intent) {
    return NextResponse.json(
      { ok: false, status: "failed", reference, message: "العملية مش موجودة أو انتهت صلاحيتها — ابدأ الدفع من جديد" },
      { status: 404 },
    );
  }
  if (intent.status === "succeeded") {
    return NextResponse.json({ ok: true, status: "succeeded", reference, amount: intent.amount, message: "العملية متأكد عليها بالفعل" });
  }
  if (!/^\d{6}$/.test(code) || code === "000000") {
    return NextResponse.json(
      { ok: false, status: "requires_action", reference, message: "رمز التحقق غير صحيح — هيوصلك رمز تاني على رسالتك البنكية" },
      { status: 401 },
    );
  }

  intents.set(reference, { ...intent, status: "succeeded" });
  return NextResponse.json({
    ok: true,
    status: "succeeded",
    code: "succeeded",
    reference,
    amount: intent.amount,
    provider: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "sandbox",
    message: "تم التحقق من البنك واعتمدت العملية ✅",
  });
}
