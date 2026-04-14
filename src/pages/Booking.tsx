import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Users, AlertCircle } from "lucide-react";
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

import { useAvailability, useRoomsAvailability } from "@/hooks/useAvailability";
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { blockedDates } = useAvailability(selectedRoom);
  const { availableRooms, isLoading: isCheckingAvailability } = useRoomsAvailability(checkIn, checkOut);

  const handleRoomChange = (newRoomId: string) => {
    setSelectedRoom(newRoomId);
    if (selectedRoom && newRoomId !== selectedRoom) {
      setCheckIn(undefined);
      setCheckOut(undefined);
    }
  };

  useEffect(() => {
    if (checkIn && checkOut && selectedRoom && !availableRooms.has(selectedRoom) && !isCheckingAvailability) {
      setSelectedRoom("");
    }
  }, [availableRooms, checkIn, checkOut, isCheckingAvailability, selectedRoom]);

  const roomIsSelected = selectedRoom !== "";

  const nights = useMemo(() => {
    if (checkIn && checkOut) return differenceInDays(checkOut, checkIn);
    return 0;
  }, [checkIn, checkOut]);

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);
  const total = selectedRoomData ? selectedRoomData.price * nights : 0;
  const selectedRoomName = selectedRoomData ? t(`home:roomsData.${selectedRoomData.id}.name`) : "";

  const checkInRef = React.useRef<Date | undefined>(undefined);
  const checkOutRef = React.useRef<Date | undefined>(undefined);

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;

    const currentCheckIn = checkInRef.current;
    const currentCheckOut = checkOutRef.current;

    if (!currentCheckIn || (currentCheckIn && currentCheckOut)) {
      setCheckIn(date);
      setCheckOut(undefined);
      checkInRef.current = date;
      checkOutRef.current = undefined;
    } else {
      if (date.getTime() === currentCheckIn.getTime()) {
        setCheckIn(date);
        setCheckOut(undefined);
        checkInRef.current = date;
        checkOutRef.current = undefined;
      } else {
        setCheckOut(date);
        checkOutRef.current = date;
      }
    }
  };

  const isDateBlocked = (d: Date) => {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    return blockedDates.some(b => b.getTime() === dayStart.getTime());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoom) {
      toast.error(t("booking:toasts.selectRoomFirst", { defaultValue: "Seleziona prima una camera" }));
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error(t("booking:toasts.requiredFields"));
      return;
    }
    if (nights <= 0) {
      toast.error(t("booking:toasts.invalidDates"));
      return;
    }
    if (!name || !email) {
      toast.error(t("booking:toasts.requiredFields"));
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
        } else if (edgeError.includes("temporarily reserved")) {
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
      <div className="pt-20 md:pt-24 pb-16 md:pb-20 overflow-hidden">
        <div className="container mx-auto px-3 md:px-4 max-w-4xl">
          <div className="text-center mb-8 md:mb-12">
            <FadeIn direction="up">
              <p className="text-primary text-xs md:text-sm uppercase tracking-[0.2em] font-sans font-medium mb-2 md:mb-3">
                {t("booking:page.eyebrow")}
              </p>
              <h1 className="text-2xl md:text-3xl lg:text-5xl font-serif font-bold text-foreground">
                {t("booking:page.title")}
              </h1>
            </FadeIn>
          </div>

          <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-6 md:gap-8">
            <div className="lg:col-span-3 space-y-6">
              <FadeIn direction="right" delay={0.1}>
                <div className="bg-card rounded-2xl border p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-serif text-base md:text-lg font-bold text-card-foreground">{t("booking:page.dateAndRoom")}</h2>

                  <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-2">
                      <Label>{t("common:labels.room")} *</Label>
                      <Select value={selectedRoom} onValueChange={handleRoomChange}>
                        <SelectTrigger><SelectValue placeholder={t("booking:placeholders.selectRoom")} /></SelectTrigger>
                        <SelectContent>
                          {rooms.map((r) => {
                            const isAvailable = availableRooms.has(r.id);
                            return (
                              <SelectItem 
                                key={r.id} 
                                value={r.id}
                                disabled={checkIn && checkOut && !isAvailable}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{t(`home:roomsData.${r.id}.name`)}</span>
                                  {checkIn && checkOut && !isAvailable && (
                                    <span className="text-xs text-muted-foreground ml-2">(non disponibile)</span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isCheckingAvailability && checkIn && checkOut && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Controllo disponibilità...
                    </div>
                  )}

                  {checkIn && checkOut && !isCheckingAvailability && availableRooms.size === 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Nessuna camera disponibile per le date selezionate</span>
                    </div>
                  )}

                  {!roomIsSelected && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {t("booking:messages.selectRoomFirst", {
                          defaultValue: "Seleziona prima una camera per vedere le date disponibili"
                        })}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t("common:labels.dates")} *</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!roomIsSelected}
                          className={cn(
                            "w-full justify-between font-normal h-auto py-2.5 md:py-3 px-3 md:px-4 text-sm md:text-base",
                            !roomIsSelected && "text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-[#0071c2] shrink-0" />
                            {checkIn && checkOut ? (
                              <span className="truncate">
                                {format(checkIn, "d MMM", { locale: dateLocale })} - {format(checkOut, "d MMM yyyy", { locale: dateLocale })}
                                <span className="ml-1 md:ml-2 text-xs md:text-sm text-muted-foreground">
                                  ({nights} {nights === 1 ? "notte" : "notti"})
                                </span>
                              </span>
                            ) : checkIn ? (
                              <span className="truncate">{format(checkIn, "d MMM yyyy", { locale: dateLocale })} - ...</span>
                            ) : (
                              <span>{t("booking:messages.selectDates", { defaultValue: "Seleziona le date" })}</span>
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 md:p-2" align="start">
                        <Calendar
                          key={`range-${selectedRoom}`}
                          mode="single"
                          selected={checkIn}
                          onSelect={handleDayClick}
                          disabled={(d) => d < new Date() || isDateBlocked(d)}
                          modifiers={{
                            range: (date) => {
                              if (!checkIn || !checkOut) return false;
                              return date > checkIn && date < checkOut;
                            },
                            "range-start": (date) => checkIn && date.getTime() === checkIn.getTime(),
                            "range-end": (date) => checkOut && date.getTime() === checkOut.getTime(),
                          }}
                          modifiersClassNames={{
                            range: "bg-[#0071c2]/20 text-[#0071c2] rounded-none",
                            "range-start": "bg-[#0071c2] text-white rounded-l-md rounded-r-none",
                            "range-end": "bg-[#0071c2] text-white rounded-r-md rounded-l-none",
                          }}
                          locale={dateLocale}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </FadeIn>

              <FadeIn direction="right" delay={0.2}>
                <div className="bg-card rounded-2xl border p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-serif text-base md:text-lg font-bold text-card-foreground">{t("booking:page.yourDetails")}</h2>
                  <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
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

            <div className="lg:col-span-2">
              <FadeIn direction="left" delay={0.3}>
                <div className="bg-card rounded-2xl border p-4 md:p-6 sticky top-24 space-y-4 md:space-y-5">
                  <h2 className="font-serif text-lg font-bold text-card-foreground">{t("booking:page.summary")}</h2>

                  {selectedRoomData && (
                    <div className="rounded-xl overflow-hidden">
                      <img src={selectedRoomData.images[0]} alt={selectedRoomName} className="w-full h-28 md:h-36 object-cover" loading="lazy" />
                    </div>
                  )}

                  <div className="space-y-2 md:space-y-3 text-sm">
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
                      <div className="border-t pt-3 md:pt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{t("booking:messages.priceBreakdown", { price: selectedRoomData.price, count: nights })}</span>
                          <span className="font-medium text-card-foreground">€{total}</span>
                        </div>
                      </div>
                      <div className="border-t pt-3 md:pt-4 flex justify-between text-base md:text-lg font-bold">
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