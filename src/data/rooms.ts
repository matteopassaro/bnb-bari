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

export interface Room {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  guests: number;
  size: string;
  amenities: string[];
}

export const rooms: Room[] = [
  {
    id: "camera-tripla-deluxe",
    name: "Camera Tripla Deluxe",
    description: "Elegante camera con pareti in pietra a vista e soffitti a botte. Atmosfera autentica nel cuore di Bari Vecchia.",
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
    size: "18 mq",
    amenities: ["Wi-Fi", "Aria condizionata", "Insonorizzazione", "Macchina caffè"],
  },
  {
    id: "camera-matrimoniale",
    name: "Matrimoniale Standard",
    description: "Accogliente rifugio con rifiniture in pietra locale. Ideale per immergersi nella quiete del borgo antico.",
    price: 85,
    images: [room2],
    guests: 2,
    size: "15 mq",
    amenities: ["Wi-Fi", "Aria condizionata", "TV Smart", "Bollitore"],
  },
  {
    id: "monolocale-pietra",
    name: "Monolocale in Pietra",
    description: "Suite indipendente caratterizzata dall'architettura tipica pugliese. Comfort moderno in un guscio storico.",
    price: 110,
    images: [room3],
    guests: 2,
    size: "25 mq",
    amenities: ["Wi-Fi", "Area cucina", "Aria condizionata", "Smart TV"],
  },
];
