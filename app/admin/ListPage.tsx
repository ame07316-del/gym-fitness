"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import AdminShell from "./AdminShell";
import { DataTable, inputCls, Pager, Panel, Segmented, type Column } from "./ui";
import { qs, useAdminData, useDebounced } from "./use-admin";
import { apiUrl } from "@/app/lib/api";
import { cx } from "@/app/lib/utils";

type Paged<T> = { items: T[]; page: number; pages: number; per: number; total: number };

/**
 * صفحة قائمة عامة: بحث (مؤجّل 300ms) + فلتر حالة + ترقيم + تصدير CSV بنفس الفلاتر.
 * بتستخدمها صفحات الاشتراكات/الحجوزات/المدفوعات — الاختلاف في الأعمدة والـ endpoint بس.
 */
export default function ListPage<T>({
  title,
  sub,
  endpoint,
  columns,
  rowKey,
  statuses,
  searchHint,
  csvName,
  summary,
}: {
  title: string;
  sub?: string;
  endpoint: string;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  statuses: { id: string; label: string }[];
  searchHint: string;
  csvName: string;
  summary?: (rows: T[], total: number) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);

  const query = qs({ q: dq, status, page, per: 20 });
  const { data, error, loading, reload } = useAdminData<Paged<T>>(`${endpoint}${query}`);

  const rows = data?.items ?? [];
  const csvHref = apiUrl(`${endpoint}${qs({ q: dq, status, format: "csv" })}`);

  const changeStatus = (s: string) => {
    setStatus(s);
    setPage(1);
  };

  return (
    <AdminShell
      title={title}
      sub={sub}
      actions={
        <>
          <button onClick={reload} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:border-brand/50 hover:text-white">
            <RefreshCw className={cx("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
          <a
            href={csvHref}
            download={csvName}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-xl border border-mint/35 bg-mint/10 px-3 py-2 text-xs font-bold text-mint transition hover:bg-mint/20",
              (data?.total ?? 0) === 0 && "pointer-events-none opacity-40",
            )}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </a>
        </>
      }
    >
      {error && !data && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand-soft">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={searchHint}
            className={cx(inputCls, "pr-10", q && "pl-10")}
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="مسح البحث" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <Segmented value={status} onChange={changeStatus} options={[{ id: "", label: "الكل" }, ...statuses]} />
      </div>

      {summary && data && <div className="mb-4">{summary(rows, data.total)}</div>}

      <Panel
        title={
          <span>
            النتائج <span className="num text-white/45">({data?.total ?? 0})</span>
          </span>
        }
        bodyClassName="p-4 pt-2"
      >
        <DataTable columns={columns} rows={rows} rowKey={rowKey} loading={loading} empty={dq || status ? "مفيش نتائج مطابقة للبحث/الفلتر" : "مفيش بيانات لسه — جرّب تعمل عملية من الموقع وهتظهر هنا"} />
        {data && <Pager page={data.page} pages={data.pages} total={data.total} per={data.per} onPage={setPage} />}
      </Panel>
    </AdminShell>
  );
}
