import Navbar from "./components/Navbar";
import GymHero from "./components/Hero";
import Amenities from "./components/Amenities";
import Trainers from "./components/Trainers";
import Schedule from "./components/Schedule";
import Pricing from "./components/Pricing";
import Tools from "./components/Tools";
import Gallery from "./components/Gallery";
import Testimonials from "./components/Testimonials";
import Faq from "./components/Faq";
import Booking from "./components/Booking";
import Footer, { FloatingActions } from "./components/Footer";
import MemberPanel from "./components/MemberPanel";
import Checkout from "./components/Checkout";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-ink pb-[74px] text-white selection:bg-brand md:pb-0">
      <Navbar />
      <GymHero />
      <Amenities />
      <Trainers />
      <Schedule />
      <Pricing />
      <Tools />
      <Gallery />
      <Testimonials />
      <Faq />
      <Booking />
      <Footer />

      {/* طبقات تفاعلية فوق الصفحة */}
      <MemberPanel />
      <Checkout />
      <FloatingActions />
    </main>
  );
}
