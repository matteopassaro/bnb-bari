import { useState, useEffect, useCallback } from "react";
import { rooms } from "@/data/rooms";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Wifi, Wind, Waves, Coffee, Tv, Maximize, Users, Bed, Check, ChevronLeft, ChevronRight, GlassWater } from "lucide-react";
import { cn } from "@/lib/utils";
import FadeIn from "@/components/FadeIn";
import useEmblaCarousel from 'embla-carousel-react';

const getIcon = (amenity: string) => {
  const a = amenity.toLowerCase();
  if (a.includes("wi-fi")) return <Wifi className="h-4 w-4" />;
  if (a.includes("aria condizionata")) return <Wind className="h-4 w-4" />;
  if (a.includes("vista mare")) return <Waves className="h-4 w-4" />;
  if (a.includes("colazione")) return <Coffee className="h-4 w-4" />;
  if (a.includes("tv")) return <Tv className="h-4 w-4" />;
  if (a.includes("balcone")) return <Maximize className="h-4 w-4" />;
  if (a.includes("minibar")) return <GlassWater className="h-4 w-4" />;
  return <Check className="h-4 w-4" />;
};

const RoomGallery = ({ images, name }: { images: string[]; name: string }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (images.length <= 1) {
    return (
      <div className="w-full lg:w-1/2 group overflow-hidden rounded-3xl shadow-xl aspect-[4/3] relative">
        <img 
          src={images[0]} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
      </div>
    );
  }

  return (
    <div className="w-full lg:w-1/2 relative group">
      <div className="overflow-hidden rounded-3xl shadow-xl aspect-[4/3] cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((img, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 relative h-full">
              <img 
                src={img} 
                alt={`${name} - ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      
      <button 
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border flex items-center justify-center text-foreground hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border flex items-center justify-center text-foreground hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10"
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, idx) => (
          <div 
            key={idx} 
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm",
              idx === selectedIndex ? "bg-white w-4" : "bg-white/50"
            )} 
          />
        ))}
      </div>
    </div>
  );
};

const Camere = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <div className="pt-32 pb-16 bg-secondary/30 text-center overflow-hidden">
        <div className="container mx-auto px-4">
          <FadeIn delay={0.1}>
            <p className="text-primary text-sm uppercase tracking-[0.3em] font-sans font-medium mb-4">
              Il tuo rifugio nel cuore di Bari
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6">
              Le Nostre Camere
            </h1>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="max-w-2xl mx-auto text-muted-foreground leading-relaxed">
              Ogni stanza è un pezzo unico, arredata con cura e attenzione ai dettagli per farti vivere un soggiorno indimenticabile tra il bianco della pietra e l'azzurro del mare.
            </p>
          </FadeIn>
        </div>
      </div>

      {/* Showroom Content */}
      <section className="py-20 overflow-hidden">
        <div className="container mx-auto px-4 space-y-24 md:space-y-32">
          {rooms.map((room, index) => (
            <FadeIn 
              key={room.id} 
              direction={index % 2 === 0 ? "right" : "left"}
              delay={0.1}
            >
              <div 
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
              >
                {/* Image side - Now with Gallery */}
                <RoomGallery images={room.images} name={room.name} />

                {/* Info side */}
                <div className="w-full lg:w-1/2 space-y-8 px-4 lg:px-8">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                      {room.name}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full">
                        <Users className="h-4 w-4 text-primary" /> {room.guests} {room.guests === 1 ? 'Ospite' : 'Ospiti'}
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full">
                        <Maximize className="h-4 w-4 text-primary" /> {room.size}
                      </span>
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed font-sans font-light">
                      {room.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm uppercase tracking-widest font-semibold text-foreground/70">Comfort inclusi</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                      {room.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-3 text-sm text-foreground/80">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getIcon(amenity)}
                          </div>
                          {amenity}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1 font-sans">A partire da</span>
                      <span className="text-3xl font-serif font-bold text-primary">€{room.price}</span>
                      <span className="text-sm text-muted-foreground ml-1 font-sans">/ notte</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 text-base font-semibold">
                        <Link to={`/camera/${room.id}`}>
                          Vedi Dettagli
                        </Link>
                      </Button>
                      <Button asChild size="lg" className="rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                        <Link to={`/prenota?room=${room.id}`}>
                          Prenota Ora
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Trust Quote */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="text-2xl md:text-3xl font-serif italic text-foreground opacity-80 leading-relaxed">
            "Soggionare in queste camere è come fare un tuffo nel passato della Puglia, ma con tutte le comodità moderne."
          </p>
          <div className="mt-8 h-px w-24 bg-primary/30 mx-auto" />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Camere;
