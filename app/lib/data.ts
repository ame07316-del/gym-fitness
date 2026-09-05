import heroImg from "@/public/images/hero.jpg";
import weightsImg from "@/public/images/gym-weights.jpg";
import cardioImg from "@/public/images/gym-cardio.jpg";
import classesImg from "@/public/images/gym-classes.jpg";
import crossfitImg from "@/public/images/gym-crossfit.jpg";
import boxingImg from "@/public/images/gym-boxing.jpg";
import recoveryImg from "@/public/images/gym-recovery.jpg";
import nutritionImg from "@/public/images/gym-nutrition.jpg";
import trainer1 from "@/public/images/trainer-1.jpg";
import trainer2 from "@/public/images/trainer-2.jpg";
import trainer3 from "@/public/images/trainer-3.jpg";
import trainer4 from "@/public/images/trainer-4.jpg";
import beforeCut from "@/public/images/before-cut.jpg";
import afterCut from "@/public/images/after-cut.jpg";
import beforeYoga from "@/public/images/before-yoga.jpg";
import afterYoga from "@/public/images/after-yoga.jpg";
import beforeBulk from "@/public/images/before-bulk.jpg";
import afterBulk from "@/public/images/after-bulk.jpg";
import {
  Users, Dumbbell, Flame, Activity, HeartPulse, Trophy, WavesHorizontal, Bike, Music2,
  Timer, Gem, Snowflake, Utensils, CalendarDays,
} from "lucide-react";

export type IconType = typeof Dumbbell;

/* ========================= Gym info ========================= */
export const GYM = {
  name: "FitZone Pro",
  phone: "0100 000 0000",
  whatsapp: "201000000000",
  email: "info@fitzone.pro",
  address: "شارع التحرير، ميدان سفنكس، المهندسين، الجيزة",
  maps: "https://maps.google.com/?q=Tahrir+Street+Mohandessin+Giza",
  hours: { open: 6, close: 24 },
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
  tiktok: "https://tiktok.com",
  youtube: "https://youtube.com",
};

export const NAV = [
  { id: "home", label: "الرئيسية" },
  { id: "trainers", label: "الكوتشات" },
  { id: "schedule", label: "الجدول" },
  { id: "pricing", label: "الاشتراكات" },
  { id: "tools", label: "الأدوات" },
  { id: "gallery", label: "الصور" },
  { id: "faq", label: "الأسئلة" },
];

export const STATS: { icon: IconType; value: number; suffix: string; label: string }[] = [
  { icon: Users, value: 10_000, suffix: "+", label: "عضو نشط" },
  { icon: Trophy, value: 200, suffix: "+", label: "بطولة استضافها الجيم" },
  { icon: Gem, value: 45, suffix: "+", label: "كوتش معتمد دولياً" },
  { icon: CalendarDays, value: 29, suffix: " سنة", label: "خبرة في المجال" },
];

export const TICKER = [
  "أحدث أجهزة Technogym",
  "كوتشات للرجال والسيدات",
  "ساونا + جاكوزي + ثلّاجة",
  "برنامج غذائي بمصريتك",
  "كلاسات جماعية يومياً",
  "جراج أرضي وأمن 24 ساعة",
  "واي فاي سريع ومجاني",
  "تطبيق متابعة على الموبايل",
];

/* ========================= Trainers ========================= */
export type Trainer = {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  reviews: number;
  clients: number;
  price: number;
  image: typeof trainer1 | typeof trainer3;
  bio: string;
  certs: string[];
  skills: { label: string; value: number }[];
  slots: string[];
  full: boolean;
  tags: string[];
};

export const TRAINERS: Trainer[] = [
  {
    id: "ahmed",
    name: "كابتن أحمد السيد",
    specialty: "كمال أجسام وقوة",
    experience: "10 سنوات",
    rating: 4.9,
    reviews: 218,
    clients: 240,
    price: 800,
    image: trainer1,
    bio: "بطل سابق في كمال الأجسام، متخصص في برامج التضخيم والتنشيف للمبتدئين والمحترفين، وبحضّر اللاعبين لبطولات الجمهورية.",
    certs: ["IFBB Certified Coach", "NASM-CPT", "إسعافات رياضية"],
    skills: [
      { label: "تضخيم", value: 96 },
      { label: "تنشيف", value: 88 },
      { label: "قوة قصوى", value: 92 },
      { label: "تجهيز بطولات", value: 85 },
    ],
    slots: ["الأحد ٧ م", "الثلاثاء ٧ م", "الخميس ٧ م"],
    full: false,
    tags: ["أوزان حرة", "برنامج قوة", "تصحيح تنفيذ"],
  },
  {
    id: "mohamed",
    name: "كابتن محمد فاروق",
    specialty: "لياقة وHIIT وكارديو",
    experience: "8 سنوات",
    rating: 4.8,
    reviews: 164,
    clients: 180,
    price: 650,
    image: trainer2,
    bio: "متخصص في حرق الدهون بتمارين interval عالية الكثافة، وبرامج لياقة آمنة للي starting بعد الـ 40.",
    certs: ["ACE-CPT", "TRX Level 2", "CrossFit L1"],
    skills: [
      { label: "كارديو", value: 94 },
      { label: "حرق دهون", value: 90 },
      { label: "لياقة قلبية", value: 86 },
      { label: "مرونة", value: 72 },
    ],
    slots: ["السبت ٦ م", "الاثنين ٨ م", "الأربعاء ٦ م"],
    full: false,
    tags: ["HIIT", "تاباتا", "جري"],
  },
  {
    id: "sara",
    name: "كابتن سارة حسن",
    specialty: "يوجا وبيلاتس وتخسيس",
    experience: "6 سنوات",
    rating: 5,
    reviews: 341,
    clients: 320,
    price: 700,
    image: trainer3,
    bio: "مدربة يوجا معتمدة لبرنامج السيدات، بتركّز على تصحيح القوام وتخسيس ما بعد الولادة بأمان وبدون إصابات.",
    certs: ["RYT-500 Yoga Alliance", "Pilates Mat II", "تغذية سلوكية"],
    skills: [
      { label: "يوجا", value: 98 },
      { label: "بيلاتس", value: 93 },
      { label: "تصحيح قوام", value: 90 },
      { label: "بعد الولادة", value: 88 },
    ],
    slots: ["السبت ٧ ص", "الاثنين ٧ ص", "الأحد ٩ م"],
    full: true,
    tags: ["يوجا", "بيلاتس", "تمدد"],
  },
  {
    id: "zahraa",
    name: "كابتن زهرة عادل",
    specialty: "كروس فيت وMMA",
    experience: "5 سنوات",
    rating: 4.7,
    reviews: 129,
    clients: 200,
    price: 750,
    image: trainer4,
    bio: "لاعبة MMA سابقة ومدربة كروس فيت — تمارين وظيفية عالية الشدة تبني القوة والتحمّل في نفس الوقت.",
    certs: ["CrossFit L2", "USA Weightlifting", "MMA Strength"],
    skills: [
      { label: "كروس فيت", value: 92 },
      { label: "ملاكمة", value: 89 },
      { label: "تحمّل", value: 94 },
      { label: "رفع أولمبي", value: 80 },
    ],
    slots: ["السبت ٦ م", "الاثنين ٦ م", "الخميس ٨ ص"],
    full: false,
    tags: ["كروس فيت", "ملاكمة", "ويفز"],
  },
];

/* ========================= Schedule ========================= */
export type ClassSlot = {
  time: string;
  startHour: number;
  name: string;
  trainer: string;
  icon: IconType;
  intensity: 1 | 2 | 3;
  capacity: number;
  taken: number;
  kcal: number;
};

const mk = (
  time: string,
  startHour: number,
  name: string,
  trainer: string,
  icon: IconType,
  intensity: 1 | 2 | 3,
  capacity: number,
  taken: number,
  kcal: number,
): ClassSlot => ({ time, startHour, name, trainer, icon, intensity, capacity, taken, kcal });

export const SCHEDULE: { day: string; en: string; classes: ClassSlot[] }[] = [
  {
    day: "السبت",
    en: "SAT",
    classes: [
      mk("07:00 ص", 7, "يوجا صباحية", "سارة حسن", Activity, 1, 20, 12, 240),
      mk("06:00 م", 18, "كروس فيت", "زهرة عادل", Flame, 3, 16, 15, 620),
      mk("08:00 م", 20, "قوة وتضخيم", "أحمد السيد", Dumbbell, 2, 24, 9, 480),
    ],
  },
  {
    day: "الأحد",
    en: "SUN",
    classes: [
      mk("08:00 ص", 8, "كارديو حارق", "محمد فاروق", Bike, 2, 22, 22, 540),
      mk("07:00 م", 19, "كمال أجسام", "أحمد السيد", Dumbbell, 3, 20, 14, 510),
      mk("09:00 م", 21, "بيلاتس", "سارة حسن", WavesHorizontal, 1, 18, 6, 300),
    ],
  },
  {
    day: "الاثنين",
    en: "MON",
    classes: [
      mk("07:00 ص", 7, "بيلاتس", "سارة حسن", WavesHorizontal, 1, 18, 11, 310),
      mk("06:00 م", 18, "MMA", "زهرة عادل", Flame, 3, 14, 13, 700),
      mk("08:00 م", 20, "HIIT تعبئة", "محمد فاروق", Timer, 3, 25, 17, 590),
    ],
  },
  {
    day: "الثلاثاء",
    en: "TUE",
    classes: [
      mk("08:00 ص", 8, "زومبا", "سارة حسن", Music2, 2, 30, 24, 460),
      mk("07:00 م", 19, "قوة وتحمل", "أحمد السيد", Dumbbell, 2, 20, 8, 500),
    ],
  },
  {
    day: "الأربعاء",
    en: "WED",
    classes: [
      mk("07:00 ص", 7, "يوجا", "سارة حسن", Activity, 1, 20, 9, 250),
      mk("06:00 م", 18, "كارديو", "محمد فاروق", Bike, 2, 22, 19, 520),
      mk("08:00 م", 20, "تنشيف وتقسيم", "أحمد السيد", Flame, 3, 16, 12, 560),
    ],
  },
  {
    day: "الخميس",
    en: "THU",
    classes: [
      mk("08:00 ص", 8, "كروس فيت", "زهرة عادل", Flame, 3, 16, 16, 640),
      mk("07:00 م", 19, "كمال أجسام", "أحمد السيد", Dumbbell, 2, 24, 11, 490),
    ],
  },
  {
    day: "الجمعة",
    en: "FRI",
    classes: [mk("10:00 ص", 10, "دورة مكثفة — الفريق كامل", "كل الكوتشات", HeartPulse, 2, 40, 27, 720)],
  },
];

/* ========================= Subscriptions ========================= */
export type PlanId = "basic" | "pro" | "vip";
export type CycleId = "monthly" | "quarterly" | "semiannual" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  tag: string;
  monthly: number;
  ring: string;
  badge?: string;
  icon: IconType;
  perks: string[];
  missing: string[];
  best: string;
};

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "أساسي",
    tag: "دخول غير محدود وبس",
    monthly: 500,
    ring: "border-line",
    icon: Dumbbell,
    perks: ["دخول غير محدود للجيم", "كل الأجهزة الحديثة", "خزانة شخصية", "دش وساونا مجاني", "تطبيق المتابعة"],
    missing: ["كوتش خاص", "برنامج غذائي", "كلاسات جماعية"],
    best: "للطلبة والمبتدئين",
  },
  {
    id: "pro",
    name: "برو",
    tag: "أحسن قيمة مقابل سعر",
    monthly: 900,
    ring: "border-brand",
    badge: "الأكثر طلباً 🔥",
    icon: Flame,
    perks: [
      "كل مميزات الباقة الأساسية",
      "كوتش خاص (4 جلسات/شهر)",
      "برنامج تدريبي مخصص",
      "كلاسات جماعية غير محدودة",
      "تحليل جسم InBody شهري",
      "خصم 10% على المكملات",
    ],
    missing: ["برنامج غذائي متقدم", "مساج أسبوعي"],
    best: "للي عايز نتيجة مضمونة",
  },
  {
    id: "vip",
    name: "VIP إليت",
    tag: "كل تفصيلة في رحلتك",
    monthly: 1500,
    ring: "border-gold/70",
    badge: "النخبة 👑",
    icon: Trophy,
    perks: [
      "كل مميزات باقة برو",
      "كوتش خاص (12 جلسة/شهر)",
      "برنامج غذائي بيتحدّث أسبوعياً",
      "استشارة طبيب رياضي",
      "مساج استرخاء أسبوعي",
      "أولوية حجز الكلاسات",
      "خزانة ديلوكس + ركن سيارات مخصص",
    ],
    missing: [],
    best: "للمحترفين وتجهيز البطولات",
  },
];

export const CYCLES: { id: CycleId; label: string; months: number; off: number; note: string }[] = [
  { id: "monthly", label: "شهري", months: 1, off: 0, note: "بدون التزام" },
  { id: "quarterly", label: "٣ شهور", months: 3, off: 0.08, note: "الأكثر اختياراً" },
  { id: "semiannual", label: "٦ شهور", months: 6, off: 0.14, note: "مثالي للتحويل" },
  { id: "yearly", label: "سنوي", months: 12, off: 0.22, note: "أقوى خصم" },
];

export type Addon = { id: string; name: string; desc: string; price: number; icon: IconType };

export const ADDONS: Addon[] = [
  { id: "coach", name: "جلسات كوتش إضافية", desc: "+4 جلسات في الشهر مع الكابتن اللي تختاره", price: 300, icon: Dumbbell },
  { id: "nutrition", name: "برنامج غذائي مصري", desc: "أكل بيتك في البيت + تبديل كل أسبوع", price: 200, icon: Utensils },
  { id: "recovery", name: "ساونا وثلاجة ثلج", desc: "جلسات تعافي 30 دقيقة بعد التمرين", price: 150, icon: Snowflake },
  { id: "inbody", name: "تحليل InBody أسبوعي", desc: "تقرير عضلات ودهون ومياه كل أسبوع", price: 120, icon: Activity },
  { id: "supp", name: "خصم المكملات 25%", desc: "كوبون شهري على البروتين والفيتامينات", price: 90, icon: Gem },
  { id: "lockers", name: "خزانة ديلوكس + مناشف", desc: "خزانة مفردة كبيرة ومناشف يومية", price: 80, icon: Timer },
];

export type Coupon = { code: string; off: number; label: string; min: number; max?: number };

export const COUPONS: Coupon[] = [
  { code: "FIT10", off: 0.1, label: "خصم 10% على أي اشتراك", min: 0 },
  { code: "NEW25", off: 0.25, label: "خصم الأعضاء الجدد 25% (بحد أقصى 1500)", min: 1500, max: 1500 },
  { code: "YEAR20", off: 0.2, label: "خصم 20% على الاشتراكات الطويلة", min: 4000 },
  { code: "REFERRAL", off: 0.15, label: "كود إحالة من عضو (15%)", min: 0 },
];

export const VAT_RATE = 0.14;
export const FREEZE_DAYS_LIMIT = 30;

/* ========================= Gallery ========================= */
export type Shot = {
  src: typeof weightsImg;
  cat: "weights" | "cardio" | "classes" | "recovery";
  title: string;
  wide?: boolean;
};

export const GALLERY: Shot[] = [
  { src: weightsImg, cat: "weights", title: "صالة الأوزان الحرة — 1200 م²", wide: true },
  { src: cardioImg, cat: "cardio", title: "صف الكارديو بإضاءة ليلية" },
  { src: classesImg, cat: "classes", title: "استوديو الكلاسات الجماعية" },
  { src: crossfitImg, cat: "classes", title: "بوكس الكروس فيت والحلقات" },
  { src: recoveryImg, cat: "recovery", title: "منطقة التعافي: ساونا وثلاجة ثلج", wide: true },
  { src: nutritionImg, cat: "recovery", title: "ركن التغذية ووجبات التحضير" },
  { src: boxingImg, cat: "classes", title: "حلبة الملاكمة وMMA" },
  { src: heroImg, cat: "weights", title: "الصالة الرئيسية من المدخل" },
];

export const GALLERY_FILTERS = [
  { id: "all", label: "الكل" },
  { id: "weights", label: "أوزان" },
  { id: "cardio", label: "كارديو" },
  { id: "classes", label: "كلاسات" },
  { id: "recovery", label: "تعافي وتغذية" },
] as const;

export const HERO_IMAGE = heroImg;

/* ========================= Before / after ========================= */
export type Transform = {
  id: string;
  name: string;
  meta: string;
  months: number;
  lost: string;
  label: string;
  quote: string;
  from: typeof beforeCut;
  to: typeof afterCut;
};

export const TRANSFORMS: Transform[] = [
  {
    id: "cut",
    name: "أحمد إبراهيم",
    meta: "27 سنة · التخسيس بالمائجة",
    months: 4,
    lost: "−25 كجم دهون",
    label: "تخسيس",
    quote: "أول شهر كنت بجي ٦ الصبح عشان أخاف حد يبص لي.",
    from: beforeCut,
    to: afterCut,
  },
  {
    id: "pose",
    name: "منى خالد",
    meta: "٣٢ سنة · بعد الولادة",
    months: 6,
    lost: "قوام متناسق + نوم رجعت",
    label: "بيلاتس",
    quote: "بدأنا بعشر دقايق. كنت أنام في العربية قبل ما أطلع.",
    from: beforeYoga,
    to: afterYoga,
  },
  {
    id: "bulk",
    name: "كريم صبري",
    meta: "٢٤ سنة · تضخيم نظيف",
    months: 8,
    lost: "+9 كجم عضل",
    label: "تضخيم",
    quote: "الورقة الصغيرة اللي الكوتش بيكتبلي فيها هي اللي فرّقت.",
    from: beforeBulk,
    to: afterBulk,
  },
];

/* ========================= Social proof ========================= */
export const TESTIMONIALS = [
  {
    name: "أحمد إبراهيم",
    role: "عضو من 4 شهور · باقة برو",
    text: "أول يوم دخلت مشيت بعد 20 دقيقة لأني حسيت إن كل الناس بتبص عليا. الكابتن محمد لحظ ده وقالي تعال بكرة الفجر مفيش حد. روحت فعلًا. خسيت 25 كيلو من غير ما آكل سلطة بس — كنت بخبي شاورما السبت وأعوّضها الأحد. الحاجة الوحيدة اللي مضايقاني إن عصير البروتين في الكافيتريا غالي شوية.",
    rating: 5,
    result: "−25 كجم",
    when: "من ١٢ يوم",
  },
  {
    name: "منى خالد",
    role: "عضوة VIP · بعد الولادة",
    text: "جيت بعد الولادة بسبعة شهور ومش عارفة أعمل إيه. الكابتن سارة قالت هنبدأ بعشر دقايق. كنت أنام عشر دقايق في العربية قبل ما أطلع، وعشر دقايق على جهاز المشي. بعد ٦ شهور القوام رجع والأهم إني بقيت أنام. صالة السيدات نظيفة وريحة المكان كويسة، ده اللي خليني أكمل.",
    rating: 5,
    result: "قوام بعد الولادة",
    when: "من ٣ أسابيع",
  },
  {
    name: "محمود علي",
    role: "عضو من ٨ شهور · أساسي + كوتش",
    text: "الكابتن أحمد كان بيكتبلي التمرين على ورقة صغيرة ويمسحها كل أسبوعين. في الأول ضحكت، بس الورقة دي هي اللي فرّقت. ٨ شهور ووزني من ٦٢ لـ ٧١ وناس الشغل بتسألني بتعمل إيه. العيب الوحيد: الجراج بيتقفل الساعة ٨ بالليل ولازم تستنى دور.",
    rating: 5,
    result: "+9 كجم عضل",
    when: "من شهرين",
  },
  {
    name: "سلمى فؤاد",
    role: "طالبة · اشتراك ٣ شهور",
    text: "اشتريت باقة ٣ شهور بين الامتحانات. الحجز من الموقع سريع وكارت العضوية على الموبايل مريح. مرة السيستم وقع وأنا أحجز كروس فيت، كلمتهم على واتساب ردوا في ٦ دقايق وحلوا المشكلة. مفيش حصة اتلغت — عشان كده ٤ مش ٥، عايزين السيستم ما يقعش 😄",
    rating: 4,
    result: "داوم ٣×/أسبوع",
    when: "من ٥ أسابيع",
  },
];

export const REVIEWS = [
  {
    name: "كريم صبري",
    rating: 5,
    text: "أحسن حاجة إن المكان مفتوح لحد ١٢ بالليل. أنا بشغل شفتين، ودلوقتي بتمرن ١١ ونص ومفيش نظرة غريبة.",
    plan: "أساسي",
    when: "من ١٢ يوم",
  },
  {
    name: "نهى رجب",
    rating: 4,
    text: "صالة السيدات من ٤ لـ ٨ نظيفة ومفيش زحمة. الساونا كانت سخنة زيادة عن اللزوم، قلتلهم وخفّضوها فعلًا.",
    plan: "برو",
    when: "من ٣ أسابيع",
  },
  {
    name: "عميد حسام",
    rating: 5,
    text: "الاشتراك السنوي بخصم ٢٢٪ وفّرلي شهرين ونص. جمدت شهر وأنا مسافر من اللوحة لوحدي من غير ما أكلم حد.",
    plan: "سنوي VIP",
    when: "من شهرين",
  },
  {
    name: "ياسمين طه",
    rating: 5,
    text: "أول ما عملت InBody كنت فاكرها دعاية. طلعت الأرقام صح وكنت فعند عندي دهون حشوية. البرنامج الغذائي خلاني آكل عيش ومكرونة وخسيت برضه.",
    plan: "برو + تغذية",
    when: "من ٥ أسابيع",
  },
  {
    name: "مصطفى جامع",
    rating: 3,
    text: "التمرين والكوتشات تمام. بس في ساعة الذروة ٧-٨ مساءً بتستنى جهاز الصدر دقيقة أو اتنين. يا ريت يحطوا حجز للأجهزة زي الكلاسات.",
    plan: "أساسي",
    when: "من ٤ شهور",
  },
  {
    name: "رنا أسامة",
    rating: 5,
    text: "البيلاتس مع كابتن سارة عدّلت ضهري من القعدة في المكتب. الحجز بيمتلي في دقيقة، لازم تحجز بدري 😅",
    plan: "كلاسات",
    when: "من أسبوع",
  },
];

export const FAQS = [
  {
    q: "إيه مواعيد الجيم؟",
    a: "مفتوح كل يوم من 6 الصبح لحد 12 منتصف الليل، ويوم الجمعة من 10 الصبح. أعضاء برو وVIP ليههم دخول في أي وقت بكارت العضوية.",
  },
  {
    q: "هل يوجد كوتش للسيدات؟",
    a: "أيوه، عندنا 4 مدربات معتمدات (سارة، زهرة وغيرهم)، وفترة سيدات كاملة من 4 لـ 8 بالليل بصالة مستقلة ودخول منفصل.",
  },
  {
    q: "هل أقدر أجمّد الاشتراك؟",
    a: "أكيد. من لوحة «عضويتي» تقدر تجمّد لحد 30 يوم في السنة من غير أي رسوم، وفترة الصلاحية بتتمد تلقائياً بعدد أيام التجميد.",
  },
  {
    q: "إزاي أدفع؟ وفي فيزا؟",
    a: "فيزا وماستركارد، فودافون كاش، إنستا باي، محفظة البنك، أو كاش من الكاشير. الاشتراك السنوي بيتقسّط على 3 دفعات بدون فوائد.",
  },
  {
    q: "فيه جلسة تجريبية مجانية؟",
    a: "أيوه — جلسة تدريب كاملة + تحليل InBody + استشارة تغذية بالمجان للأعضاء الجدد. احجزها من قسم الحجز في آخر الصفحة.",
  },
  {
    q: "الاشتراك بيتجدد لوحده؟",
    a: "التجديد التلقائي اختياري وتقدر تقفله في أي وقت من لوحة العضوية، وبنبعتلك تنبيه قبل التجديد بـ 5 أيام.",
  },
  {
    q: "هل يوجد جراج وأمان؟",
    a: "عندنا جراج أرضي بكاميرات مراقبة وخدمة أمن 24 ساعة، وكمان خزائن إلكترونية لكل عضو.",
  },
];

export const GOALS = [
  "تخسيس وحرق دهون",
  "بناء عضلات وتضخيم",
  "لياقة عامة وصحة",
  "تنشيف وتقسيم",
  "تأهيل بعد إصابة",
  "تجهيز لبطولة",
  "استشارة تغذية بس",
];

export const TIME_SLOTS = [
  { id: "early", label: "٦ – ٩ الصبح" },
  { id: "noon", label: "٩ الصبح – ١ بالليل" },
  { id: "after", label: "١ –  الظهر" },
  { id: "evening", label: "٤ – ٨ بالليل" },
  { id: "night", label: "٨ بالليل – ١٢" },
];

export const PAY_METHODS = [
  { id: "card", label: "فيزا / ماستركارد", hint: "دفع آمن وفوري" },
  { id: "wallet", label: "فودافون كاش / إنستا باي", hint: "تحويل محافظ" },
  { id: "install", label: "تقسيط على 3 دفعات", hint: "بدون فوائد (سنوي)" },
  { id: "cash", label: "كاش في الجيم", hint: "بيتأكد بعد الدفع" },
] as const;
