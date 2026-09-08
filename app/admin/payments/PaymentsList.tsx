"use client";

import ListPage from "../ListPage";
import { StatusBadge, type Column } from "../ui";
import { ENDPOINTS } from "@/app/lib/api";
import { PAY_METHODS } from "@/app/lib/data";
import type { PaymentIntent } from "@/app/lib/server/db";
import { egp, fmtShort } from "@/app/lib/utils";

const BRAND: Record<string, string> = { visa: "VISA", mastercard: "Mastercard", amex: "Amex", mada: "mada", unknown: "CARD" };
const CODE: Record<string, string> = {
  succeeded: "تم الاعتماد",
  requires_action: "3-D Secure",
  card_declined: "رفض البنك",
  insufficient_funds: "رصيد غير كافٍ",
  expired_card: "كارت منتهي",
  incorrect_cvc: "CVV غلط",
  invalid_number: "فشل Luhn",
};
const payLabel = (id: string) => PAY_METHODS.find((p) => p.id === id)?.label ?? id;
const fmtTime = (ts: number) => new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));

const columns: Column<PaymentIntent>[] = [
  {
    key: "ref",
    title: "المرجع",
    render: (p) => (
      <div>
        <p className="num max-w-[180px] truncate font-black text-white" title={p.reference}>
          {p.reference}
        </p>
        <p className="num text-[10px] text-white/40">
          {fmtShort(p.createdAt)} · {fmtTime(p.createdAt)}
        </p>
      </div>
    ),
  },
  {
    key: "method",
    title: "الطريقة",
    render: (p) =>
      p.method === "card" ? (
        <div>
          <p className="font-bold text-white">{BRAND[p.brand] ?? p.brand}</p>
          <p className="num text-[11px] text-white/50">•••• {p.last4 || "----"}</p>
        </div>
      ) : (
        <span className="text-white/75">{payLabel(p.method)}</span>
      ),
  },
  { key: "amount", title: "المبلغ", className: "text-left", render: (p) => <span className="num font-black text-white">{egp(p.amount)}</span> },
  { key: "status", title: "الحالة", render: (p) => <StatusBadge status={p.status} /> },
  {
    key: "code",
    title: "كود البوابة",
    hideOnMobile: true,
    render: (p) => (
      <div>
        <p className="text-white/80">{CODE[p.code] ?? p.code}</p>
        <p className="num text-[10px] text-white/35">{p.code}</p>
      </div>
    ),
  },
  { key: "updated", title: "آخر تحديث", hideOnMobile: true, render: (p) => <span className="num text-white/55">{p.updatedAt !== p.createdAt ? fmtTime(p.updatedAt) : "—"}</span> },
];

export default function PaymentsList() {
  return (
    <ListPage<PaymentIntent>
      title="المدفوعات"
      sub="سجل عمليات البوابة — آخر 4 أرقام والنوع بس، مفيش بيانات كارت كاملة"
      endpoint={ENDPOINTS.adminPayments}
      columns={columns}
      rowKey={(p) => p.reference}
      statuses={[
        { id: "succeeded", label: "ناجحة" },
        { id: "requires_action", label: "بانتظار OTP" },
        { id: "failed", label: "مرفوضة" },
      ]}
      searchHint="ابحث بالمرجع، آخر 4 أرقام، الشبكة أو كود الرفض…"
      csvName="fitzone-payments.csv"
      summary={(rows) => {
        const ok = rows.filter((r) => r.status === "succeeded");
        const vol = ok.reduce((s, r) => s + r.amount, 0);
        return (
          <p className="text-[11px] text-white/45">
            في الصفحة دي: <span className="num font-black text-mint">{ok.length}</span> ناجحة بحجم <span className="num font-black text-white/80">{egp(vol)}</span> ·{" "}
            <span className="num font-black text-brand-soft">{rows.filter((r) => r.status === "failed").length}</span> مرفوضة ·{" "}
            <span className="num font-black text-gold">{rows.filter((r) => r.status === "requires_action").length}</span> معلّقة
          </p>
        );
      }}
    />
  );
}
