import { MapPin } from "lucide-react";

const places = [
  { name: "Basilica di San Nicola", distance: "5 min a piedi", desc: "Capolavoro romanico, meta di pellegrinaggio da tutto il mondo." },
  { name: "Lungomare di Bari", distance: "8 min a piedi", desc: "La passeggiata più bella del Sud: 15 km di costa e brezza marina." },
  { name: "Bari Vecchia", distance: "2 min a piedi", desc: "Vicoli bianchi, signore che fanno le orecchiette e storia millenaria." },
  { name: "Teatro Petruzzelli", distance: "10 min a piedi", desc: "Il quarto teatro d'Italia per grandezza. Opera, danza e concerti." },
  { name: "Polignano a Mare", distance: "35 min in auto", desc: "Scogliere a picco sull'Adriatico e il famoso lido tra le rocce." },
  { name: "Alberobello", distance: "1 ora in auto", desc: "I trulli patrimonio UNESCO. Un villaggio da fiaba nel cuore della Puglia." },
];

const ExploreSection = () => {
  return (
    <section id="esplora" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
            Esplora i dintorni
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
            Bari e la Puglia
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {places.map((place) => (
            <div
              key={place.name}
              className="flex gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow"
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreSection;
