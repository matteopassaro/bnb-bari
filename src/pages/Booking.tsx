import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { rooms } from "@/data/rooms";

const Booking = () => {
  const [searchParams] = useSearchParams();

  const [checkIn, setCheckIn] = useState<Date | undefined>(
    searchParams.get("checkin") ? new Date(searchParams.get("checkin")!) : undefined
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(
    searchParams.get("checkout") ? new Date(searchParams.get("checkout")!) : undefined
  );
  const [selectedRoom, setSelectedRoom] = useState(searchParams.get("room") || "");
  const [guests, setGuests] = useState(searchParams.get("guests") || "2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const nights = useMemo(() => {
    if (checkIn && checkOut) return differenceInDays(checkOut, checkIn);
    return 0;
  }, [checkIn, checkOut]);

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);
  const total = selectedRoomData ? selectedRoomData.price * nights : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || !selectedRoom || !name || !email) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }
    if (nights <= 0) {
      toast.error("Le date selezionate non sono valide");
      return;
    }
    setSubmitted(true);
    toast.success("Richiesta inviata con successo!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-16 min-h-[80vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-4">Grazie, {name}!</h1>
            <p className="text-muted-foreground mb-2">
              La tua richiesta per <strong>{selectedRoomData?.name}</strong> è stata inviata.
            </p>
            <p className="text-muted-foreground text-sm mb-1">
              {format(checkIn!, "d MMM yyyy", { locale: it })} → {format(checkOut!, "d MMM yyyy", { locale: it })} · {nights} {nights === 1 ? "notte" : "notti"}
            </p>
            <p className="text-lg font-bold text-primary mt-3">Totale: €{total}</p>
            <p className="text-muted-foreground text-sm mt-6">Ti risponderemo via email entro 24 ore.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
              Prenotazione
            </p>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              Prenota il tuo soggiorno
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-card rounded-2xl border p-6 space-y-5">
                <h2 className="font-serif text-lg font-bold text-card-foreground">Date e camera</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(checkIn, "d MMM yyyy", { locale: it }) : "Seleziona data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(checkOut, "d MMM yyyy", { locale: it }) : "Seleziona data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d < (checkIn || new Date())} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Camera *</Label>
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                      <SelectTrigger><SelectValue placeholder="Scegli camera" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name} — €{r.price}/notte</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ospiti</Label>
                    <Select value={guests} onValueChange={setGuests}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "ospite" : "ospiti"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl border p-6 space-y-5">
                <h2 className="font-serif text-lg font-bold text-card-foreground">I tuoi dati</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome completo *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario@email.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Note o richieste particolari</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Orario di arrivo, allergie alimentari, ecc." rows={3} />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border p-6 sticky top-24 space-y-5">
                <h2 className="font-serif text-lg font-bold text-card-foreground">Riepilogo</h2>

                {selectedRoomData && (
                  <div className="rounded-xl overflow-hidden">
                    <img src={selectedRoomData.image} alt={selectedRoomData.name} className="w-full h-36 object-cover" loading="lazy" />
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  {selectedRoomData && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Camera</span>
                      <span className="font-medium text-card-foreground">{selectedRoomData.name}</span>
                    </div>
                  )}
                  {checkIn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in</span>
                      <span className="font-medium text-card-foreground">{format(checkIn, "d MMM yyyy", { locale: it })}</span>
                    </div>
                  )}
                  {checkOut && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out</span>
                      <span className="font-medium text-card-foreground">{format(checkOut, "d MMM yyyy", { locale: it })}</span>
                    </div>
                  )}
                  {nights > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durata</span>
                      <span className="font-medium text-card-foreground">{nights} {nights === 1 ? "notte" : "notti"}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ospiti</span>
                    <span className="font-medium text-card-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {guests}</span>
                  </div>
                </div>

                {nights > 0 && selectedRoomData && (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">€{selectedRoomData.price} × {nights} notti</span>
                        <span className="font-medium text-card-foreground">€{total}</span>
                      </div>
                    </div>
                    <div className="border-t pt-4 flex justify-between text-lg font-bold">
                      <span className="text-card-foreground">Totale</span>
                      <span className="text-primary">€{total}</span>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full h-12 text-base font-semibold">
                  Invia richiesta
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Nessun pagamento richiesto. Ti confermeremo via email.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Booking;
