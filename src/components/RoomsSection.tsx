import { Link } from "react-router-dom";
import { Users, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rooms } from "@/data/rooms";

const RoomsSection = () => {
  return (
    <section id="camere" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
            Le nostre camere
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
            Comfort e tradizione
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {rooms.map((room, i) => (
            <div
              key={room.id}
              className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={room.image}
                  alt={room.name}
                  loading="lazy"
                  width={800}
                  height={600}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full">
                  €{room.price}/notte
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-serif font-bold text-card-foreground mb-2">{room.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{room.description}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {room.guests} ospiti</span>
                  <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {room.size}</span>
                </div>

                <Button asChild variant="outline" className="w-full">
                  <Link to={`/prenota?room=${room.id}`}>Prenota questa camera</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoomsSection;
