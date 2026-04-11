import { MapPin } from "lucide-react";
import FadeIn from "./FadeIn";

const places = [
  { name: "Cattedrale di Bari", distance: "200 metri", desc: "A pochi passi dalla vostra camera, ammirate il rosone monumentale che illumina la facciata romanica." },
  { name: "Basilica di San Nicola", distance: "400 metri", desc: "La meta di pellegrinaggio più celebre del Mediterraneo, custode delle reliquie del Santo." },
  { name: "Castello Svevo", distance: "200 metri", desc: "La maestosa fortezza normanno-sveva che segna l'ingresso del borgo antico." },
  { name: "Strada delle Orecchiette", distance: "300 metri", desc: "L'Arco Basso, dove le signore baresi preparano ancora la pasta a mano davanti ai vostri occhi." },
  { name: "Lungomare e porto", distance: "600 metri", desc: "L'abbraccio del mare barese per una passeggiata al tramonto o una gita in barca." },
  { name: "Aeroporto di Bari", distance: "20 min", desc: "Raggiungibile comodamente con il nostro servizio transfer privato su richiesta." },
];

const ExploreSection = () => {
  return (
    <section id="esplora" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <FadeIn direction="up" delay={0.1}>
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              Esplora i dintorni
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              Bari e la Puglia
            </h2>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {places.map((place, i) => (
            <FadeIn key={place.name} direction="up" delay={0.1 * (i + 1)}>
              <div
                className="flex gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow h-full"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-card-foreground text-sm">{place.name}</h3>
                  <p className="text-xs text-primary font-medium mb-1">{place.distance}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{place.desc}</p>
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
