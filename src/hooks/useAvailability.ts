import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { eachDayOfInterval, parseISO, isAfter, startOfToday } from "date-fns";

export function useAvailability(roomId: string) {
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const fetchBlockedDates = async () => {
      setIsLoading(true);
      try {
        const today = startOfToday().toISOString();

        const { data, error } = await supabase
          .from("blocked_dates")
          .select("date_from, date_to")
          .eq("room_id", roomId)
          .gte("date_to", today);

        if (error) throw error;

        if (data) {
          const allDates: Date[] = [];
          data.forEach((range) => {
            const start = parseISO(range.date_from);
            const end = parseISO(range.date_to);
            
            // Expand range into individual days
            const days = eachDayOfInterval({ start, end });
            allDates.push(...days);
          });
          setBlockedDates(allDates);
        }
      } catch (err) {
        console.error("Errore fetch blocked dates:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedDates();
  }, [roomId]);

  return { blockedDates, isLoading };
}
