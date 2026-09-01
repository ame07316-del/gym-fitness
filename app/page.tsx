"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Dumbbell, Flame, Users, Trophy, Calendar, Clock, MapPin, Phone,
  Mail, ChevronDown, Check, X,
  Star, Award, Zap, Play, Menu as MenuIcon,
  Calculator, Share2
} from "lucide-react";
// ============ DATA ============
const STATS = [
  { icon: Users, value: 10000, label: "عضو نشط", suffix: "+" },
  { icon: Trophy, value: 200, label: "بطولة", suffix: "+" },
  { icon: Award, value: 25, label: "مدرب محترف", suffix: "" },
  { icon: Calendar, value: 30, label: "سنة خبرة", suffix: "" },
];

const TRAINERS = [
  {
    name: "كابتن أحمد السيد",
    specialty: "كمال أجسام وقوة",
    experience: "10 سنوات",
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80",
    rating: 4.9,
    clients: 240,
  },
  {
    name: "كابتن محمد فاروق",
    specialty: "لياقة بدنية وكارديو",
    experience: "8 سنوات",
    image: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80",
    rating: 4.8,
    clients: 180,
  },
  {
    name: "كابتن سارة حسن",
    specialty: "يوجا وتخسيس",
    experience: "6 سنوات",
    image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80",
    rating: 5.0,
    clients: 320,
  },
  {
    name: "كابتن كريم عادل",
    specialty: "كروس فيت وMMA",
    experience: "12 سنة",
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80",
    rating: 4.9,
    clients: 200,
  },
];

const CLASSES = [
  { day: "السبت", classes: [{ time: "07:00 ص", name: "يوجا صباحية", trainer: "سارة" }, { time: "06:00 م", name: "كروس فيت", trainer: "كريم" }] },
  { day: "الأحد", classes: [{ time: "08:00 ص", name: "كارديو حارق", trainer: "محمد" }, { time: "07:00 م", name: "كمال أجسام", trainer: "أحمد" }] },
  { day: "الاثنين", classes: [{ time: "07:00 ص", name: "بيلاتس", trainer: "سارة" }, { time: "06:00 م", name: "MMA", trainer: "كريم" }] },
  { day: "الثلاثاء", classes: [{ time: "08:00 ص", name: "زومبا", trainer: "سارة" }, { time: "07:00 م", name: "قوة وتحمل", trainer: "أحمد" }] },
  { day: "الأربعاء", classes: [{ time: "07:00 ص", name: "يوجا", trainer: "سارة" }, { time: "06:00 م", name: "كارديو", trainer: "محمد" }] },
  { day: "الخميس", classes: [{ time: "08:00 ص", name: "كروس فيت", trainer: "كريم" }, { time: "07:00 م", name: "كمال أجسام", trainer: "أحمد" }] },
  { day: "الجمعة", classes: [{ time: "10:00 ص", name: "دورة مكثفة", trainer: "الفريق كامل" }] },
];

const PLANS = [
  {
    name: "أساسي",
    monthlyPrice: 500,
    yearlyPrice: 5000,
    features: [
      "دخول غير محدود للجيم",
      "استخدام جميع الأجهزة",
      "خزانة شخصية",
      "دش وحمام سونا",
    ],
    notIncluded: ["كوتش خاص", "برنامج غذائي", "كلاسات جماعية"],
    color: "gray",
    popular: false,
  },
  {
    name: "برو",
    monthlyPrice: 900,
    yearlyPrice: 9000,
    features: [
      "كل مميزات الباقة الأساسية",
      "كوتش خاص (4 جلسات/شهر)",
      "برنامج تدريبي مخصص",
      "كلاسات جماعية غير محدودة",
      "تحليل جسم شهري (InBody)",
    ],
    notIncluded: ["برنامج غذائي متقدم"],
    color: "red",
    popular: true,
  },
  {
    name: "VIP إليت",
    monthlyPrice: 1500,
    yearlyPrice: 15000,
    features: [
      "كل مميزات باقة برو",
      "كوتش خاص (12 جلسة/شهر)",
      "برنامج غذائي احترافي",
      "استشارة طبيب رياضي",
      "مساج استرخاء أسبوعي",
      "أولوية حجز الكلاسات",
    ],
    notIncluded: [],
    color: "yellow",
    popular: false,
  },
];

const GALLERY = [
  { url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80", category: "weights" },
  { url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80", category: "cardio" },
  { url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80", category: "classes" },
  { url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80", category: "weights" },
  { url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80", category: "cardio" },
  { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80", category: "classes" },
];

const TESTIMONIALS = [
  { name: "أحمد إبراهيم", text: "خسيت 25 كيلو في 4 شهور! أفضل جيم دخلته في حياتي، الكوتشات محترفين جداً.", rating: 5, image: "https://i.pravatar.cc/100?img=12" },
  { name: "منى خالد", text: "المكان نظيف والأجهزة حديثة، والكابتن سارة غيرت حياتي حرفياً.", rating: 5, image: "https://i.pravatar.cc/100?img=45" },
  { name: "محمود علي", text: "بنيت عضلات محترمة في 6 شهور بفضل البرنامج التدريبي والغذائي.", rating: 5, image: "https://i.pravatar.cc/100?img=33" },
];

const FAQS = [
  { q: "ما هي مواعيد عمل الجيم؟", a: "الجيم مفتوح من 6 صباحاً حتى 12 منتصف الليل يومياً، وأيام الجمعة من 10 صباحاً." },
  { q: "هل يوجد كوتش نساء؟", a: "نعم، لدينا فريق من الكوتشات النساء المحترفات في جميع التخصصات." },
  { q: "هل يمكنني تجميد الاشتراك؟", a: "نعم، يمكن تجميد الاشتراك حتى 30 يوم في السنة مجاناً." },
  { q: "ما هي طرق الدفع المتاحة؟", a: "نقبل الدفع النقدي، الفيزا، فودافون كاش، إنستا باي، وجميع المحافظ الإلكترونية." },
  { q: "هل يوجد جلسة تجريبية مجانية؟", a: "نعم! نقدم جلسة تجريبية مجانية لأول مرة لجميع الأعضاء الجدد." },
];

// ============ COMPONENTS ============

// Animated Counter
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000;
          const increment = end / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ============ MAIN PAGE ============
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  // Calculators state
  const [bmiData, setBmiData] = useState({ weight: "", height: "" });
  const [bmiResult, setBmiResult] = useState<{ value: string; category: string; color: string } | null>(null);
  
  const [calorieData, setCalorieData] = useState({ age: "", weight: "", height: "", gender: "male", activity: "1.2" });
  const [calorieResult, setCalorieResult] = useState<{ bmr: number; tdee: number } | null>(null);

  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", goal: "تخسيس" });
const handleBookingSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: bookingForm.name,
        phone: bookingForm.phone,
        plan: billingCycle, // أو الخطة المختارة عندك
        notes: bookingForm.goal, // إرسال الهدف كملاحظات
      }),
    });

    if (response.ok) {
      alert('تم تسجيل حجزك بنجاح!');
      setBookingForm({ name: "", phone: "", goal: "تخسيس" });
    } else {
      alert('حدث خطأ أثناء إرسال البيانات.');
    }
  } catch (error) {
    console.error(error);
    alert('تعذر الاتصال بالسيرفر، تأكد أن Laravel شغال.');
  }
};
  // Auto rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const calculateBMI = () => {
    const w = parseFloat(bmiData.weight);
    const h = parseFloat(bmiData.height) / 100;
    if (!w || !h) return;
    const bmi = w / (h * h);
    let category = "", color = "";
    if (bmi < 18.5) { category = "نحيف"; color = "text-blue-400"; }
    else if (bmi < 25) { category = "طبيعي - ممتاز"; color = "text-green-400"; }
    else if (bmi < 30) { category = "زيادة وزن"; color = "text-yellow-400"; }
    else { category = "سمنة"; color = "text-red-400"; }
    setBmiResult({ value: bmi.toFixed(1), category, color });
  };

  const calculateCalories = () => {
    const { age, weight, height, gender, activity } = calorieData;
    const a = parseFloat(age), w = parseFloat(weight), h = parseFloat(height);
    if (!a || !w || !h) return;
    const bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const tdee = bmr * parseFloat(activity);
    setCalorieResult({ bmr: Math.round(bmr), tdee: Math.round(tdee) });
  };

  const sendBookingWhatsApp = async () => {
    if (!bookingForm.name || !bookingForm.phone) {
      alert("برجاء إدخال الاسم ورقم الهاتف");
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: bookingForm.name,
          phone: bookingForm.phone,
          plan: billingCycle || "شهري",
          notes: bookingForm.goal || "",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("✅ تم إرسال حجزك بنجاح وتسجيله في لوحة التحكم!");
        setBookingForm({ name: "", phone: "", goal: "تخسيس" });
      } else {
        console.error("Laravel Validation Error:", result);
        alert(`❌ حدث خطأ: ${result.message || "البيانات غير مقبولة"}`);
      }
    } catch (error) {
      console.error("Network Error:", error);
      alert("❌ تعذر الاتصال بالسيرفر، تأكد أن لارافيل شغال.");
    }
  };
  const filteredGallery = galleryFilter === "all" ? GALLERY : GALLERY.filter(g => g.category === galleryFilter);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      
      {/* ============ NAVBAR ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-lg border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Dumbbell className="w-6 h-6" />
            </div>
            <span className="font-black text-xl">FitZone <span className="text-red-500">Pro</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-semibold">
            <a href="#home" className="hover:text-red-500 transition">الرئيسية</a>
            <a href="#trainers" className="hover:text-red-500 transition">الكوتشات</a>
            <a href="#schedule" className="hover:text-red-500 transition">الجدول</a>
            <a href="#pricing" className="hover:text-red-500 transition">الأسعار</a>
            <a href="#tools" className="hover:text-red-500 transition">الأدوات</a>
            <a href="#contact" className="hover:text-red-500 transition">تواصل</a>
          </div>
          <a href="#booking" className="hidden md:block bg-red-600 hover:bg-red-500 px-5 py-2 rounded-lg font-bold text-sm transition">احجز مجاناً</a>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-neutral-900 border-t border-neutral-800 px-4 py-4 space-y-3 text-sm">
            <a href="#home" className="block">الرئيسية</a>
            <a href="#trainers" className="block">الكوتشات</a>
            <a href="#schedule" className="block">الجدول</a>
            <a href="#pricing" className="block">الأسعار</a>
            <a href="#tools" className="block">الأدوات</a>
            <a href="#booking" className="block bg-red-600 text-center py-2 rounded-lg font-bold">احجز مجاناً</a>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80" className="w-full h-full object-cover opacity-30" alt="gym" />
          <div className="absolute inset-0 bg-gradient-to-l from-neutral-950 via-neutral-950/70 to-neutral-950/30"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block bg-red-600/20 text-red-400 px-4 py-1.5 rounded-full text-sm font-bold border border-red-600/30 mb-6">
              🔥 أفضل جيم في المنطقة 2026
            </span>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              حوّل جسمك.
              <br />
              <span className="text-red-500">غيّر حياتك.</span>
            </h1>
            <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
              انضم إلى أكبر مجتمع لياقة بدنية في المنطقة. أحدث الأجهزة، أفضل الكوتشات، وأقوى البرامج التدريبية المخصصة لك.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#booking" className="bg-red-600 hover:bg-red-500 px-8 py-4 rounded-xl font-bold flex items-center gap-2 glow transition">
                <Zap className="w-5 h-5" /> ابدأ رحلتك الآن
              </a>
              <a href="#tools" className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition">
                <Play className="w-5 h-5" /> جرب الحاسبات
              </a>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-neutral-900/60 backdrop-blur border border-neutral-800 rounded-2xl p-6 float-anim" style={{ animationDelay: `${i * 0.2}s` }}>
                <stat.icon className="w-8 h-8 text-red-500 mb-3" />
                <div className="text-4xl font-black">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-neutral-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRAINERS ============ */}
      <section id="trainers" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-red-500 font-bold text-sm">فريقنا</span>
            <h2 className="text-4xl md:text-5xl font-black mt-2">أفضل الكوتشات المحترفين</h2>
            <p className="text-neutral-400 mt-4 max-w-xl mx-auto">نخبة من المدربين الحاصلين على شهادات دولية لمساعدتك في تحقيق أهدافك</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRAINERS.map((t, i) => (
              <div key={i} className="group relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-red-600/50 transition">
                <div className="relative h-72 overflow-hidden">
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
                  <div className="absolute top-3 right-3 bg-yellow-500/90 text-black px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-black" /> {t.rating}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg">{t.name}</h3>
                  <p className="text-red-500 text-sm mt-1">{t.specialty}</p>
                  <div className="flex justify-between mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                    <span>{t.experience}</span>
                    <span>{t.clients} عميل</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SCHEDULE ============ */}
      <section id="schedule" className="py-20 px-4 bg-neutral-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-red-500 font-bold text-sm">جدولنا</span>
            <h2 className="text-4xl md:text-5xl font-black mt-2">جدول الكلاسات الأسبوعي</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            {CLASSES.map((day, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition ${activeDay === i ? "bg-red-600" : "bg-neutral-800 hover:bg-neutral-700"}`}
              >
                {day.day}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {CLASSES[activeDay].classes.map((cls, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 hover:border-red-600/50 rounded-xl p-5 flex justify-between items-center transition">
                <div className="flex items-center gap-4">
                  <div className="bg-red-600/20 text-red-400 p-3 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{cls.name}</h4>
                    <p className="text-neutral-400 text-sm">مع الكابتن {cls.trainer}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-500 font-black text-xl">{cls.time}</div>
                  <button className="text-xs text-neutral-400 hover:text-white mt-1">احجز مكانك ←</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-red-500 font-bold text-sm">الأسعار</span>
            <h2 className="text-4xl md:text-5xl font-black mt-2">اختر الباقة المناسبة لك</h2>
          </div>
          <div className="flex justify-center mb-10">
            <div className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl inline-flex">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition ${billingCycle === "monthly" ? "bg-red-600" : ""}`}
              >
                شهري
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition ${billingCycle === "yearly" ? "bg-red-600" : ""}`}
              >
                سنوي <span className="text-xs text-green-400">(وفر 20%)</span>
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div key={i} className={`relative bg-neutral-900 rounded-3xl p-8 border-2 transition hover:scale-105 ${plan.popular ? "border-red-600 shadow-2xl shadow-red-600/20" : "border-neutral-800"}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1 rounded-full text-xs font-black">
                    الأكثر طلباً 🔥
                  </div>
                )}
                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                <div className="my-6">
                  <span className="text-5xl font-black">{billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}</span>
                  <span className="text-neutral-400 mr-2">ج.م / {billingCycle === "monthly" ? "شهر" : "سنة"}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-neutral-600">
                      <X className="w-5 h-5 shrink-0 mt-0.5" />
                      <span className="line-through">{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#booking" className={`block text-center py-3 rounded-xl font-bold transition ${plan.popular ? "bg-red-600 hover:bg-red-500" : "bg-neutral-800 hover:bg-neutral-700"}`}>
                  اشترك الآن
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TOOLS / CALCULATORS ============ */}
      <section id="tools" className="py-20 px-4 bg-neutral-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-red-500 font-bold text-sm">أدوات مجانية</span>
            <h2 className="text-4xl md:text-5xl font-black mt-2">حاسبات اللياقة البدنية</h2>
            <p className="text-neutral-400 mt-4">أدوات احترافية تساعدك في معرفة حالتك الصحية ومسارك التدريبي</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* BMI Calculator */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-red-600/20 text-red-500 p-3 rounded-xl">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">حاسبة كتلة الجسم (BMI)</h3>
                  <p className="text-neutral-400 text-sm">اعرف مؤشر كتلة جسمك</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">الوزن (كجم)</label>
                  <input
                    type="number"
                    value={bmiData.weight}
                    onChange={e => setBmiData({ ...bmiData, weight: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 focus:border-red-500 focus:outline-none"
                    placeholder="مثال: 70"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">الطول (سم)</label>
                  <input
                    type="number"
                    value={bmiData.height}
                    onChange={e => setBmiData({ ...bmiData, height: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 focus:border-red-500 focus:outline-none"
                    placeholder="مثال: 175"
                  />
                </div>
                <button onClick={calculateBMI} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold transition">احسب الآن</button>
                {bmiResult && (
                  <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center">
                    <div className="text-4xl font-black">{bmiResult.value}</div>
                    <div className={`text-sm font-bold mt-1 ${bmiResult.color}`}>{bmiResult.category}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Calorie Calculator */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-red-600/20 text-red-500 p-3 rounded-xl">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">حاسبة السعرات اليومية</h3>
                  <p className="text-neutral-400 text-sm">احسب احتياجك اليومي من السعرات</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="العمر" value={calorieData.age} onChange={e => setCalorieData({ ...calorieData, age: e.target.value })} className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 focus:border-red-500 focus:outline-none" />
                <input type="number" placeholder="الوزن (كجم)" value={calorieData.weight} onChange={e => setCalorieData({ ...calorieData, weight: e.target.value })} className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 focus:border-red-500 focus:outline-none" />
                <input type="number" placeholder="الطول (سم)" value={calorieData.height} onChange={e => setCalorieData({ ...calorieData, height: e.target.value })} className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 focus:border-red-500 focus:outline-none" />
                <select value={calorieData.gender} onChange={e => setCalorieData({ ...calorieData, gender: e.target.value })} className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 focus:border-red-500 focus:outline-none">
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
                <select value={calorieData.activity} onChange={e => setCalorieData({ ...calorieData, activity: e.target.value })} className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 col-span-2 focus:border-red-500 focus:outline-none">
                  <option value="1.2">خامل (بدون تمرين)</option>
                  <option value="1.375">نشاط خفيف (1-3 أيام)</option>
                  <option value="1.55">نشاط متوسط (3-5 أيام)</option>
                  <option value="1.725">نشاط عالي (6-7 أيام)</option>
                  <option value="1.9">رياضي محترف</option>
                </select>
              </div>
              <button onClick={calculateCalories} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold transition mt-4">احسب السعرات</button>
              {calorieResult && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center">
                    <div className="text-xs text-neutral-400">معدل الأيض (BMR)</div>
                    <div className="text-2xl font-black mt-1">{calorieResult.bmr}</div>
                  </div>
                  <div className="bg-red-600/20 border border-red-600/50 rounded-xl p-4 text-center">
                    <div className="text-xs text-red-400">احتياجك اليومي</div>
                    <div className="text-2xl font-black mt-1 text-red-400">{calorieResult.tdee}</div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ============ GALLERY ============ */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-red-500 font-bold text-sm">معرض الصور</span>
            <h2 className="text-4xl md:text-5xl font-black mt-2">شاهد أرقى جيم</h2>
          </div>
          <div className="flex justify-center gap-2 mb-8">
            {[
              { id: "all", label: "الكل" },
              { id: "weights", label: "أوزان" },
              { id: "cardio", label: "كارديو" },
              { id: "classes", label: "كلاسات" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setGalleryFilter(f.id)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition ${galleryFilter === f.id ? "bg-red-600" : "bg-neutral-800 hover:bg-neutral-700"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredGallery.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer">
                <img src={img.url} alt="gallery" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/30 transition"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 px-4 bg-neutral-900/40">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-red-500 font-bold text-sm">قصص نجاح</span>
          <h2 className="text-4xl md:text-5xl font-black mt-2 mb-14">ماذا يقول أعضاؤنا؟</h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-12">
            <img src={TESTIMONIALS[activeTestimonial].image} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-red-600" alt="user" />
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(TESTIMONIALS[activeTestimonial].rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-lg md:text-xl text-neutral-300 leading-relaxed mb-4">&ldquo;{TESTIMONIALS[activeTestimonial].text}&rdquo;</p>
            <h4 className="font-bold text-red-500">{TESTIMONIALS[activeTestimonial].name}</h4>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`w-3 h-3 rounded-full transition ${activeTestimonial === i ? "bg-red-600 w-8" : "bg-neutral-700"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-red-500 font-bold text-sm">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-black mt-2">أسئلة شائعة</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 flex justify-between items-center text-right hover:bg-neutral-800/50 transition"
                >
                  <span className="font-bold">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 transition ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-neutral-400 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BOOKING CTA ============ */}
      <section id="booking" className="py-20 px-4 bg-gradient-to-l from-red-900/40 to-neutral-950">
        <div className="max-w-4xl mx-auto">
          <div className="bg-neutral-900 border border-red-600/30 rounded-3xl p-8 md:p-12 shadow-2xl shadow-red-600/10">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-black">احجز جلستك التجريبية <span className="text-red-500">مجاناً</span></h2>
              <p className="text-neutral-400 mt-3">جلسة تدريبية كاملة + استشارة تغذية + جولة في الجيم</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="اسمك الكامل"
                value={bookingForm.name}
                onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 focus:border-red-500 focus:outline-none"
              />
              <input
                type="tel"
                placeholder="رقم الهاتف / واتساب"
                value={bookingForm.phone}
                onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 focus:border-red-500 focus:outline-none"
              />
              <select
                value={bookingForm.goal}
                onChange={e => setBookingForm({ ...bookingForm, goal: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 focus:border-red-500 focus:outline-none"
              >
                <option>تخسيس وحرق دهون</option>
                <option>بناء عضلات وتضخيم</option>
                <option>لياقة عامة وصحة</option>
                <option>تنشيف وتقسيم</option>
                <option>تأهيل بعد إصابة</option>
              </select>
              <button onClick={sendBookingWhatsApp} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-black text-lg transition glow flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" /> احجز الآن عبر واتساب
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer id="contact" className="bg-black border-t border-neutral-800 py-12 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-red-600 p-2 rounded-lg">
                <Dumbbell className="w-5 h-5" />
              </div>
              <span className="font-black text-xl">FitZone <span className="text-red-500">Pro</span></span>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed">أكبر وأفخم صالة رياضية في المنطقة. انضم لعائلتنا اليوم.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#trainers" className="hover:text-red-500">الكوتشات</a></li>
              <li><a href="#pricing" className="hover:text-red-500">الأسعار</a></li>
              <li><a href="#schedule" className="hover:text-red-500">الجدول</a></li>
              <li><a href="#tools" className="hover:text-red-500">الأدوات</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 01000000000</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@fitzone.com</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> شارع التحرير، القاهرة</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">تابعنا</h4>
            <div className="flex gap-3">
              <a href="#" className="bg-neutral-900 hover:bg-red-600 p-3 rounded-lg transition"><Share2 className="w-5 h-5" /></a>
              <a href="#" className="bg-neutral-900 hover:bg-red-600 p-3 rounded-lg transition"><Phone className="w-5 h-5" /></a>
              <a href="#" className="bg-neutral-900 hover:bg-red-600 p-3 rounded-lg transition"><Mail className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-neutral-900 text-center text-neutral-500 text-sm">
          © 2026 FitZone Pro. جميع الحقوق محفوظة.
        </div>
      </footer>

    </div>
  );
}