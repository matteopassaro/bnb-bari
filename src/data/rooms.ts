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

export interface Room {
  id: RoomId;
  price: number;
  images: string[];
  guests: number;
  size: string;
  amenities: RoomAmenityKey[];
}

export type RoomAmenityKey =
  | "wifi"
  | "airConditioning"
  | "soundproofing"
  | "coffeeMachine"
  | "smartTv"
  | "kettle"
  | "kitchenArea";

export const getRoomNameTranslationKey = <T extends RoomId>(roomId: T) => `home:roomsData.${roomId}.name` as const;
export const getRoomDescriptionTranslationKey = <T extends RoomId>(roomId: T) => `home:roomsData.${roomId}.description` as const;
export const getRoomAmenityTranslationKey = <T extends RoomAmenityKey>(amenity: T) => `home:roomAmenities.${amenity}` as const;

export const rooms: Room[] = [
  {
    id: "camera-tripla-deluxe",
    price: 95,
    images: [
      room1_0,
      room1_entrance,
      room1_entrance_2,
      room1_2,
      room1_3,
      room1_4,
      room1_5,
      room1_6,
      room1_bathroom,
      room1_bathroom_2
    ],
    guests: 3,
    size: "18 m²",
    amenities: ["wifi", "airConditioning", "soundproofing", "coffeeMachine"],
  },
  {
    id: "camera-matrimoniale",
    price: 85,
    images: [room2],
    guests: 2,
    size: "15 m²",
    amenities: ["wifi", "airConditioning", "smartTv", "kettle"],
  },
  {
    id: "monolocale-pietra",
    price: 110,
    images: [room3],
    guests: 2,
    size: "25 m²",
    amenities: ["wifi", "kitchenArea", "airConditioning", "smartTv"],
  },
];
