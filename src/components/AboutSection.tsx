import FadeIn from "./FadeIn";
import roomEntrance from "@/assets/room1_entrance.jpg";

const AboutSection = () => {
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <FadeIn direction="right">
              <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-4">
                La Nostra Storia
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-8 leading-tight">
                Nel cuore pulsante<br />della storia barese
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed text-lg font-light">
                <p>
                  Corte del Borgo Antico è un accogliente B&B nel cuore di Bari Vecchia, a pochi passi dal Castello Svevo e dalle principali attrazioni del centro storico. La posizione strategica permette di vivere appieno l’atmosfera autentica della città.
                </p>
                <p>
                  Gli ambienti sono confortevoli e curati, con soffitti in legno che donano calore e una cucina attrezzata per la massima autonomia. Una soluzione ideale per un soggiorno pratico e rilassante nel centro di Bari.
                </p>

              </div>
              <div className="mt-10 grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-serif font-bold text-2xl text-primary">200m</h4>
                  <p className="text-sm text-muted-foreground font-sans">Dal Castello Svevo</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-2xl text-primary">8.8 / 10</h4>
                  <p className="text-sm text-muted-foreground font-sans">Punteggio su Booking</p>
                </div>
              </div>
            </FadeIn>
          </div>
          <div className="lg:w-1/2 relative">
            <FadeIn direction="left">
              <img
                src={roomEntrance}
                alt="Dettaglio architettura pietra"
                className="rounded-3xl shadow-2xl relative z-10 w-full object-cover h-[500px]"
              />
              <div className="absolute -bottom-6 -right-6 -left-6 h-64 bg-secondary/50 -z-10 rounded-3xl" />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
