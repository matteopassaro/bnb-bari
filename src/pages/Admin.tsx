import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, parseISO, isWithinInterval,
  startOfDay, addDays,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarIcon, Trash2, Lock, RefreshCw, LogOut,
  ChevronLeft, ChevronRight, Wifi, Search, Users,
  TrendingUp, BedDouble, ArrowUpRight, ArrowDownRight,
  ExternalLink, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  smoobu_reservation_id?: number;
  email_sent: boolean;
};

type SmoobuBooking = {
  smoobu_id: number;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guests: number;
  total_price: number;
  channel: string;
  source: "smoobu";
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

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid:      { label: "Pagato",     className: "bg-green-500 hover:bg-green-600 text-white" },
  pending:   { label: "In attesa",  className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  refunded:  { label: "Rimborsato", className: "bg-orange-500 hover:bg-orange-600 text-white" },
  expired:   { label: "Scaduto",    className: "bg-gray-400 hover:bg-gray-500 text-white" },
  cancelled: { label: "Annullato",  className: "bg-red-500 hover:bg-red-600 text-white" },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  stripe: { label: "Diretto",  color: "bg-green-100 text-green-800 border-green-200" },
  manual: { label: "Manuale",  color: "bg-orange-100 text-orange-800 border-orange-200" },
  ical:   { label: "Booking",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  smoobu: { label: "Booking.com", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const todayStr = format(new Date(), "yyyy-MM-dd");
const todayStart = startOfDay(new Date());

// ─── Login ───────────────────────────────────────────────────────────────────

const LoginForm = ({ onLogin }: { onLogin: (e: string, p: string) => Promise<void> }) => {
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
      toast({ title: "Accesso negato", description: "Credenziali non valide.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#003580] p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-[#003580] rounded-xl flex items-center justify-center mx-auto mb-3">
            <BedDouble className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">Extranet</h1>
          <p className="text-sm text-gray-500">Corte del Borgo Antico · Bari</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-lg" required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-lg" required />
          <Button type="submit" className="w-full h-11 rounded-lg bg-[#0071c2] hover:bg-[#005ea6]" disabled={isLoading}>
            <Lock className="w-4 h-4 mr-2" />
            {isLoading ? "Accesso..." : "Accedi"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── Today Panel ─────────────────────────────────────────────────────────────

const TodayPanel = ({ bookings, smoobuBookings }: { bookings: Booking[]; smoobuBookings: SmoobuBooking[] }) => {
  const stripeArrivalsToday = bookings.filter(b => b.payment_status === "paid" && b.check_in === todayStr);
  const stripeDeparturesToday = bookings.filter(b => b.payment_status === "paid" && b.check_out === todayStr);
  const smoobuArrivalsToday = smoobuBookings.filter(b => b.check_in === todayStr);
  const smoobuDeparturesToday = smoobuBookings.filter(b => b.check_out === todayStr);

  const totalArrivals = stripeArrivalsToday.length + smoobuArrivalsToday.length;
  const totalDepartures = stripeDeparturesToday.length + smoobuDeparturesToday.length;

  // Camere occupate oggi
  const occupiedRoomIds = new Set([
    ...bookings
      .filter(b => b.payment_status === "paid" && b.check_in <= todayStr && b.check_out > todayStr)
      .map(b => b.room_id),
    ...smoobuBookings
      .filter(b => b.check_in <= todayStr && b.check_out > todayStr)
      .map(b => b.room_id),
  ]);
  const occupiedRooms = occupiedRoomIds.size;
  const freeRooms = rooms.length - occupiedRooms;

  const stats = [
    { label: "Arrivi oggi", value: totalArrivals, icon: ArrowUpRight, color: "text-green-600", bg: "bg-green-50" },
    { label: "Partenze oggi", value: totalDepartures, icon: ArrowDownRight, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "In struttura", value: occupiedRooms, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Camere libere", value: freeRooms, icon: BedDouble, color: "text-primary", bg: "bg-accent" },
  ];

  return (
    <div className="bg-[#003580] rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg font-bold">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
          </h2>
          <p className="text-white/70 text-sm">Situazione di oggi</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-white/70 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Revenue Cards ────────────────────────────────────────────────────────────

const RevenueCards = ({ bookings, smoobuBookings }: { bookings: Booking[]; smoobuBookings: SmoobuBooking[] }) => {
  const paidStripe = bookings.filter(b => b.payment_status === "paid");
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalRevenue = paidStripe.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const smoobuRevenue = smoobuBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const monthRevenue = paidStripe
    .filter(b => isWithinInterval(parseISO(b.check_in), { start: monthStart, end: monthEnd }))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  const futureRevenue = paidStripe
    .filter(b => parseISO(b.check_in) > now)
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  const activeBookings = paidStripe.filter(b => parseISO(b.check_out) >= now).length + smoobuBookings.filter(b => parseISO(b.check_out) >= now).length;

  const cards = [
    { label: "Revenue diretto",   value: `€${totalRevenue}`,              sub: "Prenotazioni Stripe", icon: TrendingUp },
    { label: "Revenue OTA",       value: `€${smoobuRevenue}`,             sub: "Booking.com ecc.", icon: ExternalLink },
    { label: "Questo mese",       value: `€${monthRevenue}`,              sub: format(now, "MMMM yyyy", { locale: it }), icon: CalendarIcon },
    { label: "Prenotazioni att.", value: activeBookings,                   sub: "Check-out futuro", icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-2xl border p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <card.icon className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <p className="text-2xl font-serif font-bold text-primary">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Upcoming Arrivals ────────────────────────────────────────────────────────

const UpcomingArrivals = ({ bookings, smoobuBookings }: { bookings: Booking[]; smoobuBookings: SmoobuBooking[] }) => {
  const next7Days = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const upcoming = [
    ...bookings
      .filter(b => b.payment_status === "paid" && b.check_in > todayStr && b.check_in <= next7Days)
      .map(b => ({ name: b.customer_name, room: b.room_name, check_in: b.check_in, source: "stripe" as const })),
    ...smoobuBookings
      .filter(b => b.check_in > todayStr && b.check_in <= next7Days)
      .map(b => ({ name: b.guest_name, room: b.room_name, check_in: b.check_in, source: "smoobu" as const })),
  ].sort((a, b) => a.check_in.localeCompare(b.check_in));

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border p-5">
      <h3 className="font-serif font-bold text-base mb-4 flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-primary" />
        Prossimi arrivi (7 giorni)
      </h3>
      <div className="space-y-2">
        {upcoming.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.room}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {format(parseISO(item.check_in), "d MMM", { locale: it })}
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SOURCE_CONFIG[item.source].color}`}>
                {SOURCE_CONFIG[item.source].label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Calendario visivo ────────────────────────────────────────────────────────

const VisualCalendar = ({
  blockedDates, bookings, onBlockDates,
}: {
  blockedDates: BlockedDate[];
  bookings: Booking[];
  onBlockDates: (roomId: string, from: string, to: string) => Promise<void>;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0].id);
  const [selecting, setSelecting] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [isBlocking, setIsBlocking] = useState(false);
  const { toast } = useToast();

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7;

  const getDateInfo = (date: Date): DateInfo => {
    const dateStr = format(date, "yyyy-MM-dd");
    const blocked = blockedDates.find(b => b.room_id === selectedRoom && dateStr >= b.date_from && dateStr <= b.date_to);
    if (blocked) return { blocked: true, source: blocked.source, blockId: blocked.id };
    const booking = bookings.find(b => b.room_id === selectedRoom && b.payment_status === "paid" && dateStr >= b.check_in && dateStr < b.check_out);
    if (booking) return { blocked: true, source: "stripe", guest: booking.customer_name };
    return { blocked: false };
  };

  const handleDayClick = (dateStr: string, date: Date) => {
    if (startOfDay(date) < todayStart) return;
    if (!selecting.from) {
      setSelecting({ from: dateStr, to: null });
    } else if (!selecting.to && dateStr > selecting.from) {
      setSelecting(prev => ({ ...prev, to: dateStr }));
    } else {
      setSelecting({ from: dateStr, to: null });
    }
  };

  const handleBlock = async () => {
    if (!selecting.from || !selecting.to) return;
    if (selecting.from >= selecting.to) {
      toast({ title: "Date non valide", description: "Il check-out deve essere dopo il check-in.", variant: "destructive" });
      return;
    }
    setIsBlocking(true);
    try {
      await onBlockDates(selectedRoom, selecting.from, selecting.to);
      toast({ title: "Date bloccate", description: `${rooms.find(r => r.id === selectedRoom)?.name}: ${selecting.from} → ${selecting.to}` });
      setSelecting({ from: null, to: null });
    } catch {
      toast({ title: "Errore", description: "Impossibile bloccare le date.", variant: "destructive" });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select
          value={selectedRoom}
          onChange={(e) => { setSelectedRoom(e.target.value); setSelecting({ from: null, to: null }); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 min-w-[130px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: it })}
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-3 text-xs flex-wrap">
        {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
          <span key={key} className={`px-2 py-1 rounded-full border ${val.color}`}>{val.label}</span>
        ))}
        <span className="px-2 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">Selezione</span>
        <span className="px-2 py-1 rounded-full border bg-gray-100 text-gray-400 border-gray-200">Passato</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const info = getDateInfo(day);
          const isPast = startOfDay(day) < todayStart;
          const isSelected = selecting.from && selecting.to
            ? dateStr >= selecting.from && dateStr <= selecting.to
            : dateStr === selecting.from;
          const sourceStyle = info.blocked ? SOURCE_CONFIG[info.source]?.color ?? "bg-gray-100 text-gray-600" : "";
          const tooltip = info.blocked
            ? (info.source === "stripe" && info.guest ? `Ospite: ${info.guest}` : SOURCE_CONFIG[info.source]?.label ?? info.source)
            : isPast ? "Passato" : "Clicca";
          return (
            <button
              key={dateStr}
              onClick={() => !info.blocked && !isPast && handleDayClick(dateStr, day)}
              title={tooltip}
              disabled={info.blocked || isPast}
              className={[
                "aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center",
                isToday(day) ? "ring-2 ring-primary ring-offset-1" : "",
                isPast ? "opacity-25 cursor-not-allowed text-gray-400"
                  : info.blocked ? `${sourceStyle} cursor-not-allowed opacity-80`
                  : "hover:bg-secondary cursor-pointer",
                isSelected && !info.blocked && !isPast ? "!bg-primary !text-primary-foreground" : "",
                !isSameMonth(day, currentMonth) ? "opacity-20" : "",
              ].filter(Boolean).join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {selecting.from && selecting.to && (
        <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl border flex-wrap">
          <p className="text-sm flex-1">
            Blocca <strong>{rooms.find(r => r.id === selectedRoom)?.name}</strong>{" "}
            dal <strong>{selecting.from}</strong> al <strong>{selecting.to}</strong>
          </p>
          <Button size="sm" onClick={handleBlock} disabled={isBlocking} className="rounded-lg">
            {isBlocking ? "..." : "Conferma"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelecting({ from: null, to: null })}>Annulla</Button>
        </div>
      )}
    </div>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

const AdminDashboard = ({ onSignOut }: { onSignOut: () => void }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [smoobuBookings, setSmoobuBookings] = useState<SmoobuBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingSmoobu, setIsSyncingSmoobu] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const syncSmoobu = async () => {
    setIsSyncingSmoobu(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smoobu-sync-reservations`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSmoobuBookings(data.reservations ?? []);
      // Aggiorna anche blocked_dates dopo sync
      const { data: d } = await supabase.from("blocked_dates").select("*").order("date_from", { ascending: false });
      setBlockedDates(d ?? []);
      toast({ title: "Sync Smoobu completato", description: `${data.total_external ?? 0} prenotazioni esterne` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore sync";
      toast({ title: "Errore sync Smoobu", description: message, variant: "destructive" });
    } finally {
      setIsSyncingSmoobu(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, payload => {
        if (payload.eventType === "INSERT") setBookings(prev => [payload.new as Booking, ...prev]);
        if (payload.eventType === "UPDATE") setBookings(prev => prev.map(b => b.id === (payload.new as Booking).id ? payload.new as Booking : b));
        if (payload.eventType === "DELETE") setBookings(prev => prev.filter(b => b.id !== (payload.old as { id: string }).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_dates" }, payload => {
        if (payload.eventType === "INSERT") setBlockedDates(prev => [payload.new as BlockedDate, ...prev]);
        if (payload.eventType === "UPDATE") setBlockedDates(prev => prev.map(d => d.id === (payload.new as BlockedDate).id ? payload.new as BlockedDate : d));
        if (payload.eventType === "DELETE") setBlockedDates(prev => prev.filter(d => d.id !== (payload.old as { id: string }).id));
      })
      .subscribe(status => setIsLive(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleBlockDates = async (roomId: string, from: string, to: string) => {
    const { error } = await supabase.from("blocked_dates").insert({ room_id: roomId, date_from: from, date_to: to, source: "manual" });
    if (error) throw error;
  };

  const handleDeleteBlock = async (id: string, source: string) => {
    if (source === "ical") {
      toast({ title: "Non consentito", description: "Le date da Booking.com si aggiornano automaticamente.", variant: "destructive" });
      return;
    }
    if (!confirm("Eliminare questo blocco?")) return;
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
    else toast({ title: "Blocco eliminato" });
  };

  const handleRefund = async (booking: Booking) => {
    if (!confirm(`Rimborsare €${booking.total_price} a ${booking.customer_name}?`)) return;
    setRefundingId(booking.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessione non valida");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore sconosciuto");
      toast({ title: "Rimborso avviato", description: "Email di conferma inviata al cliente." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      toast({ title: "Errore rimborso", description: message, variant: "destructive" });
    } finally {
      setRefundingId(null);
    }
  };

  // Bookings filtrati
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = !search ||
        b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        b.customer_email.toLowerCase().includes(search.toLowerCase()) ||
        b.room_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.payment_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const filteredSmoobu = useMemo(() => {
    if (!search) return smoobuBookings;
    return smoobuBookings.filter(b =>
      b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      b.room_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [smoobuBookings, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#003580] text-white px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BedDouble className="w-5 h-5 text-white/80" />
            <span className="font-serif font-bold text-base">Corte del Borgo Antico</span>
            <span className="text-white/40 hidden sm:block">·</span>
            <span className="text-white/70 text-sm hidden sm:block">Extranet</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full ${isLive ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"}`}>
              <Wifi className="w-3 h-3" /> {isLive ? "Live" : "..."}
            </span>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg" onClick={onSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-5">

        {/* Today */}
        <TodayPanel bookings={bookings} smoobuBookings={smoobuBookings} />

        {/* Revenue */}
        <RevenueCards bookings={bookings} smoobuBookings={smoobuBookings} />

        {/* Upcoming + Sync */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <UpcomingArrivals bookings={bookings} smoobuBookings={smoobuBookings} />
          </div>
          <div className="bg-card rounded-2xl border p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base mb-2">Sync Booking.com</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Importa le prenotazioni da Booking.com via Smoobu e aggiorna le date bloccate.
              </p>
            </div>
            <Button onClick={syncSmoobu} disabled={isSyncingSmoobu} className="w-full rounded-xl bg-[#0071c2] hover:bg-[#005ea6]">
              <RotateCcw className={`w-4 h-4 mr-2 ${isSyncingSmoobu ? "animate-spin" : ""}`} />
              {isSyncingSmoobu ? "Sincronizzazione..." : "Sincronizza ora"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="prenotazioni">
          <TabsList className="bg-white border rounded-xl p-1 h-auto gap-1">
            <TabsTrigger value="prenotazioni" className="rounded-lg data-[state=active]:bg-[#003580] data-[state=active]:text-white">
              Prenotazioni
            </TabsTrigger>
            <TabsTrigger value="booking-ota" className="rounded-lg data-[state=active]:bg-[#003580] data-[state=active]:text-white">
              Booking OTA
              {smoobuBookings.length > 0 && (
                <span className="ml-1.5 bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {smoobuBookings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendario" className="rounded-lg data-[state=active]:bg-[#003580] data-[state=active]:text-white">
              Calendario
            </TabsTrigger>
            <TabsTrigger value="blocchi" className="rounded-lg data-[state=active]:bg-[#003580] data-[state=active]:text-white">
              Date bloccate
            </TabsTrigger>
          </TabsList>

          {/* ── Prenotazioni dirette ─────────────────────────────────────── */}
          <TabsContent value="prenotazioni" className="mt-4">
            <div className="bg-card rounded-2xl border">
              <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per ospite, email, camera..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 rounded-lg"
                  />
                </div>
                <div className="flex gap-1.5">
                  {["all", "paid", "pending", "refunded", "expired"].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === s
                          ? "bg-[#003580] text-white"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {s === "all" ? "Tutte" : STATUS_CONFIG[s]?.label ?? s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Ospite</TableHead>
                      <TableHead className="text-xs">Camera</TableHead>
                      <TableHead className="text-xs">Soggiorno</TableHead>
                      <TableHead className="text-xs">Totale</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Nessuna prenotazione trovata</TableCell></TableRow>
                    ) : filteredBookings.map(b => {
                      const cfg = STATUS_CONFIG[b.payment_status];
                      return (
                        <TableRow key={b.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(b.created_at), "dd MMM yy", { locale: it })}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{b.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                            {b.customer_phone && <div className="text-xs text-muted-foreground">{b.customer_phone}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{b.room_name}</TableCell>
                          <TableCell className="text-sm">
                            <div>{format(new Date(b.check_in), "dd/MM/yy")}</div>
                            <div className="text-muted-foreground">→ {format(new Date(b.check_out), "dd/MM/yy")}</div>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">€{b.total_price}</TableCell>
                          <TableCell>
                            {cfg ? <Badge className={`${cfg.className} text-[10px]`}>{cfg.label}</Badge>
                              : <Badge variant="outline" className="text-[10px]">{b.payment_status}</Badge>}
                          </TableCell>
                          <TableCell>
                            {b.payment_status === "paid" && b.stripe_payment_intent_id && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs h-7 px-2"
                                disabled={refundingId === b.id}
                                onClick={() => handleRefund(b)}
                              >
                                {refundingId === b.id ? "..." : "Rimborsa"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── Booking OTA (Smoobu) ─────────────────────────────────────── */}
          <TabsContent value="booking-ota" className="mt-4">
            <div className="bg-card rounded-2xl border">
              <div className="p-4 border-b flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Prenotazioni da Booking.com, Airbnb e altri canali via Smoobu.
                </p>
                <Button size="sm" variant="outline" onClick={syncSmoobu} disabled={isSyncingSmoobu} className="rounded-lg text-xs h-8">
                  <RotateCcw className={`w-3 h-3 mr-1.5 ${isSyncingSmoobu ? "animate-spin" : ""}`} />
                  Aggiorna
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="text-xs">Ospite</TableHead>
                      <TableHead className="text-xs">Camera</TableHead>
                      <TableHead className="text-xs">Soggiorno</TableHead>
                      <TableHead className="text-xs">Totale</TableHead>
                      <TableHead className="text-xs">Canale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSmoobu.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          {smoobuBookings.length === 0
                            ? "Clicca 'Sincronizza ora' per importare le prenotazioni da Smoobu"
                            : "Nessuna prenotazione trovata"}
                        </TableCell>
                      </TableRow>
                    ) : filteredSmoobu.map(b => (
                      <TableRow key={b.smoobu_id} className="hover:bg-gray-50/50">
                        <TableCell>
                          <div className="font-medium text-sm">{b.guest_name}</div>
                          {b.guest_email && <div className="text-xs text-muted-foreground">{b.guest_email}</div>}
                          {b.guest_phone && <div className="text-xs text-muted-foreground">{b.guest_phone}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{b.room_name}</TableCell>
                        <TableCell className="text-sm">
                          <div>{format(new Date(b.check_in), "dd/MM/yy")}</div>
                          <div className="text-muted-foreground">→ {format(new Date(b.check_out), "dd/MM/yy")}</div>
                        </TableCell>
                        <TableCell className="font-semibold text-sm">€{b.total_price}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_CONFIG["smoobu"].color}`}>
                            {b.channel || "OTA"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── Calendario ───────────────────────────────────────────────── */}
          <TabsContent value="calendario" className="mt-4">
            <div className="bg-card rounded-2xl border p-6">
              <h2 className="font-serif text-lg font-bold mb-5 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" /> Calendario disponibilità
              </h2>
              <VisualCalendar blockedDates={blockedDates} bookings={bookings} onBlockDates={handleBlockDates} />
            </div>
          </TabsContent>

          {/* ── Date bloccate ─────────────────────────────────────────────── */}
          <TabsContent value="blocchi" className="mt-4">
            <div className="bg-card rounded-2xl border">
              <div className="p-4 border-b">
                <h2 className="font-serif font-bold">Date bloccate</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stripe = prenotazioni dirette · Booking = da Smoobu/iCal · Manuale = bloccate dall'admin
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="text-xs">Camera</TableHead>
                      <TableHead className="text-xs">Dal</TableHead>
                      <TableHead className="text-xs">Al</TableHead>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedDates.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Nessuna data bloccata</TableCell></TableRow>
                    ) : blockedDates.map(block => {
                      const src = SOURCE_CONFIG[block.source];
                      const roomName = rooms.find(r => r.id === (block.room_id as RoomId))?.name ?? block.room_id;
                      return (
                        <TableRow key={block.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-sm font-medium">{roomName}</TableCell>
                          <TableCell className="text-sm">{format(new Date(block.date_from), "dd MMM yyyy", { locale: it })}</TableCell>
                          <TableCell className="text-sm">{format(new Date(block.date_to), "dd MMM yyyy", { locale: it })}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${src?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                              {src?.label ?? block.source}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {block.source !== "ical" && (
                              <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7" onClick={() => handleDeleteBlock(block.id, block.source)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

// ─── Export ───────────────────────────────────────────────────────────────────

const Admin = () => {
  const { session, isLoading, signIn, signOut } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#003580]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!session) return <LoginForm onLogin={signIn} />;
  return <AdminDashboard onSignOut={signOut} />;
};

export default Admin;