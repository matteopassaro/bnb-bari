import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Users } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import FadeIn from "@/components/FadeIn";

import { useAvailability } from "@/hooks/useAvailability";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "@/i18n/config";

const Booking = () => {
  const { t, i18n } = useTranslation(["booking", "common", "home"]);
  const [searchParams] = useSearchParams();
  const dateLocale = getDateLocale(i18n.resolvedLanguage);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { blockedDates } = useAvailability(selectedRoom);

  const nights = useMemo(() => {
    if (checkIn && checkOut) return differenceInDays(checkOut, checkIn);
    return 0;
  }, [checkIn, checkOut]);

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);
  const total = selectedRoomData ? selectedRoomData.price * nights : 0;
  const selectedRoomName = selectedRoomData ? t(`roomsData.${selectedRoomData.id}.name`, { ns: "home" }) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || !selectedRoom || !name || !email) {
      toast.error(t("booking:toasts.requiredFields"));
      return;
    }
    if (nights <= 0) {
      toast.error(t("booking:toasts.invalidDates"));
      return;
    }

    setIsSubmitting(true);

    try {
      const language = typeof navigator !== "undefined" ? navigator.language : "en";

      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          room_id: selectedRoom,
          room_name: selectedRoomName,
          check_in: format(checkIn, "yyyy-MM-dd"),
          check_out: format(checkOut, "yyyy-MM-dd"),
          guests: parseInt(guests),
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          price_per_night: selectedRoomData?.price,
          language,
        }
      });

      if (invokeError) throw invokeError;
      
      const { session_url, error: edgeError } = data || {};
      if (edgeError) {
        if (edgeError === "Dates already booked") {
           toast.error(t("booking:toasts.datesJustBooked"));
        } else {
           throw new Error(edgeError);
        }
        return;
      }

      if (session_url) {
        window.location.href = session_url;
      } else {
        throw new Error(t("booking:toasts.sessionError"));
      }
    } catch (error: any) {
      console.error("Errore durante la prenotazione:", error);
      toast.error(t("booking:toasts.requestError"));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <FadeIn direction="up">
              <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
                {t("booking:page.eyebrow")}
              </p>
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
                {t("booking:page.title")}
              </h1>
            </FadeIn>
          </div>

          <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3 space-y-6">
              <FadeIn direction="right" delay={0.1}>
                <div className="bg-card rounded-2xl border p-6 space-y-5">
                  <h2 className="font-serif text-lg font-bold text-card-foreground">{t("booking:page.dateAndRoom")}</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("common:labels.checkIn")} *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkIn ? format(checkIn, "d MMM yyyy", { locale: dateLocale }) : t("common:labels.selectDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} blockedDates={blockedDates} locale={dateLocale} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common:labels.checkOut")} *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkOut ? format(checkOut, "d MMM yyyy", { locale: dateLocale }) : t("common:labels.selectDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d < (checkIn || new Date())} blockedDates={blockedDates} locale={dateLocale} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("common:labels.room")} *</Label>
                      <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                        <SelectTrigger><SelectValue placeholder={t("booking:placeholders.selectRoom")} /></SelectTrigger>
                        <SelectContent>
                          {rooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{t("booking:messages.roomOption", { roomName: t(`roomsData.${r.id}.name`, { ns: "home" }), price: r.price })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common:labels.guests")}</Label>
                      <Select value={guests} onValueChange={setGuests}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((n) => (
                            <SelectItem key={n} value={n.toString()}>{t("common:counts.guests", { count: n })}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="right" delay={0.2}>
                <div className="bg-card rounded-2xl border p-6 space-y-5">
                  <h2 className="font-serif text-lg font-bold text-card-foreground">{t("booking:page.yourDetails")}</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("common:labels.fullName")} *</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("booking:placeholders.fullNameExample")} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common:labels.email")} *</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("booking:placeholders.emailExample")} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common:labels.phone")}</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("booking:placeholders.phoneExample")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common:labels.notes")}</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("booking:placeholders.notesExample")} rows={3} />
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Summary */}
            <div className="lg:col-span-2">
              <FadeIn direction="left" delay={0.3}>
                <div className="bg-card rounded-2xl border p-6 sticky top-24 space-y-5">
                  <h2 className="font-serif text-lg font-bold text-card-foreground">{t("booking:page.summary")}</h2>

                  {selectedRoomData && (
                    <div className="rounded-xl overflow-hidden">
                      <img src={selectedRoomData.images[0]} alt={selectedRoomName} className="w-full h-36 object-cover" loading="lazy" />
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    {selectedRoomData && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common:labels.room")}</span>
                        <span className="font-medium text-card-foreground">{selectedRoomName}</span>
                      </div>
                    )}
                    {checkIn && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common:labels.checkIn")}</span>
                        <span className="font-medium text-card-foreground">{format(checkIn, "d MMM yyyy", { locale: dateLocale })}</span>
                      </div>
                    )}
                    {checkOut && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common:labels.checkOut")}</span>
                        <span className="font-medium text-card-foreground">{format(checkOut, "d MMM yyyy", { locale: dateLocale })}</span>
                      </div>
                    )}
                    {nights > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("common:labels.duration")}</span>
                        <span className="font-medium text-card-foreground">{t("common:counts.nights", { count: nights })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("common:labels.guests")}</span>
                      <span className="font-medium text-card-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {guests}</span>
                    </div>
                  </div>

                  {nights > 0 && selectedRoomData && (
                    <>
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{t("booking:messages.priceBreakdown", { price: selectedRoomData.price, count: nights })}</span>
                          <span className="font-medium text-card-foreground">€{total}</span>
                        </div>
                      </div>
                      <div className="border-t pt-4 flex justify-between text-lg font-bold">
                        <span className="text-card-foreground">{t("common:labels.total")}</span>
                        <span className="text-primary">€{total}</span>
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? t("common:actions.processing") : t("common:actions.bookWithCard")}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("booking:messages.securePayment")}
                  </p>
                </div>
              </FadeIn>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Booking;
