import FadeIn from "./FadeIn";
import roomEntrance from "@/assets/room1_entrance.jpg";
import { useTranslation } from "react-i18next";

const AboutSection = () => {
  const { t } = useTranslation("home");

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <FadeIn direction="right">
              <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-4">
                {t("about.eyebrow")}
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-8 leading-tight">
                {t("about.titleTop")}<br />{t("about.titleBottom")}
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed text-lg font-light">
                <p>{t("about.paragraphOne")}</p>
                <p>{t("about.paragraphTwo")}</p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-serif font-bold text-2xl text-primary">200m</h4>
                  <p className="text-sm text-muted-foreground font-sans">{t("about.distanceLabel")}</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-2xl text-primary">8.8 / 10</h4>
                  <p className="text-sm text-muted-foreground font-sans">{t("about.scoreLabel")}</p>
                </div>
              </div>
            </FadeIn>
          </div>
          <div className="lg:w-1/2 relative">
            <FadeIn direction="left">
              <img
                src={roomEntrance}
                alt={t("about.imageAlt")}
                className="rounded-3xl shadow-2xl relative z-10 w-full object-cover h-[500px]"
              />
              <div className="absolute -bottom-6 -right-6 -left-6 h-64 bg-secondary/50 -z-10 rounded-3xl" />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
