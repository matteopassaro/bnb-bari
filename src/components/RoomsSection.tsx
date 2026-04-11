import { Link } from "react-router-dom";
import { Users, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rooms } from "@/data/rooms";
import FadeIn from "./FadeIn";
import { useTranslation } from "react-i18next";

const RoomsSection = () => {
  const { t } = useTranslation(["home", "common"]);

  return (
    <section id="camere" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <FadeIn direction="up" delay={0.1}>
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              {t("home:roomsSection.eyebrow")}
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              {t("home:roomsSection.title")}
            </h2>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {rooms.map((room, i) => {
            const roomName = t(`roomsData.${room.id}.name`, { ns: "home" });
            const roomDescription = t(`roomsData.${room.id}.description`, { ns: "home" });

            return (
            <FadeIn key={room.id} direction="up" delay={0.1 * (i + 1)}>
              <div
                className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border h-full flex flex-col"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={room.images[0]}
                    alt={roomName}
                    loading="lazy"
                    width={800}
                    height={600}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full">
                    €{room.price}{t("common:labels.perNight")}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <Link to={`/camera/${room.id}`} className="hover:text-primary transition-colors">
                    <h3 className="text-xl font-serif font-bold text-card-foreground mb-2">{roomName}</h3>
                  </Link>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-grow">{roomDescription}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {t("common:counts.guests", { count: room.guests })}</span>
                    <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {room.size}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/camera/${room.id}`}>{t("common:actions.detailsAndPhotos")}</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to={`/prenota?room=${room.id}`}>{t("common:actions.bookNow")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RoomsSection;
