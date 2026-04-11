import FadeIn from "./FadeIn";
import { MapPin, Navigation } from "lucide-react";

const LocationSection = () => {
  const address = "Corte Morgese 18 - angolo strada Attolini, 70121, Bari, Italia";
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_YOUR_API_KEY&q=${encodeURIComponent(address)}`;
  
  // Per semplicità e senza necessità di API Key immediata, usiamo un iframe standard con ricerca
  const simpleMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <section id="posizione" className="py-20 md:py-28 bg-secondary/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-12 lg:items-stretch">
          
          {/* Descrizione e Indicazioni */}
          <div className="lg:w-5/12 flex flex-col justify-center">
            <FadeIn direction="right">
              <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-4">
                Dove siamo
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-8">
                Nel cuore pulsante <br />di Bari Vecchia
              </h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Indirizzo</h4>
                    <p className="text-muted-foreground text-sm uppercase tracking-tight">
                      Corte Morgese 18, 70121 Bari (BA)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-3">Come raggiungerci dal Castello Svevo</h4>
                    <div className="space-y-4 text-muted-foreground text-sm leading-relaxed font-light">
                      <p>
                        <strong>1. </strong> Lasciati il maestoso Castello Svevo alle spalle e attraversa Piazza Federico II di Svevia in direzione della città vecchia.
                      </p>
                      <p>
                        <strong>2. </strong> Entra nel cuore del borgo attraverso i vicoli che portano verso la Cattedrale di San Sabino.
                      </p>
                      <p>
                        <strong>3. </strong> Una volta raggiunta la piazza della Cattedrale, prosegui verso est addentrandoti nelle stradine più intime fino a incrociare Strada Attolini.
                      </p>
                      <p>
                        <strong>4. </strong> Corte Morgese si trova all'angolo, un'oasi di pace preservata dal tempo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Mappa */}
          <div className="lg:w-7/12 min-h-[400px]">
            <FadeIn direction="left" fullWidth className="h-full">
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative group">
                <iframe
                  title="Google Maps"
                  src={simpleMapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '450px' }}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
                <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-3xl" />
              </div>
            </FadeIn>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LocationSection;
