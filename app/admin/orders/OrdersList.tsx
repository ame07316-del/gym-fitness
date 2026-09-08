"use client";

import ListPage from "../ListPage";
import { StatusBadge, type Column } from "../ui";
import { ENDPOINTS } from "@/app/lib/api";
import { ADDONS, CYCLES, PAY_METHODS } from "@/app/lib/data";
import type { SubscribeRecord } from "@/app/lib/server/db";
import { egp, fmtShort } from "@/app/lib/utils";

const cycleLabel = (id: string) => CYCLES.find((c) => c.id === id)?.label ?? id;
const payLabel = (id: string) => PAY_METHODS.find((p) => p.id === id)?.label.split(" / ")[0] ?? id;
const addonName = (id: string) => ADDONS.find((a) => a.id === id)?.name ?? id;

const columns: Column<SubscribeRecord>[] = [
  {
    key: "order",
    title: "الطلب",
    render: (o) => (
      <div>
        <p className="num font-black text-white">{o.orderId}</p>
        <p className="num text-[10px] text-white/40">{fmtShort(o.createdAt)}</p>
      </div>
    ),
  },
  {
    key: "member",
    title: "العضو",
    render: (o) => (
      <div>
        <p className="font-bold text-white">{o.member.name}</p>
        <a href={`https://wa.me/2${o.member.phone.replace(/^(\+?2|002)/, "")}`} target="_blank" rel="noopener noreferrer" className="num text-[11px] text-white/50 transition hover:text-mint">
          {o.member.phone}
        </a>
      </div>
    ),
  },
  {
    key: "plan",
    title: "الباقة",
    render: (o) => (
      <div>
        <p className="font-bold">{o.planName}</p>
        <p className="text-[10px] text-white/45">
          {cycleLabel(o.cycle)} · <span className="num">{o.months}</span> شهر
        </p>
      </div>
    ),
  },
  {
    key: "addons",
    title: "إضافات / كوبون",
    hideOnMobile: true,
    render: (o) => (
      <div className="max-w-[220px] text-[11px] leading-relaxed text-white/60">
        {o.addonIds.length ? o.addonIds.map(addonName).join("، ") : <span className="text-white/25">—</span>}
        {o.coupon && <span className="num mr-1 rounded-md border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-[10px] font-black text-mint">{o.coupon}</span>}
      </div>
    ),
  },
  { key: "pay", title: "الدفع", hideOnMobile: true, render: (o) => <span className="text-white/70">{payLabel(o.payment)}</span> },
  {
    key: "total",
    title: "الإجمالي",
    className: "text-left",
    render: (o) => (
      <div className="text-left">
        <p className="num font-black text-white">{egp(o.total)}</p>
        <p className="num text-[10px] text-white/40">{egp(o.perMonth)} / شهر</p>
      </div>
    ),
  },
  {
    key: "status",
    title: "الحالة",
    render: (o) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge status={o.status} />
        <span className="num text-[10px] text-white/40">ينتهي {fmtShort(o.endsAt)}</span>
      </div>
    ),
  },
];

export default function OrdersList() {
  return (
    <ListPage<SubscribeRecord>
      title="الاشتراكات"
      sub="كل الطلبات اللي اتأكدت من صفحة الدفع"
      endpoint={ENDPOINTS.adminOrders}
      columns={columns}
      rowKey={(o) => o.orderId}
      statuses={[
        { id: "active", label: "نشط" },
        { id: "frozen", label: "مجمّد" },
        { id: "cancelled", label: "ملغي" },
        { id: "expired", label: "منتهي" },
      ]}
      searchHint="ابحث برقم الطلب، الاسم، الموبايل، الباقة أو الكوبون…"
      csvName="fitzone-orders.csv"
      summary={(rows, total) => {
        const sum = rows.reduce((s, o) => s + o.total, 0);
        return (
          <p className="text-[11px] text-white/45">
            في الصفحة دي: <span className="num font-black text-white/80">{rows.length}</span> من <span className="num">{total}</span> طلب · إجمالي الصفحة{" "}
            <span className="num font-black text-mint">{egp(sum)}</span>
          </p>
        );
      }}
    />
  );
}
