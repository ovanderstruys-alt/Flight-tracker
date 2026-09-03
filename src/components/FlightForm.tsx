import React, { useState } from "react";
import { SearchQuery } from "../types";
import { PlaneTakeoff, PlaneLanding, Calendar, User, Search, Settings, Plane } from "lucide-react";
import { motion } from "motion/react";

interface FlightFormProps {
  onSearch: (query: SearchQuery) => void;
  isLoading: boolean;
  isDarkMode?: boolean;
}

const POPULAR_DESTINATIONS = [
  { from: "London (LHR)", to: "Tokyo (TYO)", label: "London to Tokyo Flights" },
  { from: "New York (JFK)", to: "Paris (CDG)", label: "NYC to Paris Express" },
  { from: "Singapore (SIN)", to: "Sydney (SYD)", label: "Singapore to Sydney Route" },
];

export default function FlightForm({ onSearch, isLoading, isDarkMode = false }: FlightFormProps) {
  // Tomorrow's date as a default departure
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultDepartureDate = tomorrow.toISOString().split("T")[0];

  const [query, setQuery] = useState<SearchQuery>({
    departure: "",
    destination: "",
    departureDate: defaultDepartureDate,
    returnDate: "",
    flightType: "one-way",
    cabinClass: "economy",
    preferences: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.departure.trim() || !query.destination.trim() || !query.departureDate) return;
    onSearch(query);
  };

  const selectPreset = (from: string, to: string) => {
    const updatedQuery = {
      ...query,
      departure: from,
      destination: to,
    };
    setQuery(updatedQuery);
    onSearch(updatedQuery);
  };

  return (
    <div className={`rounded-2xl shadow-sm border p-6 transition-all duration-300 ${
      isDarkMode 
        ? "bg-slate-900 border-slate-800 text-slate-100" 
        : "bg-white border-slate-100 text-slate-800"
    }`}>
      <div className={`flex items-center justify-between mb-4 pb-4 border-b ${
        isDarkMode ? "border-slate-800" : "border-slate-100"
      }`}>
        <h2 className={`font-display font-semibold text-lg flex items-center gap-2 ${
          isDarkMode ? "text-slate-100" : "text-slate-800"
        }`}>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
          Flight Finder Console
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQuery({ ...query, flightType: "one-way", returnDate: "" })}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              query.flightType === "one-way"
                ? (isDarkMode ? "bg-blue-900 bg-opacity-30 text-blue-400 border border-blue-800" : "bg-blue-50 text-blue-600 border border-blue-200")
                : (isDarkMode ? "text-slate-400 hover:bg-slate-800 border border-transparent" : "text-slate-500 hover:bg-slate-50 border border-transparent")
            }`}
          >
            One-way
          </button>
          <button
            type="button"
            onClick={() => setQuery({ ...query, flightType: "round-trip" })}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              query.flightType === "round-trip"
                ? (isDarkMode ? "bg-blue-900 bg-opacity-30 text-blue-400 border border-blue-800" : "bg-blue-50 text-blue-600 border border-blue-200")
                : (isDarkMode ? "text-slate-400 hover:bg-slate-800 border border-transparent" : "text-slate-500 hover:bg-slate-50 border border-transparent")
            }`}
          >
            Round-trip
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Origin and Destination Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Departure City/Airport</label>
            <div className="relative">
              <PlaneTakeoff className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="departure_input"
                type="text"
                placeholder="Where from? e.g., London (LHR)"
                value={query.departure}
                onChange={(e) => setQuery({ ...query, departure: e.target.value })}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500 transition-all font-medium ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
                    : "border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white shadow-3xs"
                }`}
                required
              />
            </div>
          </div>

          <div className="relative">
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Destination City/Airport</label>
            <div className="relative">
              <PlaneLanding className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="destination_input"
                type="text"
                placeholder="Where to? e.g., Tokyo (TYO)"
                value={query.destination}
                onChange={(e) => setQuery({ ...query, destination: e.target.value })}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500 transition-all font-medium ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500"
                    : "border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white shadow-3xs"
                }`}
                required
              />
            </div>
          </div>
        </div>

        {/* Departure and Return Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Departure Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="departure_date_input"
                type="date"
                value={query.departureDate}
                onChange={(e) => setQuery({ ...query, departureDate: e.target.value })}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500 transition-all font-medium ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800 text-slate-100"
                    : "border-slate-200 text-slate-800 bg-white shadow-3xs"
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Return Date <span className="text-slate-400 font-light">(Optional)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="return_date_input"
                type="date"
                value={query.returnDate}
                onChange={(e) => setQuery({ ...query, returnDate: e.target.value })}
                disabled={query.flightType === "one-way"}
                placeholder="One-way flight"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-all font-medium focus:outline-none focus:border-blue-500 ${
                  query.flightType === "one-way"
                    ? (isDarkMode ? "bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed")
                    : (isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "border-slate-200 text-slate-800 bg-white shadow-3xs")
                }`}
              />
            </div>
          </div>
        </div>

        {/* Cabin Class Selection Block */}
        <div>
          <label className={`block text-xs font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Cabin / Travel Class</label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <select
              id="cabin_class_select"
              value={query.cabinClass}
              onChange={(e: any) => setQuery({ ...query, cabinClass: e.target.value })}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500 font-medium ${
                isDarkMode
                  ? "bg-slate-950 border-slate-800 text-slate-200"
                  : "border-slate-200 text-slate-700 bg-white shadow-3xs"
              }`}
            >
              <option value="economy" className={isDarkMode ? "bg-slate-900 text-slate-200" : ""}>Economy Class</option>
              <option value="premium-economy" className={isDarkMode ? "bg-slate-900 text-slate-200" : ""}>Premium Economy</option>
              <option value="business" className={isDarkMode ? "bg-slate-900 text-slate-200" : ""}>Business Class</option>
              <option value="first" className={isDarkMode ? "bg-slate-900 text-slate-200" : ""}>First Class</option>
            </select>
          </div>
        </div>

        {/* Cabin Selection & Config Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              id="advanced_toggle_btn"
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Settings className="h-3 w-3" />
              {showAdvanced ? "Hide travel options" : "Show travel preferences"}
            </button>
          </div>

          {showAdvanced && (
            <div className={`p-4 border rounded-xl space-y-3 ${
              isDarkMode ? "bg-slate-950 border-slate-805 border-slate-800" : "bg-opacity-30 bg-slate-50 border-slate-100"
            }`}>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Agent Search Criteria / Preferences
                </label>
                <textarea
                  id="preferences_input"
                  placeholder="e.g., Max 1 stop, Star Alliance preferred, avoid early mornings..."
                  value={query.preferences}
                  onChange={(e) => setQuery({ ...query, preferences: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500 ${
                    isDarkMode 
                      ? "bg-slate-900 border-slate-800 text-slate-200" 
                      : "border-slate-200 text-slate-700 bg-white"
                  }`}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <motion.button
          id="search_flights_btn"
          type="submit"
          disabled={isLoading || !query.departure.trim() || !query.destination.trim()}
          whileHover={{ scale: isLoading ? 1 : 1.015 }}
          whileTap={{ scale: isLoading ? 1 : 0.985 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={`w-full py-3 px-4 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all focus:outline-none overflow-hidden relative ${
            isLoading || !query.departure.trim() || !query.destination.trim()
              ? (isDarkMode ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-300 text-slate-500 cursor-not-allowed")
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ x: [-20, 40], opacity: [0, 1, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              >
                <Plane className="h-4 w-4 rotate-45 text-white" />
              </motion.div>
              <span>Consulting Agent Search Grounding...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              <span>Launch Search Agent</span>
            </div>
          )}
        </motion.button>
      </form>

      {/* Suggested Routes / Quick Presets */}
      <div className={`mt-5 pt-4 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Suggested Search Presets
        </h4>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((preset, idx) => (
            <button
              id={`preset_btn_${idx}`}
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => selectPreset(preset.from, preset.to)}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isDarkMode 
                  ? "border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-150 hover:bg-slate-100 text-slate-600 shadow-3xs"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
