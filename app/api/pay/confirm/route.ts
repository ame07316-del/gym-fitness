import { NO_STORE_HEADERS } from "@/app/lib/api-security";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { readJsonObject } from "@/app/lib/request";
import { NextResponse } from "next/server";
import { getIntent, intents } from "../route";

export const dynamic = "force-dynamic";

/** تأكيد 3-D Secure للعملية المعلقة (نفس شكل confirm في Stripe/Paymob) */
export async function POST(request: Request) {
  const rate = checkRateLimit(request, "pay-confirm", 30);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "محاولات تحقق كثيرة — جرّب مرة أخرى بعد قليل" },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(rate.retryAfter) } },
    );
  }

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.body;

  const reference = typeof body.reference === "string" ? body.reference : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const intent = getIntent(reference);

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
