/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import FlightForm from "./components/FlightForm";
import FlightMap from "./components/FlightMap";
import { SearchQuery, SearchResult, ChatMessage, Flight, GroundingSource } from "./types";
import { buildGoogleFlightsUrl, buildSkyscannerUrl } from "./airportEngine";
import { motion } from "motion/react";
import {
  Plane,
  ArrowRight,
  Clock,
  DollarSign,
  Globe,
  Sparkles,
  Send,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  Calendar,
  MessageSquare,
  Compass,
  X,
  Loader2,
  ChevronRight,
  User,
  Info,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"search" | "chat">("search");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchSources, setSearchSources] = useState<GroundingSource[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<SearchQuery | null>(null);
  const [mobileFormExpanded, setMobileFormExpanded] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Pre-fill search inputs
  const handleSearch = async (query: SearchQuery) => {
    setIsSearching(true);
    setSearchError(null);
    setCurrentQuery(query);
    setMobileFormExpanded(false);

    try {
      const response = await fetch("/api/search-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });

      const resData = await response.json();
      if (resData.success) {
        setSearchResult(resData.data);
        setSearchSources(resData.sources || []);
      } else {
        setSearchError(resData.message || "The agent encountered an error summarizing flights.");
      }
    } catch (err: any) {
      setSearchError("Failed to reach search agent server. Please ensure local engine is online.");
    } finally {
      setIsSearching(false);
    }
  };

  const startDiscussingResults = () => {
    if (!searchResult || !currentQuery) return;
    
    // Seed chat with flight options
    const greetingText = `Let's discuss the flights we found from **${currentQuery.departure}** to **${currentQuery.destination}** departing on **${currentQuery.departureDate}** (${currentQuery.cabinClass} class). 

We found **${searchResult.flights.length}** options:
- **Cheapest**: $${searchResult.flights.find(f => f.category === "cheapest")?.price || "N/A"}
- **Fastest**: ${searchResult.flights.find(f => f.category === "fastest")?.duration || "N/A"}

What specific details, layovers, or airline comparisons would you like to inquire about?`;

    setChatMessages([
      {
        id: "system-seed-1",
        role: "assistant",
        content: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ]);
    setActiveTab("chat");
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const chatHistory = [...chatMessages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const resData = await res.json();
      if (resData.success) {
        setChatMessages(prev => [
          ...prev,
          {
            id: "msg-reply-" + Date.now(),
            role: "assistant",
            content: resData.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sources: resData.sources || [],
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: "msg-err-" + Date.now(),
            role: "assistant",
            content: `⚠️ **Agent Error**: ${resData.message || "Failed to process question."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
        ]);
      }
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: "msg-err-network-" + Date.now(),
          role: "assistant",
          content: "⚠️ **Network Error**: Unable to connect to flight search backend.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper colors for different target categories
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "cheapest":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "soonest":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "fastest":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getCategoryThemeIcon = (category: string) => {
    switch (category) {
      case "cheapest":
        return <span className="text-emerald-500 font-extrabold">$</span>;
      case "soonest":
        return <span className="text-indigo-500 font-bold">⏱</span>;
      case "fastest":
        return <span className="text-amber-500 font-bold">⚡</span>;
      default:
        return <span className="text-blue-500 font-bold">★</span>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col antialiased transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Upper Premium Header bar */}
      <header className={`border-b sticky top-0 z-40 transition-all duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800 shadow-md animate-fade-in" : "bg-white border-slate-200 shadow-xs"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 sm:gap-3 mr-2 truncate">
              <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center shrink-0">
                <Plane className="h-4 w-4 sm:h-5 sm:w-5 rotate-45 transform" />
              </div>
              <div className="truncate">
                <h1 className={`font-display font-bold text-sm sm:text-lg md:text-xl tracking-tight truncate ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  AeroGround Agent
                </h1>
                <p className={`hidden sm:block text-[10px] md:text-[11px] font-medium truncate ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Grounded flight intelligence</p>
              </div>
            </div>

            {/* View Mode Tabs & Dark Mode Toggle Button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className={`flex p-0.5 sm:p-1 rounded-xl shrink-0 ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>
                <button
                  id="search_tab_btn"
                  onClick={() => setActiveTab("search")}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "search"
                      ? (isDarkMode ? "bg-slate-800 text-blue-400 shadow-sm" : "bg-white text-blue-600 shadow-sm")
                      : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                  }`}
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Terminal</span>
                </button>
                <button
                  id="chat_tab_btn"
                  onClick={() => {
                    setActiveTab("chat");
                    if (chatMessages.length === 0) {
                      setChatMessages([
                        {
                          id: "welcome-1",
                          role: "assistant",
                          content: "Hello! I am your conversational **Flight Butler**. I use Google Search grounding to give you real-time details on airlines, flight rules, luggage rates, airport strategies, or custom layovers.\n\nAsk me anything! For example:\n* *Compare JFK vs Newark for direct flights to Paris*\n* *What is the hand luggage allowance for EasyJet?*\n* *Are there train connections from CDG airport to central Paris?*",
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        }
                      ]);
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "chat"
                      ? (isDarkMode ? "bg-slate-800 text-blue-400 shadow-sm" : "bg-white text-blue-600 shadow-sm")
                      : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Butler Chat</span>
                </button>
              </div>

              {/* Theme Toggle Button */}
              <button
                id="dark_mode_toggle_btn"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Active Light Mode Theme" : "Active Dark Mode Theme"}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 font-bold" 
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-3xs"
                }`}
              >
                {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "search" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Search Input Box */}
            <div className={`lg:col-span-4 space-y-4 ${mobileFormExpanded ? "block" : "hidden lg:block"}`}>
              {/* Mobile collapse block */}
              {mobileFormExpanded && (searchResult || isSearching) && (
                <div className={`lg:hidden flex justify-between items-center p-2.5 rounded-xl border ${
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                }`}>
                  <span className={`text-[11px] font-bold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Flight parameters open</span>
                  <button
                    onClick={() => setMobileFormExpanded(false)}
                    className={`px-3 py-1 border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-3xs ${
                      isDarkMode 
                        ? "bg-slate-800 border-slate-705 border-slate-700 text-slate-300 hover:bg-slate-700" 
                        : "bg-white border-slate-250 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <X className="h-3 w-3 text-slate-400" />
                    Minimize & View Results
                  </button>
                </div>
              )}
              <FlightForm onSearch={handleSearch} isLoading={isSearching} isDarkMode={isDarkMode} />

              <div className={`border rounded-2xl p-4 flex gap-3 ${
                isDarkMode ? "bg-opacity-10 bg-blue-950 border-blue-900" : "bg-blue-50 border-blue-100"
              }`}>
                <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? "text-blue-300" : "text-blue-900"}`}>How Grounding Works</h4>
                  <p className={`text-[11px] leading-relaxed mt-1 ${isDarkMode ? "text-blue-400/90 text-slate-300" : "text-blue-700"}`}>
                    Unlike standard offline models, AeroGround triggers deep programmatic queries using Google Search. It synthesizes real ticket prices, schedules, and carrier routes live.
                  </p>
                </div>
              </div>
            </div>

            {/* Results Terminal Dashboard */}
            <div className="lg:col-span-8 space-y-6">
              {/* Mobile "Refine Search Parameters" Toggle Bar */}
              {!mobileFormExpanded && (
                <div className="lg:hidden w-full">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMobileFormExpanded(true)}
                    className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-blue-600 flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <Compass className="h-4 w-4 text-blue-500" />
                    <span>Refine Flight Search & Preferences</span>
                  </motion.button>
                </div>
              )}
              {isSearching && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="bg-white border border-slate-100 rounded-2xl p-12 text-center space-y-6 shadow-xs relative overflow-hidden"
                >
                  {/* Top animated linear progress bar */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden">
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600 w-1/3"
                    />
                  </div>

                  {/* Flying radar/orbit illustration */}
                  <div className="relative inline-flex items-center justify-center p-6 bg-blue-50 bg-opacity-50 rounded-full">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                      className="absolute inset-0 border border-dashed border-blue-250 border-blue-200 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -6, 0], x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="relative"
                    >
                      <Plane className="h-10 w-10 text-blue-600 rotate-45 transform" />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-semibold text-slate-800 text-lg">
                      Grounding Flight Agent Traveling...
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Our agent is scanning flight databases, carrier schedules, layover options and real-time prices right now.
                    </p>
                  </div>

                  {/* Live status telemetry ticker */}
                  <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
                    <div className="inline-flex gap-2 text-[11px] font-mono bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping self-center"></span>
                      <span className="font-bold text-slate-700 font-sans text-[10px]">AGENT IN PROGRESS:</span>
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-slate-500"
                      >
                        Compiling live flight matrices...
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              )}

              {searchError && (
                <div className="bg-red-50 border border-red-100 text-red-900 rounded-2xl p-6">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                    Grounding Agent Disconnection
                  </h3>
                  <p className="text-xs text-red-700 mt-2 leading-relaxed">
                    {searchError}
                  </p>
                  <p className="text-xs text-red-500 mt-2 font-mono">
                    Please ensure GEMINI_API_KEY is properly provisioned in Google AI Studio setting vaults.
                  </p>
                </div>
              )}

              {!isSearching && !searchError && !searchResult && (
                <div className={`border border-dashed rounded-2xl p-12 text-center ${
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}>
                  <div className={`h-12 w-12 rounded-full inline-flex items-center justify-center mb-3 ${
                    isDarkMode ? "bg-slate-950 text-slate-500" : "bg-slate-50 text-slate-400"
                  }`}>
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className={`font-display font-medium text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Dashboard Uninitialized</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Fill out the flight form on the left or click a direct preset route above to launch our search agent pipeline.
                  </p>
                </div>
              )}

              {!isSearching && !searchError && searchResult && (
                <div className="space-y-6 animate-fade-in">
                  {/* Results Header Meta */}
                  <div className={`rounded-2xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-100"
                  }`}>
                    <div>
                      <h3 className={`font-display font-bold text-base ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                        Flights found for {currentQuery?.departure} to {currentQuery?.destination}
                      </h3>
                      <p className={`text-xs mt-1 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Departs {currentQuery?.departureDate} {currentQuery?.returnDate ? `· Returns ${currentQuery?.returnDate}` : "· One-Way"} · {currentQuery?.cabinClass} Cabin
                      </p>
                    </div>

                    <button
                      id="discuss_results_btn"
                      onClick={startDiscussingResults}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isDarkMode 
                          ? "border-slate-800 bg-slate-950 text-blue-400 hover:bg-slate-800" 
                          : "border-blue-200 text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Discuss results with Butler
                    </button>
                  </div>

                  {/* Live Interactive Flight Routing Map Visualization */}
                  {currentQuery && (
                    <FlightMap
                      originCode={currentQuery.departure}
                      destinationCode={currentQuery.destination}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {/* Expert Advice Segment */}
                  <div className={`bg-gradient-to-r rounded-2xl p-5 text-white shadow-sm relative overflow-hidden ${
                    isDarkMode ? "from-blue-900 to-indigo-950 border border-slate-800" : "from-blue-500 to-blue-700"
                  }`}>
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
                      <Plane className="h-44 w-44" />
                    </div>
                    <div className="relative flex gap-3">
                      <Sparkles className="h-5 w-5 text-blue-200 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-100">
                          Agent Strategy & Advisory Advice
                        </h4>
                        <p className={`text-xs leading-relaxed font-light ${isDarkMode ? "text-slate-200" : "text-slate-100"}`}>
                          {searchResult.advice}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Flight Options Grid list */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Identified Flight Classifications
                    </h4>

                    {searchResult.flights && searchResult.flights.length > 0 ? (
                      searchResult.flights.map((flight) => (
                        <div
                          key={flight.id}
                          className={`border rounded-2xl p-5 transition-all shadow-2xs group relative ${
                            isDarkMode 
                              ? "bg-slate-900 border-slate-800 hover:border-slate-705 hover:bg-slate-850 hover:border-slate-700" 
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Flight Route Carrier Info */}
                            <div className="space-y-3 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                                    flight.category
                                  )} flex items-center gap-1`}
                                >
                                  {getCategoryThemeIcon(flight.category)}
                                  {flight.category}
                                </span>
                                <span className="text-xs font-mono font-medium text-slate-400">
                                  {flight.flightNumber || "Direct Route"}
                                </span>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="space-y-0.5">
                                  <p className={`text-lg sm:text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                    {flight.departureTime || "--:--"}
                                  </p>
                                  <p className={`text-xs font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{flight.origin}</p>
                                </div>

                                <div className="flex flex-col items-center flex-1 max-w-[120px] px-1 text-center">
                                  <span className={`text-[10px] font-semibold font-mono ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {flight.duration || "N/A"}
                                  </span>
                                  <div className={`w-full h-[2px] my-1 relative ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                                    <div className={`absolute right-0 top-1/2 transform translate-y-[-50%] p-0.5 border rounded-full ${
                                      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-300"
                                    }`}>
                                      <Plane className="h-2.5 w-2.5 text-blue-500 rotate-45" />
                                    </div>
                                    {flight.stops > 0 && (
                                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 border border-white"></div>
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-bold uppercase tracking-tight ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`}
                                  </span>
                                </div>

                                <div className="space-y-0.5 text-right">
                                  <p className={`text-lg sm:text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                                    {flight.arrivalTime || "--:--"}
                                  </p>
                                  <p className={`text-xs font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{flight.destination}</p>
                                </div>
                              </div>

                              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-[11px] border-t font-medium ${
                                isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-50 text-slate-500"
                              }`}>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                  Carrier: <strong>{flight.carrier}</strong>
                                </span>
                                {flight.layoverDetails && flight.layoverDetails !== "Direct" && (
                                  <span className="text-slate-400 italic">
                                    ({flight.layoverDetails})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ticket Price & Booking Site */}
                            <div className={`flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6 text-right shrink-0 min-w-[140px] gap-2 ${
                              isDarkMode ? "border-slate-800" : "border-slate-100"
                            }`}>
                              <div className="space-y-0.5 text-left md:text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                                  Est. Rate
                                </span>
                                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight flex items-baseline md:justify-end ${
                                  isDarkMode ? "text-slate-100" : "text-slate-900"
                                }`}>
                                  <span className="text-xs font-bold text-slate-500 mr-0.5">$</span>
                                  {flight.price}
                                </div>
                              </div>

                              <div className="space-y-1.5 w-full">
                                <span className={`text-[10px] md:text-[9px] font-medium block truncate ${
                                  isDarkMode ? "text-slate-400" : "text-slate-500"
                                }`}>
                                  {flight.bookingSource || `via ${flight.carrier}`}
                                </span>
                                
                                {/* Primary Booking Deep Link */}
                                <a
                                  href={
                                    flight.bookingUrl ||
                                    buildGoogleFlightsUrl(
                                      flight.origin.includes("(") ? flight.origin.split("(")[1].replace(")", "") : flight.origin,
                                      flight.destination.includes("(") ? flight.destination.split("(")[1].replace(")", "") : flight.destination,
                                      flight.departureDate,
                                      currentQuery?.returnDate,
                                      flight.carrier
                                    )
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`w-full inline-flex items-center justify-center gap-1.5 border text-xs md:text-[11px] font-bold py-2 md:py-1.5 px-3 rounded-xl md:rounded-lg transition-all cursor-pointer shadow-sm group ${
                                    isDarkMode 
                                      ? "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white" 
                                      : "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
                                  }`}
                                >
                                  <span>Book on Google Flights</span>
                                  <ExternalLink className="h-3 w-3 md:h-2.5 md:w-2.5 opacity-90 group-hover:opacity-100" />
                                </a>

                                {/* Secondary Skyscanner lookup */}
                                <div className="flex items-center justify-center md:justify-end gap-1.5 text-[9.5px]">
                                  <span className="text-slate-400">or compare on</span>
                                  <a
                                    href={
                                      flight.skyscannerUrl ||
                                      buildSkyscannerUrl(
                                        flight.origin.includes("(") ? flight.origin.split("(")[1].replace(")", "") : flight.origin,
                                        flight.destination.includes("(") ? flight.destination.split("(")[1].replace(")", "") : flight.destination,
                                        flight.departureDate
                                      )
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-bold text-sky-500 hover:text-sky-400 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    Skyscanner
                                    <ExternalLink className="h-2 w-2" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`border p-6 text-center rounded-2xl text-xs ${
                        isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                      }`}>
                        No structured flights found in Gemini's parsed grounding response. Use search preferences to modify your query.
                      </div>
                    )}
                  </div>

                  {/* Sources citing */}
                  {searchSources.length > 0 && (
                    <div className={`p-4 rounded-xl border ${
                      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
                    }`}>
                      <h5 className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}>
                        <Info className="h-3 w-3" />
                        AeroGround Verification Sources ({searchSources.length})
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {searchSources.map((source, idx) => (
                          <a
                            id={`source_link_${idx}`}
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`border text-[10px] py-1 px-2.5 rounded-lg inline-flex items-center gap-1 transition-all ${
                              isDarkMode 
                                ? "bg-slate-950 hover:bg-slate-805 border-slate-800 text-blue-400 hover:text-blue-300"
                                : "bg-white hover:border-slate-300 border-slate-205 border-slate-202 border-slate-200 text-blue-600 hover:text-blue-750"
                            }`}
                          >
                            <span className={`truncate max-w-[180px] font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{source.title}</span>
                            <ExternalLink className="h-2 w-2 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`border rounded-2xl shadow-sm flex flex-col h-[calc(100vh-240px)] min-h-[500px] transition-colors duration-300 ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            {/* Top Info status line */}
            <div className={`p-4 border-b flex items-center justify-between rounded-t-2xl ${
              isDarkMode ? "bg-slate-950 border-slate-850 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-100"
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className={`text-xs font-bold ${isDarkMode ? "text-slate-200" : "text-slate-705 text-slate-700"}`}>Flight Planner Chatroom</span>
              </div>
              <p className={`text-[11px] font-mono ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Powered by Google Search Grounding</p>
            </div>

            {/* Response message area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-4xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white" 
                        : (isDarkMode ? "bg-slate-850 text-slate-300 border border-slate-750" : "bg-slate-100 text-slate-700 border border-slate-200")
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Plane className="h-4 w-4 text-blue-400" />}
                  </div>

                  <div className="space-y-1.5 flex-1 max-w-[85%]">
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white font-medium shadow-2xs"
                          : (isDarkMode ? "bg-slate-950 text-slate-200 border border-slate-800" : "bg-slate-50 text-slate-800 border border-slate-100")
                      }`}
                    >
                      {/* Standard split to preserve visual bullet rendering of simple markdown */}
                      <div className="whitespace-pre-line space-y-2">
                        {msg.content.split("\n").map((line, lid) => {
                          if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
                            return (
                              <div key={lid} className="flex gap-2 pl-2">
                                <span className={msg.role === "user" ? "text-blue-105" : "text-blue-400"}>•</span>
                                <span dangerouslySetInnerHTML={{ __html: line.replace(/^\*+\s*|^\-+\s*/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}></span>
                              </div>
                            );
                          }
                          return (
                            <p
                              key={lid}
                              dangerouslySetInnerHTML={{
                                __html: msg.role === "user" 
                                  ? line 
                                  : line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.sources.map((source, sidx) => (
                          <a
                            id={`chat_source_${msg.id}_${sidx}`}
                            key={sidx}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-[10px] py-1 px-2.5 rounded-lg inline-flex items-center gap-1 transition-all border ${
                              isDarkMode 
                                ? "bg-slate-950 hover:bg-slate-900 border-slate-800 text-blue-400 hover:text-blue-305" 
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200"
                            }`}
                          >
                            <span className="truncate max-w-[150px]">{source.title}</span>
                            <ExternalLink className="h-2 w-2 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400 block text-right px-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-3 max-w-lg mr-auto">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border animate-pulse ${
                    isDarkMode ? "bg-blue-950/40 border-blue-900 text-blue-450" : "bg-blue-50 text-blue-600 border-blue-100"
                  }`}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <div className={`border p-4 rounded-2xl text-xs flex items-center gap-2 ${
                      isDarkMode ? "bg-slate-950 text-slate-405 border-slate-800 text-slate-350" : "bg-slate-50 text-slate-500 border-slate-100"
                    }`}>
                      <span>Butler is consulting live travel indexes...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input submission box */}
            <form onSubmit={handleSendChat} className={`p-4 border-t rounded-b-2xl ${
              isDarkMode ? "border-slate-800 bg-slate-900" : "p-4 border-t border-slate-100 bg-white"
            }`}>
              <div className="relative flex items-center">
                <input
                  id="chat_input_field"
                  type="text"
                  placeholder="Inquire about layover lengths, luggage policies, compare airlines, or plan connections..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all font-medium text-slate-800"
                  required
                />
                <button
                  id="send_chat_btn"
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className={`absolute right-2 p-1.5 rounded-lg text-white transition-all cursor-pointer ${
                    !chatInput.trim() || chatLoading
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Aesthetic humbler footer */}
      <footer className={`border-t py-6 mt-12 transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-xs font-semibold font-display ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>AeroGround Verification Terminal</p>
          <p className="text-[10px] text-slate-400 mt-1">
            Data sourced live via structural Google Web Search crawls. Subject to real airline updates.
          </p>
        </div>
      </footer>
    </div>
  );
}
