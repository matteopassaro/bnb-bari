/**
 * Admin Extranet — Corte del Borgo Antico
 *
 * PREDISPOSTO PER MULTI-TENANT:
 * Quando migrerai a multi-tenant, sostituisci PROPERTY_CONFIG con i dati
 * del tenant corrente presi da Supabase, e aggiungi .eq("tenant_id", tenantId)
 * a tutte le query Supabase.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, parseISO, isWithinInterval,
  startOfDay, addDays, differenceInCalendarDays,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarIcon, Trash2, Lock, RefreshCw, LogOut,
  ChevronLeft, ChevronRight, Wifi, Search, Users,
  BedDouble, ArrowUpRight, ArrowDownRight, RotateCcw,
  Phone, Mail, CreditCard, AlertCircle, CheckCircle2,
  Clock, Activity, Euro, Filter, X, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { rooms, type RoomId } from "@/data/rooms";

// ─── Multi-tenant config (sostituire con dati da DB nella versione SaaS) ──────
const PROPERTY_CONFIG = {
  name: "Corte del Borgo Antico",
  location: "Bari, Puglia",
  totalRooms: rooms.length,
};

// ─── Tipi ────────────────────────────────────────────────────────────────────

type PaymentStatus = "paid" | "pending" | "refunded" | "expired" | "cancelled";

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
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string;
  smoobu_reservation_id?: number;
  email_sent: boolean;
  notes?: string;
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

type TimelineEvent = {
  id: string;
  type: "booking_created" | "payment_confirmed" | "refund" | "booking_expired" | "dates_blocked" | "dates_freed" | "smoobu_sync";
  title: string;
  subtitle: string;
  timestamp: string;
  source: "stripe" | "smoobu" | "manual" | "system";
  metadata?: Record<string, string | number>;
};

type DateInfo =
  | { blocked: false }
  | { blocked: true; source: string; blockId?: string; guest?: string };

// ─── Costanti ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: typeof CheckCircle2 }> = {
  paid:      { label: "Pagato",     badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending:   { label: "In attesa",  badge: "bg-amber-50 text-amber-700 border-amber-200",       icon: Clock },
  refunded:  { label: "Rimborsato", badge: "bg-orange-50 text-orange-700 border-orange-200",    icon: RefreshCw },
  expired:   { label: "Scaduto",    badge: "bg-gray-100 text-gray-500 border-gray-200",         icon: X },
  cancelled: { label: "Annullato",  badge: "bg-red-50 text-red-700 border-red-200",             icon: X },
};

const SOURCE_BADGE: Record<string, string> = {
  stripe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  manual: "bg-amber-50 text-amber-700 border-amber-200",
  ical:   "bg-blue-50 text-blue-700 border-blue-200",
  smoobu: "bg-blue-50 text-blue-700 border-blue-200",
};

const SOURCE_LABEL: Record<string, string> = {
  stripe: "Diretto",
  manual: "Manuale",
  ical:   "Booking.com",
  smoobu: "Booking.com",
};

const EVENT_ICON: Record<TimelineEvent["type"], typeof CheckCircle2> = {
  booking_created:   Clock,
  payment_confirmed: CheckCircle2,
  refund:            RefreshCw,
  booking_expired:   X,
  dates_blocked:     CalendarIcon,
  dates_freed:       CalendarIcon,
  smoobu_sync:       RotateCcw,
};

const EVENT_COLOR: Record<TimelineEvent["type"], string> = {
  booking_created:   "bg-blue-100 text-blue-600",
  payment_confirmed: "bg-emerald-100 text-emerald-600",
  refund:            "bg-orange-100 text-orange-600",
  booking_expired:   "bg-gray-100 text-gray-500",
  dates_blocked:     "bg-amber-100 text-amber-600",
  dates_freed:       "bg-teal-100 text-teal-600",
  smoobu_sync:       "bg-purple-100 text-purple-600",
};

const todayStr = format(new Date(), "yyyy-MM-dd");
const todayStart = startOfDay(new Date());

// ─── Utils ───────────────────────────────────────────────────────────────────

const nights = (checkIn: string, checkOut: string) =>
  differenceInCalendarDays(new Date(checkOut), new Date(checkIn));

const roomName = (id: string) =>
  rooms.find(r => r.id === (id as RoomId))?.name ?? id;

const avatar = (name: string) =>
  name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");

// ─── Login ───────────────────────────────────────────────────────────────────

const LoginForm = ({ onLogin }: { onLogin: (e: string, p: string) => Promise<void> }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await onLogin(email, password); }
    catch { toast({ title: "Accesso negato", description: "Credenziali non valide.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#003580] p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-[#003580] rounded-xl flex items-center justify-center mx-auto mb-3">
            <BedDouble className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">Extranet</h1>
          <p className="text-sm text-gray-500">{PROPERTY_CONFIG.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-lg" required />
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-lg" required />
          <Button type="submit" className="w-full h-11 rounded-lg bg-[#0071c2] hover:bg-[#005ea6]" disabled={loading}>
            <Lock className="w-4 h-4 mr-2" />
            {loading ? "Accesso..." : "Accedi"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── Header Stats (Today + Revenue unificati) ─────────────────────────────────

const HeaderStats = ({
  bookings,
  smoobuBookings,
  lastSync,
  isSyncing,
  onSync,
  isLive,
  onRefresh,
  isLoading,
  onSignOut,
}: {
  bookings: Booking[];
  smoobuBookings: SmoobuBooking[];
  lastSync: Date | null;
  isSyncing: boolean;
  onSync: () => void;
  isLive: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  onSignOut: () => void;
}) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Today
  const allArrivalsToday = [
    ...bookings.filter(b => b.payment_status === "paid" && b.check_in === todayStr),
    ...smoobuBookings.filter(b => b.check_in === todayStr),
  ];
  const allDeparturesToday = [
    ...bookings.filter(b => b.payment_status === "paid" && b.check_out === todayStr),
    ...smoobuBookings.filter(b => b.check_out === todayStr),
  ];
  const occupiedRoomIds = new Set([
    ...bookings.filter(b => b.payment_status === "paid" && b.check_in <= todayStr && b.check_out > todayStr).map(b => b.room_id),
    ...smoobuBookings.filter(b => b.check_in <= todayStr && b.check_out > todayStr).map(b => b.room_id),
  ]);

  // Revenue
  const paidBookings = bookings.filter(b => b.payment_status === "paid");
  const directRevenue = paidBookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const monthRevenue = paidBookings
    .filter(b => isWithinInterval(parseISO(b.check_in), { start: monthStart, end: monthEnd }))
    .reduce((s, b) => s + (b.total_price || 0), 0);
  const futureRevenue = paidBookings
    .filter(b => parseISO(b.check_in) > now)
    .reduce((s, b) => s + (b.total_price || 0), 0);

  const occupancy = Math.round((occupiedRoomIds.size / PROPERTY_CONFIG.totalRooms) * 100);

  return (
    <div className="bg-[#003580] rounded-2xl overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <BedDouble className="w-5 h-5 text-white/70" />
          <div>
            <p className="text-white font-semibold text-sm leading-none">{PROPERTY_CONFIG.name}</p>
            <p className="text-white/50 text-xs mt-0.5">{PROPERTY_CONFIG.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Live indicator */}
          <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${isLive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"}`}>
            <Wifi className="w-3 h-3" /> {isLive ? "Live" : "–"}
          </span>
          {/* Last sync */}
          {lastSync && (
            <span className="text-[10px] text-white/40 hidden sm:block">
              Sync {format(lastSync, "HH:mm")}
            </span>
          )}
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={onSync} disabled={isSyncing} title="Sincronizza Smoobu"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={onRefresh} disabled={isLoading} title="Aggiorna dati"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
            onClick={onSignOut} title="Esci"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Date + situazione */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-0.5">Oggi</p>
        <h2 className="text-white font-serif font-bold text-lg leading-none">
          {format(now, "EEEE d MMMM yyyy", { locale: it })}
        </h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-0 divide-x divide-white/10 border-t border-white/10">
        {/* Today group */}
        {[
          { label: "Arrivi", value: allArrivalsToday.length, icon: ArrowUpRight, accent: "text-emerald-300" },
          { label: "Partenze", value: allDeparturesToday.length, icon: ArrowDownRight, accent: "text-amber-300" },
          { label: "In struttura", value: occupiedRoomIds.size, icon: Users, accent: "text-blue-300" },
          { label: "Libere", value: PROPERTY_CONFIG.totalRooms - occupiedRoomIds.size, icon: BedDouble, accent: "text-white/70" },
        ].map(stat => (
          <div key={stat.label} className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
              <span className="text-white/50 text-[10px] uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}

        {/* Divider label — hidden on mobile */}
        <div className="hidden lg:flex flex-col gap-1 p-4 border-l-2 border-white/20">
          <span className="text-white/30 text-[10px] uppercase tracking-wide">Occupancy</span>
          <p className="text-2xl font-bold text-white">{occupancy}%</p>
        </div>

        {/* Revenue group */}
        {[
          { label: "Mese", value: `€${monthRevenue}` },
          { label: "Futuro", value: `€${futureRevenue}` },
        ].map(card => (
          <div key={card.label} className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Euro className="w-3.5 h-3.5 text-white/50" />
              <span className="text-white/50 text-[10px] uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Arrivals today detail strip */}
      {allArrivalsToday.length > 0 && (
        <div className="px-5 py-3 bg-white/5 border-t border-white/10 flex items-center gap-3 overflow-x-auto">
          <span className="text-white/40 text-xs shrink-0">Arrivano oggi:</span>
          {allArrivalsToday.slice(0, 6).map((b, i) => {
            const name = "customer_name" in b ? b.customer_name : (b as SmoobuBooking).guest_name;
            const room = "room_name" in b ? b.room_name : (b as SmoobuBooking).room_name;
            return (
              <div key={i} className="flex items-center gap-1.5 shrink-0 bg-white/10 rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-xs font-medium">{name.split(" ")[0]}</span>
                <span className="text-white/40 text-xs">· {room}</span>
              </div>
            );
          })}
          {allArrivalsToday.length > 6 && (
            <span className="text-white/40 text-xs shrink-0">+{allArrivalsToday.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Guest Detail Modal (drawer-style) ───────────────────────────────────────

const GuestDetail = ({
  booking,
  onClose,
  onRefund,
  isRefunding,
}: {
  booking: Booking | null;
  onClose: () => void;
  onRefund: (b: Booking) => void;
  isRefunding: boolean;
}) => {
  if (!booking) return null;
  const n = nights(booking.check_in, booking.check_out);
  const StatusIcon = STATUS_CONFIG[booking.payment_status]?.icon ?? CheckCircle2;
  const isInHouse = booking.check_in <= todayStr && booking.check_out > todayStr;
  const isArriving = booking.check_in === todayStr;
  const isDeparting = booking.check_out === todayStr;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#003580] p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {avatar(booking.customer_name)}
              </div>
              <div>
                <h3 className="text-white font-serif font-bold text-lg leading-tight">{booking.customer_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {isInHouse && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">In struttura</span>}
                  {isArriving && <span className="text-[10px] bg-blue-400 text-white px-2 py-0.5 rounded-full font-medium">Arriva oggi</span>}
                  {isDeparting && <span className="text-[10px] bg-amber-400 text-white px-2 py-0.5 rounded-full font-medium">Parte oggi</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[booking.payment_status]?.badge ?? ""}`}>
                    <StatusIcon className="inline w-2.5 h-2.5 mr-0.5" />
                    {STATUS_CONFIG[booking.payment_status]?.label ?? booking.payment_status}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Contatti */}
          <div className="space-y-2">
            {booking.customer_email && (
              <a href={`mailto:${booking.customer_email}`} className="flex items-center gap-2 text-sm text-[#0071c2] hover:underline">
                <Mail className="w-4 h-4" /> {booking.customer_email}
              </a>
            )}
            {booking.customer_phone && (
              <a href={`tel:${booking.customer_phone}`} className="flex items-center gap-2 text-sm text-[#0071c2] hover:underline">
                <Phone className="w-4 h-4" /> {booking.customer_phone}
              </a>
            )}
          </div>

          {/* Dettagli soggiorno */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Camera</span>
              <span className="font-medium">{booking.room_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check-in</span>
              <span className="font-medium">{format(new Date(booking.check_in), "d MMMM yyyy", { locale: it })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check-out</span>
              <span className="font-medium">{format(new Date(booking.check_out), "d MMMM yyyy", { locale: it })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Durata</span>
              <span className="font-medium">{n} {n === 1 ? "notte" : "notti"} · {booking.guests} ospiti</span>
            </div>
            <div className="border-t pt-2.5 flex justify-between">
              <span className="font-semibold">Totale</span>
              <span className="font-bold text-[#003580] text-base">€{booking.total_price}</span>
            </div>
          </div>

          {/* Note */}
          {booking.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <p className="font-medium mb-0.5">Note</p>
              <p className="text-amber-700">{booking.notes}</p>
            </div>
          )}

          {/* ID prenotazione */}
          <div className="text-[10px] text-gray-400 font-mono">
            ID: {booking.id}
            {booking.smoobu_reservation_id && <span> · Smoobu: {booking.smoobu_reservation_id}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          {booking.customer_email && (
            <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl">
              <a href={`mailto:${booking.customer_email}`}>
                <Mail className="w-4 h-4 mr-1.5" /> Scrivi
              </a>
            </Button>
          )}
          {booking.payment_status === "paid" && booking.stripe_payment_intent_id && (
            <Button
              variant="destructive" size="sm"
              className="flex-1 rounded-xl"
              disabled={isRefunding}
              onClick={() => onRefund(booking)}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              {isRefunding ? "..." : "Rimborsa €" + booking.total_price}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Calendario visivo ────────────────────────────────────────────────────────

const VisualCalendar = ({
  blockedDates, bookings, smoobuBookings, onBlockDates,
}: {
  blockedDates: BlockedDate[];
  bookings: Booking[];
  smoobuBookings: SmoobuBooking[];
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
    const ds = format(date, "yyyy-MM-dd");
    const bl = blockedDates.find(b => b.room_id === selectedRoom && ds >= b.date_from && ds <= b.date_to);
    if (bl) return { blocked: true, source: bl.source, blockId: bl.id };
    const bk = bookings.find(b => b.room_id === selectedRoom && b.payment_status === "paid" && ds >= b.check_in && ds < b.check_out);
    if (bk) return { blocked: true, source: "stripe", guest: bk.customer_name };
    const sb = smoobuBookings.find(b => b.room_id === selectedRoom && ds >= b.check_in && ds < b.check_out);
    if (sb) return { blocked: true, source: "smoobu", guest: sb.guest_name };
    return { blocked: false };
  };

  const handleDayClick = (ds: string, date: Date) => {
    if (startOfDay(date) < todayStart) return;
    if (!selecting.from) { setSelecting({ from: ds, to: null }); return; }
    if (!selecting.to && ds > selecting.from) { setSelecting(p => ({ ...p, to: ds })); return; }
    setSelecting({ from: ds, to: null });
  };

  const handleBlock = async () => {
    if (!selecting.from || !selecting.to || selecting.from >= selecting.to) {
      toast({ title: "Date non valide", variant: "destructive" });
      return;
    }
    setIsBlocking(true);
    try {
      await onBlockDates(selectedRoom, selecting.from, selecting.to);
      toast({ title: "Date bloccate", description: `${roomName(selectedRoom)}: ${selecting.from} → ${selecting.to}` });
      setSelecting({ from: null, to: null });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    } finally { setIsBlocking(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select
          value={selectedRoom}
          onChange={e => { setSelectedRoom(e.target.value); setSelecting({ from: null, to: null }); }}
          className="h-9 rounded-lg border px-3 text-sm bg-white"
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

      {/* Legenda */}
      <div className="flex gap-2 text-xs flex-wrap">
        {[
          { src: "stripe", label: "Diretto" },
          { src: "smoobu", label: "Booking.com" },
          { src: "manual", label: "Manuale" },
        ].map(({ src, label }) => (
          <span key={src} className={`px-2 py-1 rounded-full border ${SOURCE_BADGE[src]}`}>{label}</span>
        ))}
        <span className="px-2 py-1 rounded-full border bg-[#003580]/10 text-[#003580] border-[#003580]/20">Selezione</span>
        <span className="px-2 py-1 rounded-full border bg-gray-100 text-gray-400">Passato</span>
      </div>

      {/* Griglia */}
      <div className="grid grid-cols-7 gap-1">
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-xs font-medium text-gray-400 py-1 text-center">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(day => {
          const ds = format(day, "yyyy-MM-dd");
          const info = getDateInfo(day);
          const isPast = startOfDay(day) < todayStart;
          const isSelected = selecting.from && selecting.to
            ? ds >= selecting.from && ds <= selecting.to
            : ds === selecting.from;

          const bgClass = isPast
            ? "opacity-25 cursor-not-allowed text-gray-400"
            : info.blocked
            ? `${SOURCE_BADGE[info.source] ?? "bg-gray-100"} cursor-not-allowed opacity-80`
            : "hover:bg-gray-100 cursor-pointer";

          return (
            <button
              key={ds}
              onClick={() => !info.blocked && !isPast && handleDayClick(ds, day)}
              title={info.blocked && info.guest ? `${info.guest}` : undefined}
              disabled={info.blocked || isPast}
              className={[
                "aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center",
                isToday(day) ? "ring-2 ring-[#003580] ring-offset-1" : "",
                bgClass,
                isSelected && !info.blocked && !isPast ? "!bg-[#003580] !text-white" : "",
                !isSameMonth(day, currentMonth) ? "opacity-30" : "",
              ].filter(Boolean).join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {selecting.from && selecting.to && (
        <div className="flex items-center gap-3 p-3 bg-[#003580]/5 rounded-xl border border-[#003580]/20 flex-wrap">
          <p className="text-sm flex-1 text-[#003580]">
            Blocca <strong>{roomName(selectedRoom)}</strong> dal <strong>{selecting.from}</strong> al <strong>{selecting.to}</strong>
          </p>
          <Button size="sm" onClick={handleBlock} disabled={isBlocking} className="rounded-lg bg-[#003580] hover:bg-[#002a66]">
            {isBlocking ? "..." : "Conferma"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelecting({ from: null, to: null })}>Annulla</Button>
        </div>
      )}
    </div>
  );
};

// ─── Timeline ────────────────────────────────────────────────────────────────

const Timeline = ({ events }: { events: TimelineEvent[] }) => {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Activity className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">Nessun evento registrato</p>
      </div>
    );
  }

  // Raggruppa per giorno
  const grouped = events.reduce<Record<string, TimelineEvent[]>>((acc, ev) => {
    const day = ev.timestamp.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, evs]) => (
          <div key={day}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
              {format(new Date(day), "EEEE d MMMM yyyy", { locale: it })}
            </p>
            <div className="space-y-2">
              {evs.map(ev => {
                const Icon = EVENT_ICON[ev.type] ?? Activity;
                return (
                  <div key={ev.id} className="flex items-start gap-3 bg-white border rounded-xl p-3 hover:shadow-sm transition-shadow">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${EVENT_COLOR[ev.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{format(new Date(ev.timestamp), "HH:mm")}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${SOURCE_BADGE[ev.source] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {SOURCE_LABEL[ev.source] ?? ev.source}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

const AdminDashboard = ({ onSignOut }: { onSignOut: () => void }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [smoobuBookings, setSmoobuBookings] = useState<SmoobuBooking[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("prenotazioni");
  const hasSyncedOnMount = useRef(false);
  const { toast } = useToast();

  // ── Fetch dati ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: b, error: be }, { data: d, error: de }] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("blocked_dates").select("*").order("date_from", { ascending: false }),
      ]);
      if (be) throw be;
      if (de) throw de;
      const bData = (b ?? []) as Booking[];
      setBookings(bData);
      setBlockedDates(d ?? []);

      // Genera timeline dagli eventi dei bookings
      buildTimeline(bData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore";
      toast({ title: "Errore caricamento", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // ── Costruisce la timeline ─────────────────────────────────────────────────
  const buildTimeline = (bData: Booking[]) => {
    const events: TimelineEvent[] = [];
    bData.forEach(b => {
      events.push({
        id: `created-${b.id}`,
        type: "booking_created",
        title: `Richiesta prenotazione — ${b.customer_name}`,
        subtitle: `${b.room_name} · ${b.check_in} → ${b.check_out} · €${b.total_price}`,
        timestamp: b.created_at,
        source: "stripe",
        metadata: { booking_id: b.id },
      });
      if (b.payment_status === "paid") {
        events.push({
          id: `paid-${b.id}`,
          type: "payment_confirmed",
          title: `Pagamento confermato — ${b.customer_name}`,
          subtitle: `€${b.total_price} · ${b.room_name}`,
          timestamp: b.created_at, // idealmente avremmo updated_at
          source: "stripe",
        });
      }
      if (b.payment_status === "refunded") {
        events.push({
          id: `refund-${b.id}`,
          type: "refund",
          title: `Rimborso emesso — ${b.customer_name}`,
          subtitle: `€${b.total_price} · ${b.room_name}`,
          timestamp: b.created_at,
          source: "stripe",
        });
      }
      if (b.payment_status === "expired") {
        events.push({
          id: `expired-${b.id}`,
          type: "booking_expired",
          title: `Prenotazione scaduta`,
          subtitle: `${b.customer_name} · ${b.room_name} · €${b.total_price}`,
          timestamp: b.created_at,
          source: "stripe",
        });
      }
    });

    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setTimelineEvents(events);
  };

  // ── Sync Smoobu ────────────────────────────────────────────────────────────
  const syncSmoobu = useCallback(async (silent = false) => {
    if (isSyncing) return; // guard anti-doppio click
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smoobu-sync-reservations`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore sync");

      // Deduplication: usa smoobu_id come chiave
      const seen = new Set<number>();
      const unique = (data.reservations ?? []).filter((r: SmoobuBooking) => {
        if (seen.has(r.smoobu_id)) return false;
        seen.add(r.smoobu_id);
        return true;
      });
      setSmoobuBookings(unique);
      setLastSync(new Date());

      // Aggiorna blocked_dates post-sync
      const { data: d } = await supabase.from("blocked_dates").select("*").order("date_from", { ascending: false });
      setBlockedDates(d ?? []);

      // Aggiungi evento timeline
      setTimelineEvents(prev => [{
        id: `sync-${Date.now()}`,
        type: "smoobu_sync",
        title: `Sincronizzazione Smoobu completata`,
        subtitle: `${unique.length} prenotazioni importate da Booking.com`,
        timestamp: new Date().toISOString(),
        source: "smoobu",
      }, ...prev]);

      if (!silent) {
        toast({ title: "Sync completato", description: `${unique.length} prenotazioni OTA` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore sync";
      if (!silent) toast({ title: "Errore sync Smoobu", description: message, variant: "destructive" });
      else console.warn("[syncSmoobu] silent error:", message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  // ── Auto-sync on mount (una sola volta) ────────────────────────────────────
  useEffect(() => {
    fetchData().then(() => {
      if (!hasSyncedOnMount.current) {
        hasSyncedOnMount.current = true;
        syncSmoobu(true); // silent: no toast all'apertura
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, payload => {
        if (payload.eventType === "INSERT") {
          setBookings(prev => [payload.new as Booking, ...prev]);
          buildTimeline([payload.new as Booking, ...bookings]);
        }
        if (payload.eventType === "UPDATE")
          setBookings(prev => prev.map(b => b.id === (payload.new as Booking).id ? payload.new as Booking : b));
        if (payload.eventType === "DELETE")
          setBookings(prev => prev.filter(b => b.id !== (payload.old as { id: string }).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_dates" }, payload => {
        if (payload.eventType === "INSERT") setBlockedDates(prev => [payload.new as BlockedDate, ...prev]);
        if (payload.eventType === "UPDATE") setBlockedDates(prev => prev.map(d => d.id === (payload.new as BlockedDate).id ? payload.new as BlockedDate : d));
        if (payload.eventType === "DELETE") setBlockedDates(prev => prev.filter(d => d.id !== (payload.old as { id: string }).id));
      })
      .subscribe(status => setIsLive(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBlockDates = async (roomId: string, from: string, to: string) => {
    const { error } = await supabase.from("blocked_dates").insert({ room_id: roomId, date_from: from, date_to: to, source: "manual" });
    if (error) throw error;
  };

  const handleDeleteBlock = async (id: string, source: string) => {
    if (source === "ical") {
      toast({ title: "Non consentito", description: "Le date Booking.com si aggiornano automaticamente.", variant: "destructive" });
      return;
    }
    if (!confirm("Eliminare questo blocco?")) return;
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) toast({ title: "Errore", description: error.message, variant: "destructive" });
    else toast({ title: "Blocco eliminato" });
  };

  const handleRefund = async (booking: Booking) => {
    if (!confirm(`Confermi il rimborso di €${booking.total_price} a ${booking.customer_name}?\n\nQuesta operazione è irreversibile.`)) return;
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
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setSelectedBooking(null);
      toast({ title: "Rimborso avviato", description: `€${booking.total_price} a ${booking.customer_name}. Il webhook aggiornerà lo stato automaticamente.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore";
      toast({ title: "Errore rimborso", description: message, variant: "destructive" });
    } finally { setRefundingId(null); }
  };

  // ── Filtri ─────────────────────────────────────────────────────────────────

  const filteredBookings = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => {
      const matchSearch = !q ||
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_email.toLowerCase().includes(q) ||
        b.customer_phone?.includes(q) ||
        b.room_name.toLowerCase().includes(q) ||
        b.id.includes(q);
      const matchStatus = statusFilter === "all" || b.payment_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  const filteredSmoobu = useMemo(() => {
    if (!search) return smoobuBookings;
    const q = search.toLowerCase();
    return smoobuBookings.filter(b =>
      b.guest_name.toLowerCase().includes(q) ||
      b.room_name.toLowerCase().includes(q) ||
      b.guest_email?.toLowerCase().includes(q)
    );
  }, [smoobuBookings, search]);

  // Prossimi 7 giorni (tutte le fonti)
  const next7 = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const upcomingAll = useMemo(() => [
    ...bookings.filter(b => b.payment_status === "paid" && b.check_in > todayStr && b.check_in <= next7)
      .map(b => ({ name: b.customer_name, room: b.room_name, check_in: b.check_in, guests: b.guests, source: "stripe" as const })),
    ...smoobuBookings.filter(b => b.check_in > todayStr && b.check_in <= next7)
      .map(b => ({ name: b.guest_name, room: b.room_name, check_in: b.check_in, guests: b.guests, source: "smoobu" as const })),
  ].sort((a, b) => a.check_in.localeCompare(b.check_in)), [bookings, smoobuBookings, next7]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-3 lg:p-6 space-y-4">

        {/* ── Header unificato ─────────────────────────────────────────── */}
        <HeaderStats
          bookings={bookings}
          smoobuBookings={smoobuBookings}
          lastSync={lastSync}
          isSyncing={isSyncing}
          onSync={() => syncSmoobu(false)}
          isLive={isLive}
          onRefresh={fetchData}
          isLoading={isLoading}
          onSignOut={onSignOut}
        />

        {/* ── Prossimi arrivi strip ─────────────────────────────────────── */}
        {upcomingAll.length > 0 && (
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-4 h-4 text-[#003580]" />
              <span className="text-sm font-semibold text-gray-700">Prossimi 7 giorni</span>
              <span className="text-xs text-gray-400">({upcomingAll.length})</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {upcomingAll.map((item, i) => (
                <div key={i} className="shrink-0 bg-gray-50 border rounded-xl px-3 py-2 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-[#003580] rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium truncate">{item.name.split(" ")[0]}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.room}</p>
                  <p className="text-xs font-medium text-[#003580] mt-1">
                    {format(new Date(item.check_in), "d MMM", { locale: it })}
                    {" · "}{item.guests} osp.
                  </p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${SOURCE_BADGE[item.source]}`}>
                    {SOURCE_LABEL[item.source]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs principali ──────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="bg-white border rounded-xl p-1 h-auto gap-1">
              {[
                { value: "prenotazioni", label: "Prenotazioni dirette", count: bookings.filter(b => b.payment_status === "paid").length },
                { value: "ota", label: "OTA", count: smoobuBookings.length },
                { value: "calendario", label: "Calendario" },
                { value: "blocchi", label: "Blocchi" },
                { value: "cronologia", label: "Cronologia", count: timelineEvents.length },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-lg text-xs data-[state=active]:bg-[#003580] data-[state=active]:text-white px-3 py-2 h-auto"
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 text-[10px] bg-gray-100 data-[state=active]:bg-white/20 px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Ricerca globale */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Cerca ospite, email, camera..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 rounded-xl w-56 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Prenotazioni dirette ─────────────────────────────────── */}
          <TabsContent value="prenotazioni" className="mt-3">
            <div className="bg-white rounded-2xl border overflow-hidden">
              {/* Filtri status */}
              <div className="p-3 border-b flex gap-1.5 overflow-x-auto">
                {["all", "paid", "pending", "refunded", "expired", "cancelled"].map(s => {
                  const count = s === "all" ? bookings.length : bookings.filter(b => b.payment_status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        statusFilter === s ? "bg-[#003580] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s === "all" ? "Tutte" : STATUS_CONFIG[s]?.label ?? s}
                      <span className={`text-[10px] px-1 rounded ${statusFilter === s ? "bg-white/20" : "bg-gray-200"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 text-xs">
                      <TableHead>Ospite</TableHead>
                      <TableHead>Camera</TableHead>
                      <TableHead>Soggiorno</TableHead>
                      <TableHead>Totale</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Prenotato il</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-16">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Nessuna prenotazione trovata
                        </TableCell>
                      </TableRow>
                    ) : filteredBookings.map(b => {
                      const n = nights(b.check_in, b.check_out);
                      const isInHouse = b.payment_status === "paid" && b.check_in <= todayStr && b.check_out > todayStr;
                      const isArriving = b.check_in === todayStr;
                      const StatusIcon = STATUS_CONFIG[b.payment_status]?.icon ?? CheckCircle2;
                      return (
                        <TableRow
                          key={b.id}
                          className="hover:bg-[#003580]/5 cursor-pointer transition-colors"
                          onClick={() => setSelectedBooking(b)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-[#003580]/10 text-[#003580] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {avatar(b.customer_name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium">{b.customer_name}</span>
                                  {isInHouse && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">In struttura</span>}
                                  {isArriving && !isInHouse && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">Oggi</span>}
                                </div>
                                <p className="text-xs text-gray-400">{b.customer_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{b.room_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">{format(new Date(b.check_in), "d MMM", { locale: it })} → {format(new Date(b.check_out), "d MMM yy", { locale: it })}</div>
                            <div className="text-xs text-gray-400">{n} {n === 1 ? "notte" : "notti"} · {b.guests} osp.</div>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">€{b.total_price}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border font-medium ${STATUS_CONFIG[b.payment_status]?.badge ?? ""}`}>
                              <StatusIcon className="w-3 h-3" />
                              {STATUS_CONFIG[b.payment_status]?.label ?? b.payment_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-400">
                            {format(new Date(b.created_at), "d MMM yy", { locale: it })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── OTA (Smoobu) ─────────────────────────────────────────── */}
          <TabsContent value="ota" className="mt-3">
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Prenotazioni OTA</p>
                  <p className="text-xs text-gray-400">Da Booking.com e altri canali via Smoobu · {smoobuBookings.length} prenotazioni</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => syncSmoobu(false)} disabled={isSyncing} className="rounded-xl text-xs h-8 gap-1.5">
                  <RotateCcw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                  {lastSync ? `Sync ${format(lastSync, "HH:mm")}` : "Sincronizza"}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 text-xs">
                      <TableHead>Ospite</TableHead>
                      <TableHead>Camera</TableHead>
                      <TableHead>Soggiorno</TableHead>
                      <TableHead>Totale</TableHead>
                      <TableHead>Canale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSmoobu.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-16">
                          {smoobuBookings.length === 0
                            ? <><RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Sincronizzazione in corso...</p></>
                            : "Nessun risultato"}
                        </TableCell>
                      </TableRow>
                    ) : filteredSmoobu.map(b => {
                      const n = nights(b.check_in, b.check_out);
                      const isInHouse = b.check_in <= todayStr && b.check_out > todayStr;
                      return (
                        <TableRow key={b.smoobu_id} className="hover:bg-[#003580]/5">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {avatar(b.guest_name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium">{b.guest_name}</span>
                                  {isInHouse && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">In struttura</span>}
                                </div>
                                {b.guest_email && <p className="text-xs text-gray-400">{b.guest_email}</p>}
                                {b.guest_phone && <p className="text-xs text-gray-400">{b.guest_phone}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{b.room_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">{format(new Date(b.check_in), "d MMM", { locale: it })} → {format(new Date(b.check_out), "d MMM yy", { locale: it })}</div>
                            <div className="text-xs text-gray-400">{n} {n === 1 ? "notte" : "notti"} · {b.guests} osp.</div>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">€{b.total_price}</TableCell>
                          <TableCell>
                            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                              {b.channel || "OTA"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── Calendario ───────────────────────────────────────────── */}
          <TabsContent value="calendario" className="mt-3">
            <div className="bg-white rounded-2xl border p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#003580]" /> Calendario disponibilità
                </h2>
              </div>
              <VisualCalendar
                blockedDates={blockedDates}
                bookings={bookings}
                smoobuBookings={smoobuBookings}
                onBlockDates={handleBlockDates}
              />
            </div>
          </TabsContent>

          {/* ── Date bloccate ─────────────────────────────────────────── */}
          <TabsContent value="blocchi" className="mt-3">
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-gray-900">Date bloccate</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Diretto = Stripe · Booking = Smoobu/iCal · Manuale = Admin
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                  {blockedDates.length} blocchi
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 text-xs">
                      <TableHead>Camera</TableHead>
                      <TableHead>Dal</TableHead>
                      <TableHead>Al</TableHead>
                      <TableHead>Notti</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedDates.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-12">Nessuna data bloccata</TableCell></TableRow>
                    ) : blockedDates.map(block => {
                      const n = nights(block.date_from, block.date_to);
                      return (
                        <TableRow key={block.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm font-medium">{roomName(block.room_id)}</TableCell>
                          <TableCell className="text-sm">{format(new Date(block.date_from), "d MMM yyyy", { locale: it })}</TableCell>
                          <TableCell className="text-sm">{format(new Date(block.date_to), "d MMM yyyy", { locale: it })}</TableCell>
                          <TableCell className="text-sm text-gray-500">{n}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SOURCE_BADGE[block.source] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {SOURCE_LABEL[block.source] ?? block.source}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {block.source !== "ical" && (
                              <Button
                                variant="ghost" size="icon"
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7"
                                onClick={() => handleDeleteBlock(block.id, block.source)}
                              >
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

          {/* ── Cronologia ───────────────────────────────────────────── */}
          <TabsContent value="cronologia" className="mt-3">
            <div className="bg-white rounded-2xl border p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-medium text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#003580]" /> Cronologia attività
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Storico di prenotazioni, pagamenti, rimborsi e sync
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                  {timelineEvents.length} eventi
                </span>
              </div>
              <Timeline events={timelineEvents} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Guest detail modal */}
      {selectedBooking && (
        <GuestDetail
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onRefund={handleRefund}
          isRefunding={refundingId === selectedBooking.id}
        />
      )}
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

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