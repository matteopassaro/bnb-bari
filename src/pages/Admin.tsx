import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarIcon,
  Trash2,
  Lock,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { rooms, type RoomId } from "@/data/rooms";

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  created_at: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_price: number;
  payment_status: string;
  stripe_payment_intent_id: string;
  email_sent: boolean;
};

type BlockedDate = {
  id: string;
  room_id: string;
  date_from: string;
  date_to: string;
  source: string;
};

type DateInfo =
  | { blocked: false }
  | { blocked: true; source: string; blockId?: string; guest?: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid:      { label: "Pagato",     className: "bg-green-500 hover:bg-green-600 text-white" },
  pending:   { label: "In attesa",  className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  refunded:  { label: "Rimborsato", className: "bg-orange-500 hover:bg-orange-600 text-white" },
  expired:   { label: "Scaduto",    className: "bg-gray-400 hover:bg-gray-500 text-white" },
  cancelled: { label: "Annullato",  className: "bg-red-500 hover:bg-red-600 text-white" },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  stripe: { label: "Stripe",  color: "bg-green-100 text-green-800 border-green-200" },
  manual: { label: "Manuale", color: "bg-orange-100 text-orange-800 border-orange-200" },
  ical:   { label: "Booking", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const today = startOfDay(new Date());

// ─── Login ───────────────────────────────────────────────────────────────────

const LoginForm = ({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch {
      toast({
        title: "Accesso negato",
        description: "Credenziali non valide.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/20 p-4">
      <div className="w-full max-w-sm bg-card p-8 rounded-3xl shadow-xl space-y-6 border">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold text-primary">Admin</h1>
          <p className="text-sm text-muted-foreground">Corte del Borgo Antico</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={isLoading}>
            <Lock className="w-4 h-4 mr-2" />
            {isLoading ? "Accesso..." : "Accedi"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── Revenue Cards ────────────────────────────────────────────────────────────

const RevenueCards = ({ bookings }: { bookings: Booking[] }) => {
  const paid = bookings.filter((b) => b.payment_status === "paid");
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalRevenue = paid.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const activeBookings = paid.filter((b) => parseISO(b.check_out) >= now).length;
  const monthRevenue = paid
    .filter((b) =>
      isWithinInterval(parseISO(b.check_in), { start: monthStart, end: monthEnd })
    )
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  const futureRevenue = paid
    .filter((b) => parseISO(b.check_in) > now)
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const cards = [
    { label: "Totale incassato",    value: `€${totalRevenue}`,  sub: "da sempre" },
    { label: "Prenotazioni attive", value: activeBookings,       sub: "ancora in corso" },
    { label: "Revenue questo mese", value: `€${monthRevenue}`,  sub: format(now, "MMMM yyyy", { locale: it }) },
    { label: "Revenue futuro",      value: `€${futureRevenue}`, sub: "prenotazioni confermate" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-2xl border p-5 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {card.label}
          </p>
          <p className="text-2xl font-serif font-bold text-primary">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Calendario visivo ────────────────────────────────────────────────────────

const VisualCalendar = ({
  blockedDates,
  bookings,
  onBlockDates,
}: {
  blockedDates: BlockedDate[];
  bookings: Booking[];
  onBlockDates: (roomId: string, from: string, to: string) => Promise<void>;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0].id);
  const [selecting, setSelecting] = useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });
  const [isBlocking, setIsBlocking] = useState(false);
  const { toast } = useToast();

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7;

  const getDateInfo = (date: Date): DateInfo => {
    const dateStr = format(date, "yyyy-MM-dd");

    const blocked = blockedDates.find(
      (b) =>
        b.room_id === selectedRoom &&
        dateStr >= b.date_from &&
        dateStr <= b.date_to
    );
    if (blocked)
      return { blocked: true, source: blocked.source, blockId: blocked.id };

    const booking = bookings.find(
      (b) =>
        b.room_id === selectedRoom &&
        b.payment_status === "paid" &&
        dateStr >= b.check_in &&
        dateStr < b.check_out
    );
    if (booking)
      return { blocked: true, source: "stripe", guest: booking.customer_name };

    return { blocked: false };
  };

  const handleDayClick = (dateStr: string, date: Date) => {
    if (startOfDay(date) < today) return;

    if (!selecting.from) {
      setSelecting({ from: dateStr, to: null });
    } else if (!selecting.to && dateStr > selecting.from) {
      setSelecting((prev) => ({ ...prev, to: dateStr }));
    } else {
      setSelecting({ from: dateStr, to: null });
    }
  };

  const handleBlock = async () => {
    if (!selecting.from || !selecting.to) return;

    if (selecting.from >= selecting.to) {
      toast({
        title: "Date non valide",
        description: "Il check-out deve essere successivo al check-in.",
        variant: "destructive",
      });
      return;
    }

    setIsBlocking(true);
    try {
      await onBlockDates(selectedRoom, selecting.from, selecting.to);
      const roomName = rooms.find((r) => r.id === selectedRoom)?.name ?? selectedRoom;
      toast({
        title: "Date bloccate",
        description: `${roomName}: ${selecting.from} → ${selecting.to}`,
      });
      setSelecting({ from: null, to: null });
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile bloccare le date.",
        variant: "destructive",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="bg-card rounded-3xl border p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-serif text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" /> Calendario disponibilità
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedRoom}
            onChange={(e) => {
              setSelectedRoom(e.target.value);
              setSelecting({ from: null, to: null });
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() =>
                setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3 min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: it })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() =>
                setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-3 text-xs flex-wrap">
        {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
          <span key={key} className={`px-2 py-1 rounded-full border ${val.color}`}>
            {val.label}
          </span>
        ))}
        <span className="px-2 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
          Selezionato
        </span>
        <span className="px-2 py-1 rounded-full border bg-gray-100 text-gray-400 border-gray-200">
          Passato
        </span>
      </div>

      {/* Griglia */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const info = getDateInfo(day);
          const isPast = startOfDay(day) < today;

          const isSelected =
            selecting.from && selecting.to
              ? dateStr >= selecting.from && dateStr <= selecting.to
              : dateStr === selecting.from;

          const sourceStyle = info.blocked
            ? SOURCE_CONFIG[info.source]?.color ?? "bg-gray-100 text-gray-600"
            : "";

          const tooltip = info.blocked
            ? info.source === "stripe" && info.guest
              ? `Ospite: ${info.guest}`
              : SOURCE_CONFIG[info.source]?.label ?? info.source
            : isPast
            ? "Data passata"
            : "Clicca per selezionare";

          return (
            <button
              key={dateStr}
              onClick={() => !info.blocked && !isPast && handleDayClick(dateStr, day)}
              title={tooltip}
              disabled={info.blocked || isPast}
              className={[
                "aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center",
                isToday(day) ? "ring-2 ring-primary ring-offset-1" : "",
                isPast
                  ? "opacity-25 cursor-not-allowed text-gray-400"
                  : info.blocked
                  ? `${sourceStyle} cursor-not-allowed opacity-80`
                  : "hover:bg-secondary cursor-pointer",
                isSelected && !info.blocked && !isPast
                  ? "!bg-primary !text-primary-foreground"
                  : "",
                !isSameMonth(day, currentMonth) ? "opacity-20" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Conferma blocco */}
      {selecting.from && selecting.to && (
        <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl border flex-wrap">
          <p className="text-sm flex-1">
            Blocca{" "}
            <strong>{rooms.find((r) => r.id === selectedRoom)?.name ?? selectedRoom}</strong>{" "}
            dal <strong>{selecting.from}</strong> al <strong>{selecting.to}</strong>
          </p>
          <Button size="sm" onClick={handleBlock} disabled={isBlocking} className="rounded-xl">
            {isBlocking ? "Salvataggio..." : "Conferma blocco"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelecting({ from: null, to: null })}
          >
            Annulla
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

const AdminDashboard = ({ onSignOut }: { onSignOut: () => void }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: b, error: be }, { data: d, error: de }] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("blocked_dates").select("*").order("date_from", { ascending: false }),
      ]);
      if (be) throw be;
      if (de) throw de;
      setBookings(b ?? []);
      setBlockedDates(d ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast({ title: "Errore caricamento", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "INSERT")
            setBookings((prev) => [payload.new as Booking, ...prev]);
          if (payload.eventType === "UPDATE")
            setBookings((prev) =>
              prev.map((b) =>
                b.id === (payload.new as Booking).id ? (payload.new as Booking) : b
              )
            );
          if (payload.eventType === "DELETE")
            setBookings((prev) =>
              prev.filter((b) => b.id !== (payload.old as { id: string }).id)
            );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_dates" },
        (payload) => {
          if (payload.eventType === "INSERT")
            setBlockedDates((prev) => [payload.new as BlockedDate, ...prev]);
          if (payload.eventType === "UPDATE")
            setBlockedDates((prev) =>
              prev.map((d) =>
                d.id === (payload.new as BlockedDate).id
                  ? (payload.new as BlockedDate)
                  : d
              )
            );
          if (payload.eventType === "DELETE")
            setBlockedDates((prev) =>
              prev.filter((d) => d.id !== (payload.old as { id: string }).id)
            );
        }
      )
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleBlockDates = async (roomId: string, from: string, to: string) => {
    const { error } = await supabase.from("blocked_dates").insert({
      room_id: roomId,
      date_from: from,
      date_to: to,
      source: "manual",
    });
    if (error) throw error;
  };

  const handleDeleteBlock = async (id: string, source: string) => {
    if (source === "ical") {
      toast({
        title: "Non consentito",
        description: "Le date da Booking.com si aggiornano automaticamente.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm("Eliminare questo blocco?")) return;
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Blocco eliminato" });
    }
  };

  // CORRETTO: usa fetch con Authorization header
  // NON cancella blocked_dates dal frontend — ci pensa il webhook charge.refunded
  // NON usa supabase.functions.invoke che non passa il token correttamente
  const handleRefund = async (booking: Booking) => {
    if (!confirm(`Rimborsare €${booking.total_price} a ${booking.customer_name}?`)) return;
    setRefundingId(booking.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessione non valida. Effettua il login di nuovo.");
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ booking_id: booking.id }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore sconosciuto");

      toast({
        title: "Rimborso avviato",
        description: "Il cliente riceverà una email di conferma. Le date verranno liberate automaticamente.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast({ title: "Errore rimborso", description: message, variant: "destructive" });
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/10 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-primary">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Corte del Borgo Antico</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
                isLive
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              <Wifi className="w-3 h-3" />
              {isLive ? "Live" : "Connessione..."}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground"
              onClick={onSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" /> Esci
            </Button>
          </div>
        </div>

        {/* Revenue */}
        <RevenueCards bookings={bookings} />

        {/* Calendario */}
        <VisualCalendar
          blockedDates={blockedDates}
          bookings={bookings}
          onBlockDates={handleBlockDates}
        />

        {/* Tabella prenotazioni */}
        <div className="bg-card rounded-3xl border p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold">Prenotazioni</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ospite</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Soggiorno</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nessuna prenotazione
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => {
                    const cfg = STATUS_CONFIG[b.payment_status];
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="text-sm">
                          {format(new Date(b.created_at), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{b.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                          {b.customer_phone && (
                            <div className="text-xs text-muted-foreground">{b.customer_phone}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{b.room_name}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(b.check_in), "dd/MM")} →{" "}
                          {format(new Date(b.check_out), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="font-medium">€{b.total_price}</TableCell>
                        <TableCell>
                          {cfg ? (
                            <Badge className={cfg.className}>{cfg.label}</Badge>
                          ) : (
                            <Badge variant="outline">{b.payment_status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {b.payment_status === "paid" && b.stripe_payment_intent_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs"
                              disabled={refundingId === b.id}
                              onClick={() => handleRefund(b)}
                            >
                              {refundingId === b.id ? "..." : "Rimborsa"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Date bloccate */}
        <div className="bg-card rounded-3xl border p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold">Date bloccate</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camera</TableHead>
                  <TableHead>Dal</TableHead>
                  <TableHead>Al</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedDates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nessuna data bloccata
                    </TableCell>
                  </TableRow>
                ) : (
                  blockedDates.map((block) => {
                    const src = SOURCE_CONFIG[block.source];
                    const roomName =
                      rooms.find((r) => r.id === (block.room_id as RoomId))?.name ??
                      block.room_id;
                    return (
                      <TableRow key={block.id}>
                        <TableCell className="text-sm font-medium">{roomName}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(block.date_from), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(block.date_to), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-1 rounded-full border font-medium ${
                              src?.color ?? "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {src?.label ?? block.source}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {block.source !== "ical" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                              onClick={() => handleDeleteBlock(block.id, block.source)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

const Admin = () => {
  const { session, isLoading, signIn, signOut } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <LoginForm onLogin={signIn} />;

  return <AdminDashboard onSignOut={signOut} />;
};

export default Admin;