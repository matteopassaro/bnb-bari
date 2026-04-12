import { useSearchParams, Link } from "react-router-dom";
import { Check, Calendar, MapPin, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FadeIn from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const PrenotazioneConfermata = () => {
  const { t } = useTranslation(["booking", "common"]);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{t("booking:confirmation.metaTitle")}</title>
      </Helmet>
      
      <Navbar />

      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <FadeIn direction="up">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <Check className="h-12 w-12 text-primary" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              {t("booking:confirmation.title")}
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              {t("booking:confirmation.description")}
            </p>

            <div className="bg-card border rounded-3xl p-8 mb-10 text-left space-y-6 shadow-sm">
              <h2 className="text-xl font-serif font-bold border-b pb-4">{t("booking:confirmation.nextSteps")}</h2>
              
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{t("booking:confirmation.checkEmailTitle")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t("booking:confirmation.checkEmailDescription")}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{t("booking:confirmation.planTripTitle")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t("booking:confirmation.planTripDescription")}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="rounded-full px-8 h-14 font-bold">
                <Link to="/">{t("common:actions.backHome")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 font-bold">
                <Link to="/camere" className="flex items-center gap-2">
                  {t("common:actions.exploreMore")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <p className="mt-12 text-xs text-muted-foreground">
              {t("booking:messages.sessionId")}: <span className="font-mono opacity-60">{sessionId?.slice(0, 20)}...</span>
            </p>
          </FadeIn>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrenotazioneConfermata;
