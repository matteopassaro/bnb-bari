import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import RoomsSection from "@/components/RoomsSection";
import OffersSection from "@/components/OffersSection";
import LocationSection from "@/components/LocationSection";
import ExploreSection from "@/components/ExploreSection";
import ReviewsSection from "@/components/ReviewsSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation("home");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "Corte del Borgo Antico",
    "image": "https://casadelsole.bari.it/assets/hero-bari.jpg",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Corte Morgese 18",
      "addressLocality": "Bari",
      "addressRegion": "BA",
      "postalCode": "70121",
      "addressCountry": "IT"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "41.1297",
      "longitude": "16.8681"
    },
    "url": "https://casadelsole.bari.it",
    "telephone": "+393336070102",
    "priceRange": "€€",
    "starRating": {
      "@type": "Rating",
      "ratingValue": "8.8"
    }
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
        <script type="application/ld+json">
          {`
            ${JSON.stringify(jsonLd)}
          `}
        </script>
      </Helmet>
      
      <Navbar />
      <HeroSection />
      <AboutSection />
      <RoomsSection />
      <OffersSection />
      <ReviewsSection />
      <LocationSection />
      <ExploreSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
