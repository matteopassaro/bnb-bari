import room1 from "@/assets/room-1.jpg";
import room2 from "@/assets/room-2.jpg";
import room3 from "@/assets/room-3.jpg";

export interface Room {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  guests: number;
  size: string;
  amenities: string[];
}

export const rooms: Room[] = [
  {
    id: "camera-sole",
    name: "Camera del Sole",
    description: "Camera luminosa con pavimento in cotto e finestra ad arco con vista mare. Ideale per coppie in cerca di tranquillità.",
    price: 85,
    image: room1,
    guests: 2,
    size: "22 mq",
    amenities: ["Wi-Fi", "Aria condizionata", "Vista mare", "Colazione inclusa"],
  },
  {
    id: "camera-cielo",
    name: "Camera del Cielo",
    description: "Ampia camera con accenti azzurri, soffitto con travi a vista e balcone privato con vista sulla città vecchia.",
    price: 95,
    image: room2,
    guests: 2,
    size: "26 mq",
    amenities: ["Wi-Fi", "Aria condizionata", "Balcone", "Colazione inclusa", "TV"],
  },
  {
    id: "suite-ulivo",
    name: "Suite dell'Ulivo",
    description: "Suite romantica con pareti in pietra, letto a baldacchino e atmosfera intima. La nostra camera più esclusiva.",
    price: 130,
    image: room3,
    guests: 2,
    size: "32 mq",
    amenities: ["Wi-Fi", "Aria condizionata", "Minibar", "Colazione inclusa", "Accappatoi"],
  },
];
