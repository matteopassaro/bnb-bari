import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { eachDayOfInterval, parseISO, startOfToday } from "date-fns";

export function useAvailability(roomId: string) {
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setBlockedDates([]);
      setIsLoading(false);
      return;
    }

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

        const allDates: Date[] = [];

        data?.forEach((range) => {
          const start = parseISO(range.date_from);
          const end = parseISO(range.date_to);

          const days = eachDayOfInterval({ start, end });

          allDates.push(
            ...days.map((d) => {
              const clean = new Date(d);
              clean.setHours(0, 0, 0, 0);
              return clean;
            })
          );
        });

        setBlockedDates(allDates);
      } catch (err) {
        console.error("useAvailability error:", err);
        setBlockedDates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedDates();
  }, [roomId]);

  return { blockedDates, isLoading };
}

export function useRoomsAvailability(checkIn?: Date, checkOut?: Date) {
  const [availableRooms, setAvailableRooms] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!checkIn || !checkOut) {
      setAvailableRooms(new Set());
      return;
    }

    const checkAvailability = async () => {
      setIsLoading(true);

      try {
        const checkInStr = format(checkIn, "yyyy-MM-dd");
        const checkOutStr = format(checkOut, "yyyy-MM-dd");
        const today = startOfToday().toISOString();

        const { data: blockedDates, error } = await supabase
          .from("blocked_dates")
          .select("room_id, date_from, date_to")
          .gte("date_to", today);

        if (error) throw error;

        const { data: paidBookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("room_id, check_in, check_out")
          .eq("payment_status", "paid");

        if (bookingsError) throw bookingsError;

        const allRoomIds = ["camera-tripla-deluxe", "camera-matrimoniale", "monolocale-pietra"];
        const available = new Set<string>();

        for (const roomId of allRoomIds) {
          let isAvailable = true;

          const roomBlockedDates = blockedDates?.filter(b => b.room_id === roomId) || [];
          for (const block of roomBlockedDates) {
            const blockStart = parseISO(block.date_from);
            const blockEnd = parseISO(block.date_to);
            
            if (checkIn < blockEnd && checkOut > blockStart) {
              isAvailable = false;
              break;
            }
          }

          if (isAvailable) {
            const roomPaidBookings = paidBookings?.filter(b => b.room_id === roomId) || [];
            for (const booking of roomPaidBookings) {
              const bookStart = parseISO(booking.check_in);
              const bookEnd = parseISO(booking.check_out);
              
              if (checkIn < bookEnd && checkOut > bookStart) {
                isAvailable = false;
                break;
              }
            }
          }

          if (isAvailable) {
            available.add(roomId);
          }
        }

        setAvailableRooms(available);
      } catch (err) {
        console.error("useRoomsAvailability error:", err);
        setAvailableRooms(new Set());
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, [checkIn?.toISOString(), checkOut?.toISOString()]);

  return { availableRooms, isLoading };
}

function format(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}