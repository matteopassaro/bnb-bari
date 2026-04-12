import { MapPin } from "lucide-react";
import FadeIn from "./FadeIn";
import { useTranslation } from "react-i18next";

const places = [
  "cathedral",
  "basilica",
  "castle",
  "orecchiette",
  "seafront",
  "airport",
];

const ExploreSection = () => {
  const { t } = useTranslation("home");

  return (
    <section id="esplora" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <FadeIn direction="up" delay={0.1}>
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              {t("explore.eyebrow")}
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              {t("explore.title")}
            </h2>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {places.map((place, i) => (
            <FadeIn key={place} direction="up" delay={0.1 * (i + 1)}>
              <div
                className="flex gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow h-full"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-card-foreground text-sm">{t(`explore.places.${place}.name`)}</h3>
                  <p className="text-xs text-primary font-medium mb-1">{t(`explore.places.${place}.distance`)}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t(`explore.places.${place}.description`)}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreSection;
