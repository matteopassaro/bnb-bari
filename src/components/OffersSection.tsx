import { Link } from "react-router-dom";
import { Star, Percent, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const offers = [
  {
    icon: Sun,
    title: "Offerta Early Bird",
    description: "Prenota con 30 giorni di anticipo e risparmia il 15% su tutte le camere.",
    badge: "-15%",
  },
  {
    icon: Star,
    title: "Soggiorno Romantico",
    description: "3 notti nella Suite dell'Ulivo con cena pugliese in terrazza inclusa.",
    badge: "€350",
  },
  {
    icon: Percent,
    title: "Settimana Barese",
    description: "7 notti al prezzo di 5. Scopri Bari con calma, come un locale.",
    badge: "5+2",
  },
];

const OffersSection = () => {
  return (
    <section className="py-20 md:py-28 bg-teal-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
            Offerte del momento
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
            Il meglio per te
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {offers.map((offer) => (
            <div
              key={offer.title}
              className="bg-card rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-shadow duration-300 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent mb-5">
                <offer.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="inline-block bg-gold/20 text-gold-foreground text-xs font-bold px-3 py-1 rounded-full mb-4">
                {offer.badge}
              </div>
              <h3 className="text-lg font-serif font-bold text-card-foreground mb-2">{offer.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">{offer.description}</p>
              <Button asChild variant="ghost" className="text-primary font-medium">
                <Link to="/prenota">Scopri di più →</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OffersSection;
