import FadeIn from "./FadeIn";
import { MapPin, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";

const LocationSection = () => {
  const { t } = useTranslation(["home", "common"]);
  const address = t("common:site.addressLong");
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_YOUR_API_KEY&q=${encodeURIComponent(address)}`;
  
  // Per semplicità e senza necessità di API Key immediata, usiamo un iframe standard con ricerca
  const simpleMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <section id="posizione" className="py-20 md:py-28 bg-secondary/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-12 lg:items-stretch">
          
          {/* Descrizione e Indicazioni */}
          <div className="lg:w-5/12 flex flex-col justify-center">
            <FadeIn direction="right">
              <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-4">
                {t("home:location.eyebrow")}
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-8">
                {t("home:location.titleTop")} <br />{t("home:location.titleBottom")}
              </h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">{t("home:location.addressTitle")}</h4>
                    <p className="text-muted-foreground text-sm uppercase tracking-tight">
                      {t("common:site.addressShort")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-3">{t("home:location.directionsTitle")}</h4>
                    <div className="space-y-4 text-muted-foreground text-sm leading-relaxed font-light">
                      <p>
                        <strong>1. </strong> {t("home:location.steps.one")}
                      </p>
                      <p>
                        <strong>2. </strong> {t("home:location.steps.two")}
                      </p>
                      <p>
                        <strong>3. </strong> {t("home:location.steps.three")}
                      </p>
                      <p>
                        <strong>4. </strong> {t("home:location.steps.four")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Mappa */}
          <div className="lg:w-7/12 min-h-[400px]">
            <FadeIn direction="left" fullWidth className="h-full">
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative group">
                <iframe
                  title={t("common:media.mapTitle")}
                  src={simpleMapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '450px' }}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
                <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-3xl" />
              </div>
            </FadeIn>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LocationSection;
