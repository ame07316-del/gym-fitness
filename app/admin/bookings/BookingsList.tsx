"use client";

import { Phone } from "lucide-react";
import ListPage from "../ListPage";
import { StatusBadge, type Column } from "../ui";
import { ENDPOINTS } from "@/app/lib/api";
import { PLANS } from "@/app/lib/data";
import type { BookingRecord } from "@/app/lib/server/db";
import { fmtShort } from "@/app/lib/utils";

const planLabel = (id: string) => PLANS.find((p) => p.id === id)?.name ?? (id === "unknown" ? "لسه بيشوف" : id);
const fmtTime = (ts: number) => new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));

const columns: Column<BookingRecord>[] = [
  {
    key: "id",
    title: "الكود",
    render: (b) => (
      <div>
        <p className="num font-black text-white">{b.id}</p>
        <p className="num text-[10px] text-white/40">
          {fmtShort(b.createdAt)} · {fmtTime(b.createdAt)}
        </p>
      </div>
    ),
  },
  {
    key: "who",
    title: "المتدرب",
    render: (b) => (
      <div>
        <p className="font-bold text-white">{b.name}</p>
        <a href={`tel:${b.phone}`} className="num inline-flex items-center gap-1 text-[11px] text-white/50 transition hover:text-mint">
          <Phone className="h-3 w-3" />
          {b.phone}
        </a>
      </div>
    ),
  },
  { key: "goal", title: "الهدف", render: (b) => <span className="text-white/80">{b.goal}</span> },
  { key: "slot", title: "الوقت المفضل", hideOnMobile: true, render: (b) => <span className="text-white/70">{b.slot}</span> },
  { key: "plan", title: "مهتم بـ", hideOnMobile: true, render: (b) => <span className="text-white/70">{planLabel(b.plan)}</span> },
  { key: "status", title: "الحالة", render: (b) => <StatusBadge status={b.status} /> },
  {
    key: "wa",
    title: "",
    className: "text-left",
    render: (b) => (
      <a
        href={`https://wa.me/2${b.phone.replace(/^(\+?2|002)/, "")}?text=${encodeURIComponent(`أهلاً ${b.name} 👋 معاك FitZone Pro بخصوص طلب الحجز ${b.id}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2 py-1 text-[10px] font-black text-[#25D366] transition hover:bg-[#25D366]/20"
      >
        واتساب
      </a>
    ),
  },
];

export default function BookingsList() {
  return (
    <ListPage<BookingRecord>
      title="الحجوزات"
      sub="طلبات الجلسة التجريبية والاستعلامات من فورم الحجز"
      endpoint={ENDPOINTS.adminBookings}
      columns={columns}
      rowKey={(b) => b.id}
      statuses={[
        { id: "confirmed", label: "مؤكد" },
        { id: "pending", label: "قيد المراجعة" },
      ]}
      searchHint="ابحث بالاسم، الموبايل، الهدف أو الكود…"
      csvName="fitzone-bookings.csv"
    />
  );
}
