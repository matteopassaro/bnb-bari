import { Link } from "react-router-dom";
import { Star, Percent, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import FadeIn from "./FadeIn";
import { useTranslation } from "react-i18next";

const offers = [
  {
    id: "bestPrice",
    icon: Star,
  },
  {
    id: "oldTown",
    icon: Sun,
  },
  {
    id: "longStay",
    icon: Percent,
  },
];

const OffersSection = () => {
  const { t } = useTranslation(["home", "common"]);

  return (
    <section className="py-20 md:py-28 bg-teal-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <FadeIn direction="up" delay={0.1}>
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              {t("home:offers.eyebrow")}
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              {t("home:offers.title")}
            </h2>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {offers.map((offer, i) => (
            <FadeIn key={offer.id} direction="up" delay={0.1 * (i + 1)}>
              <div
                className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-shadow duration-300 text-center h-full flex flex-col"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent mb-5 mx-auto">
                  <offer.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="inline-block bg-gold/20 text-gold-foreground text-xs font-bold px-3 py-1 rounded-full mb-4 mx-auto w-fit">
                  {t(`home:offers.items.${offer.id}.badge`)}
                </div>
                <h3 className="text-lg font-serif font-bold text-card-foreground mb-2">{t(`home:offers.items.${offer.id}.title`)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">{t(`home:offers.items.${offer.id}.description`)}</p>
                <Button asChild variant="ghost" className="text-primary font-medium mt-auto">
                  <Link to="/prenota">{t("common:actions.discoverMore")}</Link>
                </Button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OffersSection;
