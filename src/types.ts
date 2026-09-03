export interface Flight {
  id: string;
  category: "cheapest" | "soonest" | "fastest" | "recommended";
  carrier: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  layoverDetails: string;
  price: number;
  currency: string;
  bookingSource: string;
  bookingUrl?: string;
  skyscannerUrl?: string;
}

export interface SearchQuery {
  departure: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  flightType: "one-way" | "round-trip";
  cabinClass: "economy" | "premium-economy" | "business" | "first";
  preferences: string;
}

export interface SearchResult {
  advice: string;
  flights: Flight[];
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: GroundingSource[];
  isSearching?: boolean;
}
