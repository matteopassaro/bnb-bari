import FadeIn from "./FadeIn";
import { Star, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";

const reviews = [
  {
    id: "alice",
    author: "Alice Moras",
    rating: 5
  },
  {
    id: "marco",
    author: "Marco Rossi",
    rating: 5
  },
  {
    id: "elena",
    author: "Elena S.",
    rating: 4
  }
];

const ReviewsSection = () => {
  const { t } = useTranslation(["home", "common"]);

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <FadeIn direction="up">
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              {t("home:reviews.eyebrow")}
            </p>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              {t("home:reviews.title")}
            </h2>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {reviews.map((review, i) => (
            <FadeIn key={i} direction="up" delay={0.1 * (i + 1)}>
              <div className="bg-card p-8 rounded-3xl border shadow-sm flex flex-col h-full hover:shadow-xl transition-shadow duration-500 relative">
                <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10" />
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground italic mb-6 flex-grow leading-relaxed font-light">
                  "{t(`home:reviews.items.${review.id}.text`)}"
                </p>
                <div className="border-t pt-4">
                  <p className="font-serif font-bold text-foreground">{t(`home:reviews.items.${review.id}.author`)}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">{t(`home:reviews.items.${review.id}.date`)}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        
        <FadeIn direction="up" delay={0.5}>
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-6 px-8 py-4 bg-secondary/30 rounded-full border">
                <div className="text-left">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("home:reviews.averageLabel")}</p>
                    <p className="text-xl font-serif font-bold text-foreground">{t("home:reviews.averageScore")}</p>
                </div>
                <div className="h-10 w-px bg-foreground/10" />
                <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Booking.com_logo.svg/1200px-Booking.com_logo.svg.png" 
                    alt={t("common:media.bookingLogoAlt")}
                    className="h-4 opacity-70"
                />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default ReviewsSection;
