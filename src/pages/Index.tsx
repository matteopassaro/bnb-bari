import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import RoomsSection from "@/components/RoomsSection";
import OffersSection from "@/components/OffersSection";
import ExploreSection from "@/components/ExploreSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <RoomsSection />
      <OffersSection />
      <ExploreSection />
      <Footer />
    </div>
  );
};

export default Index;
