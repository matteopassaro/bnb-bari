import room1_entrance from "@/assets/room1_entrance.jpg";
import room1_entrance_2 from "@/assets/room1_entrance_2.jpg";
import room1_0 from "@/assets/room1_0.jpg";
import room1_2 from "@/assets/room1_2.jpg";
import room1_3 from "@/assets/room1_3.jpg";
import room1_4 from "@/assets/room1_4.jpg";
import room1_5 from "@/assets/room1_5.jpg";
import room1_6 from "@/assets/room1_6.jpg";
import room1_bathroom from "@/assets/room1_bathroom.jpg";
import room1_bathroom_2 from "@/assets/room1_bathroom_2.jpg";
import room2 from "@/assets/room-2.jpg";
import room3 from "@/assets/room-3.jpg";

export type RoomId =
  | "camera-tripla-deluxe"
  | "camera-matrimoniale"
  | "monolocale-pietra";

export type RoomAmenityKey =
  | "wifi"
  | "airConditioning"
  | "soundproofing"
  | "coffeeMachine"
  | "smartTv"
  | "kettle"
  | "kitchenArea";

export interface Room {
  id: RoomId;
  /** Fallback name usato in contesti non i18n (admin panel, email, Supabase) */
  name: string;
  price: number;
  images: string[];
  guests: number;
  size: string;
  amenities: RoomAmenityKey[];
}

// Helper per chiavi i18n — usa questi nei componenti React
export const getRoomNameKey = (id: RoomId) =>
  `home:roomsData.${id}.name` as const;

export const getRoomDescriptionKey = (id: RoomId) =>
  `home:roomsData.${id}.description` as const;

export const getRoomAmenityKey = (amenity: RoomAmenityKey) =>
  `home:roomAmenities.${amenity}` as const;

export const rooms: Room[] = [
  {
    id: "camera-tripla-deluxe",
    name: "Camera Tripla Deluxe",
    price: 95,
    images: [
      room1_0, room1_entrance, room1_entrance_2,
      room1_2, room1_3, room1_4,
      room1_5, room1_6, room1_bathroom, room1_bathroom_2,
    ],
    guests: 3,
    size: "18 m²",
    amenities: ["wifi", "airConditioning", "soundproofing", "coffeeMachine"],
  },
  {
    id: "camera-matrimoniale",
    name: "Camera Matrimoniale",
    price: 85,
    images: [room2],
    guests: 2,
    size: "15 m²",
    amenities: ["wifi", "airConditioning", "smartTv", "kettle"],
  },
  {
    id: "monolocale-pietra",
    name: "Monolocale in Pietra",
    price: 110,
    images: [room3],
    guests: 2,
    size: "25 m²",
    amenities: ["wifi", "kitchenArea", "airConditioning", "smartTv"],
  },
];