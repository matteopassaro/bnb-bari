import { useState, useMemo, useCallback } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { 
  Wifi, Wind, Waves, Coffee, Tv, Maximize, Users, Bed, Check, 
  MapPin, Clock, Languages, Utensils, Zap, Refrigerator, 
  Microwave, Key, Luggage, ChevronLeft, ArrowLeft, Star, Phone, MessageCircle, ChevronDown
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FadeIn from "@/components/FadeIn";
import { rooms } from "@/data/rooms";
import { supabase } from "@/lib/supabase";
import useEmblaCarousel from 'embla-carousel-react';
import { useAvailability } from "@/hooks/useAvailability";

const RoomDetail = () => {
  const { id } = useParams();
  const room = rooms.find(r => r.id === id);

  if (!room) {
    return <Navigate to="/camere" replace />;
  }
  
  // Booking Form State
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [guests, setGuests] = useState(room.guests.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);

  const { blockedDates } = useAvailability(room.id);

  // Embla Carousel for mobile
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' });

  const nights = useMemo(() => {
    if (checkIn && checkOut) return differenceInDays(checkOut, checkIn);
    return 0;
  }, [checkIn, checkOut]);

  const total = room.price * nights;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || !name || !email) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    if (nights <= 0) {
      toast.error("Le date selezionate non sono valide");
      return;
    }

    setIsSubmitting(true);

    try {
      const language = typeof navigator !== "undefined" ? navigator.language : "en";

      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          room_id: room.id,
          room_name: room.name,
          check_in: format(checkIn, "yyyy-MM-dd"),
          check_out: format(checkOut, "yyyy-MM-dd"),
          guests: parseInt(guests),
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          price_per_night: room.price,
          language,
        }
      });

      if (invokeError) throw invokeError;
      
      const { session_url, error: edgeError } = data || {};
      if (edgeError) {
        if (edgeError === "Dates already booked") {
           toast.error("Spiacenti, le date selezionate sono state appena occupate.");
        } else {
           throw new Error(edgeError);
        }
        return;
      }

      if (session_url) {
        window.location.href = session_url;
      }
    } catch (err: any) {
      console.error("Errore checkout:", err);
      toast.error("Errore nell'invio. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const amenities = [
    { icon: <Check className="h-4 w-4" />, label: "Bagno privato" },
    { icon: <Wind className="h-4 w-4" />, label: "Aria condizionata" },
    { icon: <Wifi className="h-4 w-4" />, label: "WiFi gratuito" },
    { icon: <Tv className="h-4 w-4" />, label: "TV a schermo piatto" },
    { icon: <Waves className="h-4 w-4" />, label: "Vista" },
    { icon: <Check className="h-4 w-4" />, label: "Doccia" },
    { icon: <Zap className="h-4 w-4" />, label: "Ascensore" },
    { icon: <Coffee className="h-4 w-4" />, label: "Bollitore elettrico" },
    { icon: <Refrigerator className="h-4 w-4" />, label: "Frigorifero" },
    { icon: <Microwave className="h-4 w-4" />, label: "Forno" },
    { icon: <Utensils className="h-4 w-4" />, label: "Cucina a Induzione" },
    { icon: <Check className="h-4 w-4" />, label: "Fattura disponibile" },
    { icon: <Key className="h-4 w-4" />, label: "Check-in/out privati" },
    { icon: <Luggage className="h-4 w-4" />, label: "Deposito bagagli" },
    { icon: <Clock className="h-4 w-4" />, label: "Check-in express" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[70vh] overflow-hidden">
        <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <FadeIn direction="up">
            <Link to="/camere" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors font-sans uppercase tracking-widest text-xs">
              <ArrowLeft className="h-4 w-4" /> Tutte le camere
            </Link>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 uppercase tracking-tight">{room.name}</h1>
            <div className="flex items-center justify-center gap-4 text-white/90">
              <span className="flex items-center gap-1.5"><Users className="h-5 w-5 text-primary" /> {room.guests} Ospiti</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="flex items-center gap-1.5 font-serif font-bold text-xl">da €{room.price} <span className="text-sm font-light opacity-70">/notte</span></span>
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12 md:space-y-20">
            
            {/* Gallery: Grid on Desktop, Slideshow on Mobile */}
            <section>
              <FadeIn direction="up">
                <h2 className="text-2xl font-serif font-bold mb-8">Galleria Immagini</h2>
                
                {/* Mobile Slideshow */}
                <div className="block lg:hidden overflow-hidden rounded-3xl shadow-xl" ref={emblaRef}>
                  <div className="flex">
                    {room.images.map((img, idx) => (
                      <div key={idx} className="flex-[0_0_85%] min-w-0 pr-4 aspect-[4/3]">
                        <img 
                          src={img} 
                          alt={`${room.name} ${idx}`} 
                          className="w-full h-full object-cover rounded-2xl" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Grid */}
                <div className="hidden lg:grid grid-cols-3 gap-4">
                  {room.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "overflow-hidden rounded-2xl shadow-md aspect-square group",
                        idx === 0 && "col-span-2 row-span-2 aspect-auto"
                      )}
                    >
                      <img 
                        src={img} 
                        alt={`${room.name} ${idx}`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                    </div>
                  ))}
                </div>
              </FadeIn>
            </section>

            {/* Storytelling & Description */}
            <section className="space-y-6">
              <FadeIn direction="up">
                <h2 className="text-3xl font-serif font-bold mb-8 tracking-tight">Un rifugio tra storia e mare</h2>
                <div className="prose prose-slate max-w-none text-muted-foreground leading-relaxed text-lg font-light space-y-8">
                  <p>
                    Situata nel cuore pulsante del <strong>centro storico di Bari</strong>, l'elegante <strong>Camera Tripla Deluxe</strong> di Corte del Borgo Antico offre un'esperienza autentica in ambienti climatizzati con ingresso indipendente e <strong>WiFi gratuito</strong>. La Basilica di San Nicola si trova a soli 200 metri di distanza.
                  </p>
                  <p>
                    Il borgo antico di Bari è sorvegliato dal maestoso <strong>castello normanno-svevo</strong>, circondato dal suo fossato difensivo e dai vicoletti che percorrono la città seguendo una pianta circolare. Durante il soggiorno, non mancare di fare tappa alla sfarzosissima <strong>Basilica di San Nicola</strong> e alla <strong>Cattedrale di San Sabino</strong>.
                  </p>
                  <p>
                    Le strade qui ospitano numerosi <strong>ristoranti, pizzerie e caffetterie</strong>. Per chi desidera esplorare oltre il mare, i traghetti partono dal porto a 600 metri, mentre l'aeroporto sorge a 20 minuti di auto.
                  </p>
                </div>
                
                {/* Extra CTA for other rooms */}
                <div className="mt-12 flex flex-wrap gap-4">
                  <Button asChild variant="outline" className="rounded-full px-6">
                    <Link to="/camere">Esplora altre soluzioni</Link>
                  </Button>
                  <a href="https://wa.me/393336070102" target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className="rounded-full px-6 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> Info su WhatsApp
                    </Button>
                  </a>
                </div>
              </FadeIn>
            </section>

            {/* Advantages & Amenities Collapsible */}
            <section className="bg-secondary/20 rounded-3xl overflow-hidden border">
              <button 
                onClick={() => setIsAmenitiesOpen(!isAmenitiesOpen)}
                className="w-full flex items-center justify-between p-8 md:p-10 text-left hover:bg-secondary/30 transition-colors"
              >
                <div>
                  <h3 className="text-2xl font-serif font-bold">Servizi e Vantaggi Inclusi</h3>
                  <p className="text-sm text-muted-foreground mt-1">Sviluppa per vedere la lista completa dei comfort</p>
                </div>
                <ChevronDown className={cn("h-6 w-6 transition-transform duration-300", isAmenitiesOpen && "rotate-180")} />
              </button>
              
              <div className={cn(
                "px-8 md:px-10 overflow-hidden transition-all duration-500 ease-in-out",
                isAmenitiesOpen ? "max-h-[1000px] pb-10" : "max-h-0"
              )}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {amenities.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-foreground/80">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Languages className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-medium">Lingue parlate</span>
                      <p className="text-xs text-muted-foreground italic">Italiano, Inglese, Spagnolo</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <FadeIn direction="up">
                <h3 className="text-2xl font-serif font-bold mb-8">Dove ci troviamo</h3>
                <div className="h-[350px] rounded-3xl overflow-hidden shadow-xl border-2 border-white relative">
                  <iframe
                    title="Mappa Posizione"
                    src="https://maps.google.com/maps?q=Corte%20Morgese%2018%2C%2070121%20Bari&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                </div>
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { val: "200m", tag: "San Nicola" },
                    { val: "200m", tag: "Castello Svevo" },
                    { val: "600m", tag: "Porto di Bari" },
                    { val: "20 min", tag: "Aeroporto" }
                  ].map((s, i) => (
                    <div key={i} className="p-5 bg-card border rounded-2xl text-center shadow-sm">
                      <p className="text-primary font-bold text-lg mb-1">{s.val}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.tag}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </section>
          </div>

          {/* Sidebar - Booking */}
          <div className="lg:col-start-3">
            <aside className="sticky top-24">
              <FadeIn direction="left">
                <div className="bg-card rounded-3xl border shadow-xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full" />
                  
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Prezzo per notte</p>
                      <span className="text-4xl font-serif font-bold text-primary">€{room.price}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-0.5 mb-1 justify-end">
                        {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Coppie: 8.8/10</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Check-in</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal py-6 px-4 rounded-xl", !checkIn && "text-muted-foreground")}>
                              {checkIn ? format(checkIn, "dd/MM") : "Data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} blockedDates={blockedDates} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Check-out</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal py-6 px-4 rounded-xl", !checkOut && "text-muted-foreground")}>
                              {checkOut ? format(checkOut, "dd/MM") : "Data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d < (checkIn || new Date())} blockedDates={blockedDates} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-4 gap-2 items-end">
                        <div className="col-span-3 space-y-1.5">
                           <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome e Cognome" className="h-12 rounded-xl" required />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                           <select 
                            value={guests} 
                            onChange={(e) => setGuests(e.target.value)}
                            className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                           >
                             {[...Array(room.guests)].map((_, i) => (
                               <option key={i+1} value={i+1}>{i+1}</option>
                             ))}
                           </select>
                        </div>
                      </div>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Indirizzo Email" className="h-12 rounded-xl" required />
                    </div>

                    {nights > 0 && (
                      <div className="bg-primary/5 rounded-2xl p-5 my-6 border border-primary/10">
                        <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                          <span>Soggiorno ({nights} n.)</span>
                          <span>€{total}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-foreground">
                          <span>Totale</span>
                          <span className="text-primary text-xl">€{total}</span>
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-95 transition-all mt-4" disabled={isSubmitting}>
                      {isSubmitting ? "Elaborazione..." : "Prenota con Carta"}
                    </Button>
                    <div className="flex flex-col gap-2 mt-4">
                      <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5 text-[10px] uppercase tracking-tighter">
                        <a href="tel:+393336070102" className="flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Oppure chiama ora
                        </a>
                      </Button>
                    </div>
                  </form>
                </div>
              </FadeIn>
            </aside>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default RoomDetail;
