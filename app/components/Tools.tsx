"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Calculator, Droplet, Dumbbell, Flame, Info, Target, Utensils } from "lucide-react";
import { cx, clamp, number } from "@/app/lib/utils";
import { useGym } from "@/app/lib/store";
import { Chip, Reveal, SectionTitle } from "@/app/components/ui/Bits";

const TABS = [
  { id: "bmi", label: "كتلة الجسم", icon: Calculator },
  { id: "tdee", label: "السعرات والماكروز", icon: Flame },
  { id: "orm", label: "أقصى وزن (1RM)", icon: Dumbbell },
  { id: "water", label: "المياه اليومية", icon: Droplet },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Tools() {
  const [tab, setTab] = useState<TabId>("bmi");

  return (
    <section id="tools" className="relative py-20 sm:py-24">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-surface/45 to-transparent" />
      <div className="mx-auto max-w-6xl px-4">
        <SectionTitle
          kicker="أدوات مجانية"
          title={
            <>
              احسب <span className="text-brand-soft">رقمك الصح</span> قبل ما تبدأ
            </>
          }
          sub="كل الحاسبات بتشتغل لحظياً وأنت بتحرّك المؤشر — من غير زرار ولا رفرش."
        />

        <Reveal className="no-bar mb-6 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                "relative flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition",
                tab === t.id ? "border-brand bg-brand/12 text-white" : "border-line bg-surface/50 text-white/50 hover:text-white",
              )}
            >
              <t.icon className={cx("h-4 w-4", tab === t.id ? "text-brand-soft" : "text-white/40")} />
              {t.label}
            </button>
          ))}
        </Reveal>

        <div className="rounded-3xl border border-line bg-surface/45 p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div suppressHydrationWarning
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {tab === "bmi" && <Bmi />}
              {tab === "tdee" && <Tdee />}
              {tab === "orm" && <OneRepMax />}
              {tab === "water" && <Water />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ============================ shared ============================ */
function Slider({
  label, value, onChange, min, max, step = 1, unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <label className="text-xs font-bold text-white/55">{label}</label>
        <span className="num rounded-lg bg-white/5 px-2 py-0.5 text-sm font-black text-white">
          {number(value)}
          {unit && <span className="mr-1 text-[10px] font-bold text-white/45">{unit}</span>}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </div>
  );
}

/* ============================ BMI ============================ */
function Bmi() {
  const [w, setW] = useState(82);
  const [h, setH] = useState(178);
  const { requestBooking } = useGym();

  const bmi = w / Math.pow(h / 100, 2);
  const cats = [
    { max: 18.5, label: "نحافة", color: "#60a5fa", tip: "عايز تزيد كتلتك العضلية — باقة برو مناسبة." },
    { max: 25, label: "طبيعي", color: "#2fd48a", tip: "قاعدة كويسة! حافظ عليها بكلاسات أسبوعية." },
    { max: 30, label: "زيادة وزن", color: "#f5b629", tip: "أفضل بداية: كارديو 3 مرات + برنامج غذائي." },
    { max: 999, label: "سمنة", color: "#f43f4f", tip: "نبدأ بخطة منخفضة الشدة وحماية للمفاصل — الكوتش هيجهّزها." },
  ];
  const cat = cats.find((c) => bmi < c.max)!;
  const healthy = { min: 18.5 * Math.pow(h / 100, 2), max: 24.9 * Math.pow(h / 100, 2) };
  const pos = clamp(((bmi - 14) / (40 - 14)) * 100, 2, 98);

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Slider label="الوزن" value={w} onChange={setW} min={35} max={180} unit="كجم" />
        <Slider label="الطول" value={h} onChange={setH} min={140} max={210} unit="سم" />

        <div className="rounded-2xl border border-line bg-ink/60 p-4">
          <p className="mb-3 text-xs font-bold text-white/50">مؤشر BMI على المقياس العالمي</p>
          <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-l from-blue-400 via-mint via-30% to-brand">
            <motion.span suppressHydrationWarning
              className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-lg"
              animate={{ insetInlineStart: `calc(${pos}% - 12px)` }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
            />
          </div>
          <div className="num mt-2 flex justify-between text-[10px] text-white/35">
            <span>14</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>40</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-ink/40 p-5">
        <div>
          <p className="text-xs font-bold text-white/45">النتيجة</p>
          <div className="mt-1 flex items-end gap-3">
            <motion.span suppressHydrationWarning key={bmi.toFixed(1)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="num text-6xl font-black leading-none" style={{ color: cat.color }}>
              {bmi.toFixed(1)}
            </motion.span>
            <span className="mb-1 rounded-lg px-2.5 py-1 text-xs font-black" style={{ background: `${cat.color}22`, color: cat.color }}>
              {cat.label}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{cat.tip}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Mini label="الوزن الصحي لطولك" value={`${number(healthy.min)} – ${number(healthy.max)} كجم`} />
            <Mini label="الفرق عن الوزن الصحي" value={w > healthy.max ? `− ${number(w - healthy.max)} كجم` : w < healthy.min ? `+ ${number(healthy.min - w)} كجم` : "ممتاز"} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <span className="flex items-center gap-1.5 text-[11px] text-white/40">
            <Info className="h-3.5 w-3.5" /> تقديري ولا يغني عن قياس InBody
          </span>
          <button
            onClick={() => requestBooking({ goal: bmi >= 25 ? "تخسيس وحرق دهون" : "بناء عضلات وتضخيم" })}
            className="rounded-xl bg-brand px-4 py-2 text-xs font-black transition hover:bg-brand-soft"
          >
            ابني خطة على الرقم ده
          </button>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[.03] p-3">
      <p className="text-[10px] text-white/40">{label}</p>
      <p className="num mt-1 text-sm font-black text-white/85">{value}</p>
    </div>
  );
}

/* ============================ TDEE + Macros ============================ */
const ACTS = [
  { v: 1.2, label: "خامل" },
  { v: 1.375, label: "خفيف 1-3" },
  { v: 1.55, label: "متوسط 3-5" },
  { v: 1.725, label: "عالي 6-7" },
  { v: 1.9, label: "محترف" },
];
const GOAL_OPTS = [
  { id: "cut", label: "خسّة", mult: 0.8, protein: 2.2 },
  { id: "keep", label: "ثبات", mult: 1, protein: 1.8 },
  { id: "bulk", label: "ضخّم", mult: 1.12, protein: 2 },
];

function Tdee() {
  const [age, setAge] = useState(28);
  const [w, setW] = useState(82);
  const [h, setH] = useState(178);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [act, setAct] = useState(1.55);
  const [goal, setGoal] = useState("cut");

  const g = GOAL_OPTS.find((x) => x.id === goal)!;
  const bmr = 10 * w + 6.25 * h - 5 * age + (sex === "male" ? 5 : -161);
  const tdee = bmr * act;
  const target = tdee * g.mult;
  const protein = w * g.protein;
  const fat = w * 0.9;
  const carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4);

  const parts = useMemo(() => {
    const p = { protein: protein * 4, fat: fat * 9, carbs: carbs * 4 };
    const sum = p.protein + p.fat + p.carbs || 1;
    return [
      { key: "بروتين", kcal: p.protein, pct: p.protein / sum, color: "#f43f4f", grams: protein },
      { key: "دهون", kcal: p.fat, pct: p.fat / sum, color: "#f5b629", grams: fat },
      { key: "كربوهيدرات", kcal: p.carbs, pct: p.carbs / sum, color: "#2fd48a", grams: carbs },
    ];
  }, [protein, fat, carbs]);

  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="grid gap-7 lg:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSex(s)}
              className={cx(
                "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                sex === s ? "border-brand bg-brand/12 text-white" : "border-line bg-white/[.03] text-white/45 hover:text-white",
              )}
            >
              {s === "male" ? "ذكر" : "أنثى"}
            </button>
          ))}
        </div>
        <Slider label="العمر" value={age} onChange={setAge} min={14} max={80} unit="سنة" />
        <Slider label="الوزن" value={w} onChange={setW} min={35} max={180} unit="كجم" />
        <Slider label="الطول" value={h} onChange={setH} min={140} max={210} unit="سم" />
        <div>
          <p className="mb-2 text-xs font-bold text-white/55">مستوى النشاط</p>
          <div className="flex flex-wrap gap-1.5">
            {ACTS.map((a) => (
              <button
                key={a.v}
                onClick={() => setAct(a.v)}
                className={cx(
                  "rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
                  act === a.v ? "border-brand bg-brand text-white" : "border-line bg-white/[.03] text-white/45 hover:text-white",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold text-white/55">الهدف</p>
          <div className="flex gap-1.5">
            {GOAL_OPTS.map((o) => (
              <button
                key={o.id}
                onClick={() => setGoal(o.id)}
                className={cx(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition",
                  goal === o.id ? "border-mint bg-mint/15 text-mint" : "border-line bg-white/[.03] text-white/45 hover:text-white",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-5 rounded-2xl border border-line bg-ink/40 p-5">
          <div className="relative shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="#26262f" strokeWidth="13" />
              {parts.map((p) => {
                const dash = p.pct * C;
                const el = (
                  <circle
                    key={p.key}
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="13"
                    strokeLinecap="butt"
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += dash;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="num text-xl font-black leading-none">{number(target)}</p>
                <p className="text-[9px] text-white/40">سعرة/يوم</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {parts.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 font-bold text-white/70">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /> {p.key}
                </span>
                <span className="num text-white/55">
                  {number(p.grams)} جم · {Math.round(p.pct * 100)}٪
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Mini label="أيض أساسي BMR" value={`${number(bmr)}`} />
          <Mini label="حرق اليوم TDEE" value={`${number(tdee)}`} />
          <Mini label={goal === "keep" ? "ثبات" : goal === "cut" ? "عجز يومي" : "فائض يومي"} value={`${number(Math.abs(target - tdee))}`} />
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-line p-3 text-[11px] leading-relaxed text-white/45">
          <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
         وزّع البروتين على 3-4 وجبات (كل وجبة 30-45 جم)، واشرب 3 لتر مياه على الأقل — الرقم ده بيتحدث من حاسبة المياه.
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="brand">
            <Target className="h-3 w-3" /> {goal === "cut" ? "خسارة ~0.5 كجم/أسبوع" : goal === "bulk" ? "زيادة ~0.3 كجم/أسبوع" : "قوام ثابت"}
          </Chip>
          <Chip tone="neutral">
            <Activity className="h-3 w-3" /> معادلة Mifflin-St Jeor
          </Chip>
        </div>
      </div>
    </div>
  );
}

/* ============================ 1RM ============================ */
function OneRepMax() {
  const [w, setW] = useState(100);
  const [reps, setReps] = useState(5);
  const orm = w * (1 + reps / 30);

  const table = [
    { pct: 100, rep: "1 تكرار" },
    { pct: 95, rep: "2" },
    { pct: 90, rep: "4" },
    { pct: 85, rep: "6" },
    { pct: 80, rep: "8" },
    { pct: 75, rep: "10" },
    { pct: 70, rep: "12" },
    { pct: 65, rep: "15" },
    { pct: 60, rep: "18+" },
  ];

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Slider label="الوزن المرفوع" value={w} onChange={setW} min={20} max={300} step={2.5} unit="كجم" />
        <Slider label="عدد التكرارات" value={reps} onChange={setReps} min={1} max={15} unit="×" />
        <div className="rounded-2xl border border-brand/30 bg-brand/[.07] p-5 text-center">
          <p className="text-xs font-bold text-white/50">أقصى وزن لتكرار واحد (Epley)</p>
          <motion.p suppressHydrationWarning key={Math.round(orm)} initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="num mt-1 text-5xl font-black text-brand-soft">
            {orm.toFixed(1)}
          </motion.p>
          <p className="mt-1 text-[11px] text-white/40">كجم · تمرين سكوات / بنش / ديدليفت</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-right text-sm">
          <thead className="bg-white/[.04] text-[11px] text-white/45">
            <tr>
              <th className="px-4 py-2.5 font-bold">النسبة</th>
              <th className="px-4 py-2.5 font-bold">الوزن</th>
              <th className="px-4 py-2.5 font-bold">التكرارات المستهدفة</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <motion.tr
                key={r.pct}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035 }}
                className={cx("border-t border-line transition hover:bg-white/[.03]", r.pct === 85 && "bg-brand/10")}
              >
                <td className="num px-4 py-2.5 font-black">{r.pct}٪</td>
                <td className="num px-4 py-2.5 text-white/85">{(orm * r.pct) / 100} كجم</td>
                <td className="px-4 py-2.5 text-white/55">{r.rep}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line bg-white/[.02] px-4 py-2.5 text-[11px] text-white/40">
          تمارين القوة: 80-85٪ لـ 6-8 تكرارات · التخسيس: 60-70٪ لـ 12-15 تكرار.
        </p>
      </div>
    </div>
  );
}

/* ============================ Water ============================ */
function Water() {
  const [w, setW] = useState(82);
  const [mins, setMins] = useState(45);
  const [coffee, setCoffee] = useState(2);

  const base = w * 0.033;
  const fromWorkout = (mins / 30) * 0.35;
  const fromCoffee = coffee * 0.12;
  const total = base + fromWorkout + fromCoffee;
  const cups = total / 0.25;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Slider label="الوزن" value={w} onChange={setW} min={35} max={180} unit="كجم" />
        <Slider label="تمرين اليوم" value={mins} onChange={setMins} min={0} max={150} step={5} unit="دقيقة" />
        <Slider label="قهوة / شاي ثقيل" value={coffee} onChange={setCoffee} min={0} max={6} unit="كوب" />
      </div>
      <div className="rounded-2xl border border-line bg-ink/40 p-5">
        <p className="text-xs font-bold text-white/50">احتياجك اليومي من المية</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="num text-6xl font-black leading-none text-brand-soft">{total.toFixed(1)}</span>
          <span className="mb-2 text-sm text-white/50">لتر</span>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-[11px] text-white/45">
            <span>اكملت قد إيه النهارده؟</span>
            <span className="num">
              {cups.toFixed(0)} كوب
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.min(16, Math.ceil(cups)) }).map((_, i) => (
              <Cup key={i} on={i < Math.round((total / 3) * 4)} />
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Mini label="أساسي" value={`${base.toFixed(1)} ل`} />
          <Mini label="للتمرين" value={`${fromWorkout.toFixed(1)} ل`} />
          <Mini label="للأدرينالين" value={`${fromCoffee.toFixed(1)} ل`} />
        </div>
        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          كوب قبل التمرين بساعة، ورشفات صغيرة كل 10 دقايق جوه الجيم — لو لون البول غامق يبقى محتاج تزيد.
        </p>
      </div>
    </div>
  );
}

function Cup({ on }: { on: boolean }) {
  return (
    <motion.span suppressHydrationWarning
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx("grid h-9 w-7 place-items-end overflow-hidden rounded-b-lg rounded-t-sm border transition", on ? "border-brand/50" : "border-line")}
    >
      <motion.span suppressHydrationWarning
        className={cx("w-full", on ? "bg-brand/60" : "bg-transparent")}
        animate={{ height: on ? ["0%", "72%"] : "0%" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.span>
  );
}
