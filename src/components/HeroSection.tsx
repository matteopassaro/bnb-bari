import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/hero-bari.jpg";
import FadeIn from "./FadeIn";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "@/i18n/config";

const HeroSection = () => {
  const { t, i18n } = useTranslation(["home", "common"]);
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(2);
  const dateLocale = getDateLocale(i18n.resolvedLanguage);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (checkIn) params.set("checkin", checkIn.toISOString());
    if (checkOut) params.set("checkout", checkOut.toISOString());
    params.set("guests", guests.toString());
    navigate(`/prenota?${params.toString()}`);
  };

  return (
    <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      <img
        src={heroImg}
        alt={t("home:hero.imageAlt")}
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <FadeIn delay={0.1}>
          <p className="text-primary-foreground/80 text-sm uppercase tracking-[0.3em] mb-4 font-sans font-medium">
            {t("home:hero.eyebrow")}
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-primary-foreground mb-6 leading-tight uppercase">
            {t("home:hero.titleTop")}<br />{t("home:hero.titleBottom")}
          </h1>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p className="text-primary-foreground/90 text-lg md:text-xl font-sans font-light mb-10 max-w-2xl mx-auto italic">
            "{t("home:hero.quote")}"
          </p>
        </FadeIn>

        {/* Search bar */}
        <FadeIn delay={0.4}>
          <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-3 md:p-4 shadow-2xl max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {/* Check-in */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-12",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "d MMM yyyy", { locale: dateLocale }) : t("common:labels.checkIn")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
                    locale={dateLocale}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Check-out */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-12",
                      !checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "d MMM yyyy", { locale: dateLocale }) : t("common:labels.checkOut")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={(date) => date < (checkIn || new Date())}
                    locale={dateLocale}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Guests */}
              <div className="flex items-center gap-2 border rounded-lg px-4 h-12 flex-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium w-full outline-none"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{t("common:counts.guests", { count: n })}</option>
                  ))}
                </select>
              </div>

              <Button onClick={handleSearch} className="h-12 px-8 text-sm font-semibold">
                {t("common:actions.search")}
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default HeroSection;
