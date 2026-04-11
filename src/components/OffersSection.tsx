import { Link } from "react-router-dom";
import { Star, Percent, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import FadeIn from "./FadeIn";

const offers = [
  {
    icon: Star,
    title: "Miglior Prezzo Diretto",
    description: "Prenota direttamente sul nostro sito per assicurarti la tariffa più bassa rispetto ai portali.",
    badge: "Esclusivo",
  },
  {
    icon: Sun,
    title: "Vivi il Borgo Antico",
    description: "Soggiorna nel Monolocale e ricevi una guida esclusiva ai segreti di Bari Vecchia.",
    badge: "Insider",
  },
  {
    icon: Percent,
    title: "Sconto Long Stay",
    description: "Sconto del 10% per i soggiorni superiori alle 4 notti. Scopri la Puglia senza fretta.",
    badge: "-10%",
  },
];

const OffersSection = () => {
  return (
    <section className="py-20 md:py-28 bg-teal-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <FadeIn direction="up" delay={0.1}>
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              Offerte del momento
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              Il meglio per te
            </h2>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {offers.map((offer, i) => (
            <FadeIn key={offer.title} direction="up" delay={0.1 * (i + 1)}>
              <div
                className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-shadow duration-300 text-center h-full flex flex-col"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent mb-5 mx-auto">
                  <offer.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="inline-block bg-gold/20 text-gold-foreground text-xs font-bold px-3 py-1 rounded-full mb-4 mx-auto w-fit">
                  {offer.badge}
                </div>
                <h3 className="text-lg font-serif font-bold text-card-foreground mb-2">{offer.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-grow">{offer.description}</p>
                <Button asChild variant="ghost" className="text-primary font-medium mt-auto">
                  <Link to="/prenota">Scopri di più →</Link>
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
