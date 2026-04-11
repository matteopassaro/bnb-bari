import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Trash2, Lock, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Helmet } from "react-helmet-async";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [roomIdToBlock, setRoomIdToBlock] = useState("camera-1");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      toast({
        title: "Errore",
        description: "Password errata",
        variant: "destructive",
      });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      const { data: blockedData, error: blockedError } = await supabase
        .from("blocked_dates")
        .select("*")
        .order("date_from", { ascending: false });

      if (blockedError) throw blockedError;
      setBlockedDates(blockedData || []);
    } catch (err: any) {
      toast({
        title: "Errore caricamento dati",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateFrom || !dateTo) {
      toast({ title: "Attenzione", description: "Seleziona date valide", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("blocked_dates").insert({
        room_id: roomIdToBlock,
        date_from: dateFrom,
        date_to: dateTo,
        source: "manual",
      });

      if (error) throw error;

      toast({ title: "Successo", description: "Date bloccate manualmente" });
      setDateFrom("");
      setDateTo("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteBlockedDate = async (id: string, source: string) => {
    if (source !== "manual" && source !== "stripe") {
       toast({ title: "Non consentito", description: "Puoi eliminare solo blocchi manuali o stripe.", variant: "destructive" });
       return;
    }
    
    if (!confirm("Sei sicuro di voler eliminare questo blocco?")) return;

    try {
      const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Eliminato", description: "Blocco rimosso" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500 hover:bg-green-600">Pagato</Badge>;
      case "pending": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Attesa</Badge>;
      case "cancelled": return <Badge className="bg-red-500 hover:bg-red-600">Annullato</Badge>;
      case "refunded": return <Badge className="bg-orange-500 hover:bg-orange-600">Rimborsato</Badge>;
      case "expired": return <Badge className="bg-gray-500 hover:bg-gray-600">Scaduto</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F3] p-4 text-[#2C3E38]">
        <Helmet><title>Admin Login - Corte del Borgo Antico</title></Helmet>
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-playfair text-3xl font-bold text-primary">Admin</h1>
            <p className="text-sm text-gray-500">Accedi al pannello di controllo</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90">
              <Lock className="w-4 h-4 mr-2" />
              Accedi
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F3] p-6 lg:p-12 text-[#2C3E38]">
      <Helmet><title>Dashboard Admin - Corte del Borgo Antico</title></Helmet>
      
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-playfair text-4xl font-bold text-primary">Pannello Admin</h1>
          <Button onClick={fetchData} variant="outline" className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Aggiorna Dati
          </Button>
        </div>

        {/* PRENOTAZIONI SECTION */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm">
          <h2 className="font-playfair text-2xl font-bold mb-6 flex items-center">
            <CalendarIcon className="w-6 h-6 mr-3 text-primary" />
            Ultimissime Prenotazioni
          </h2>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead>Ospite</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Soggiorno</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-500">Nessuna prenotazione trovata</TableCell></TableRow>
                ) : (
                  bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{format(new Date(b.created_at), "dd MMM yyyy", { locale: it })}</TableCell>
                      <TableCell>
                        <div className="font-medium">{b.customer_name}</div>
                        <div className="text-xs text-gray-500">{b.customer_email} - {b.customer_phone}</div>
                      </TableCell>
                      <TableCell>{b.room_name}</TableCell>
                      <TableCell className="text-sm">
                         {format(new Date(b.check_in), "dd/MM")} - {format(new Date(b.check_out), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>€{b.total_price}</TableCell>
                      <TableCell>{getStatusBadge(b.payment_status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* INSERISCI BLOCCO MANUALE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm col-span-1">
            <h2 className="font-playfair text-xl font-bold mb-4 border-b pb-4">Blocca Date</h2>
            <form onSubmit={handleAddBlockedDate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Camera</label>
                <select 
                  value={roomIdToBlock} 
                  onChange={(e) => setRoomIdToBlock(e.target.value)}
                  className="w-full flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="camera-1">Camera 1</option>
                  <option value="camera-2">Camera 2</option>
                  <option value="camera-3">Camera 3</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Dal</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} required className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Al</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} required className="rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl" variant="default">
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Blocco
              </Button>
            </form>
          </div>

          {/* LISTA DATE BLOCCATE */}
          <div className="bg-white rounded-3xl p-6 shadow-sm col-span-1 lg:col-span-2">
            <h2 className="font-playfair text-xl font-bold mb-4 border-b pb-4">Date Bloccate Attuali</h2>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Camera</TableHead>
                    <TableHead>Dal</TableHead>
                    <TableHead>Al</TableHead>
                    <TableHead>Origine</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedDates.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500">Nessuna data bloccata in calendario</TableCell></TableRow>
                  ) : (
                    blockedDates.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell className="font-medium">{block.room_id.replace('-', ' ')}</TableCell>
                        <TableCell>{format(new Date(block.date_from), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell>{format(new Date(block.date_to), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px]">{block.source}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(block.source === 'manual' || block.source === 'stripe') && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteBlockedDate(block.id, block.source)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
