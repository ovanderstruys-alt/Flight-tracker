import React, { useEffect, useRef, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plane, Compass, RotateCcw, HelpCircle, Navigation } from "lucide-react";
import { resolveAirport } from "../airportEngine";

interface FlightMapProps {
  originCode: string;
  destinationCode: string;
  isDarkMode: boolean;
}

// Map helper to resolve GPS coordinates and airport details
const getGPSCoordinates = (inputString: string) => {
  const airport = resolveAirport(inputString);
  return {
    lat: airport.lat,
    lng: airport.lng,
    code: airport.code,
    name: airport.name,
    city: airport.city,
    country: airport.country,
  };
};

// Generates Bezier points curve
const getBezierPoints = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  numPoints = 120
): [number, number][] => {
  const points: [number, number][] = [];
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.hypot(dLat, dLng);

  const len = Math.hypot(dLng, dLat) || 1;
  const perpLat = -dLng / len;
  const perpLng = dLat / len;

  // Curvature height proportional to absolute travel distance
  const height = dist * 0.18;
  const ctrlLat = midLat + perpLat * height;
  const ctrlLng = midLng + perpLng * height;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
};

// Angle calculation for bearing
const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

// Haversine distance solver
const getHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return {
    km: Math.round(d),
    miles: Math.round(d * 0.621371),
  };
};

export default function FlightMap({ originCode, destinationCode, isDarkMode }: FlightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const animationRef = useRef<number | null>(null);

  const origin = useMemo(() => getGPSCoordinates(originCode), [originCode]);
  const destination = useMemo(() => getGPSCoordinates(destinationCode), [destinationCode]);

  const stats = useMemo(
    () => getHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng),
    [origin, destination]
  );

  // Initialize and update map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove existing map instance cleanly
    if (mapInstanceRef.current) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [25, 0],
      zoom: 2,
      zoomControl: true,
      minZoom: 1.5,
      maxZoom: 10,
    });

    mapInstanceRef.current = map;

    // Use Beautiful styled CartoDB Tiles (requires NO API key)
    const tileUrl = isDarkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const attribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>';

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 10,
    }).addTo(map);

    // Custom CSS Markers using L.divIcon
    const originHTML = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-2 bg-blue-500 rounded-full animate-ping opacity-20"></div>
        <div class="h-7 w-7 rounded-sm bg-blue-600 border border-white flex flex-col items-center justify-center shadow-lg transform rotate-45">
          <div class="transform -rotate-45 flex flex-col items-center justify-center">
            <span class="text-[8px] font-black text-white leading-none">${origin.code}</span>
          </div>
        </div>
      </div>
    `;

    const destHTML = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-2 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
        <div class="h-7 w-7 rounded-sm bg-emerald-600 border border-white flex flex-col items-center justify-center shadow-lg transform rotate-45">
          <div class="transform -rotate-45 flex flex-col items-center justify-center">
            <span class="text-[8px] font-black text-white leading-none">${destination.code}</span>
          </div>
        </div>
      </div>
    `;

    const originMarker = L.marker([origin.lat, origin.lng], {
      icon: L.divIcon({
        html: originHTML,
        className: "custom-airport-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    })
      .addTo(map)
      .bindPopup(
        `<strong class="font-bold text-slate-800">${origin.name}</strong><br/><span class="text-xs text-slate-500">Departure Airport</span>`
      );

    const destMarker = L.marker([destination.lat, destination.lng], {
      icon: L.divIcon({
        html: destHTML,
        className: "custom-airport-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    })
      .addTo(map)
      .bindPopup(
        `<strong class="font-bold text-slate-800">${destination.name}</strong><br/><span class="text-xs text-slate-500">Arrival Destination</span>`
      );

    // Draw curvature path polyline
    const curvePoints = getBezierPoints(origin.lat, origin.lng, destination.lat, destination.lng);

    // Dotted flight trajectory trail
    L.polyline(curvePoints, {
      color: isDarkMode ? "#38bdf8" : "#2563eb",
      weight: 2,
      dashArray: "3, 6",
      opacity: 0.9,
    }).addTo(map);

    // Background shadow glow line
    L.polyline(curvePoints, {
      color: isDarkMode ? "#0284c7" : "#bfdbfe",
      weight: 7,
      opacity: 0.25,
    }).addTo(map);

    // Create custom plane icon
    const planeIconHTML = `
      <div class="leaflet-animated-plane text-blue-500 flex items-center justify-center" style="width: 24px; height: 24px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500 drop-shadow-md">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5z"/>
        </svg>
      </div>
    `;

    const planeMarker = L.marker(curvePoints[0], {
      icon: L.divIcon({
        html: planeIconHTML,
        className: "plane-div-container",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(map);

    // Loop-based smoother anim frame updates
    let tick = 0;
    const totalTicks = curvePoints.length;

    animationRef.current = window.setInterval(() => {
      if (!mapInstanceRef.current) return;

      if (tick >= totalTicks - 1) {
        tick = 0; // loop
      } else {
        tick++;
      }

      const currentPoint = curvePoints[tick];
      const nextPoint = curvePoints[Math.min(tick + 1, totalTicks - 1)];

      planeMarker.setLatLng(currentPoint);

      const bearing = getBearing(currentPoint[0], currentPoint[1], nextPoint[0], nextPoint[1]);

      const markerElement = planeMarker.getElement();
      if (markerElement) {
        const iconDiv = markerElement.querySelector(".leaflet-animated-plane") as HTMLElement;
        if (iconDiv) {
          iconDiv.style.transform = `rotate(${bearing}deg)`;
        }
      }
    }, 45); // highly smooth fluid FPS

    // Zoom/fit map bounding box nicely
    const bounds = L.latLngBounds([origin.lat, origin.lng], [destination.lat, destination.lng]);
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 6,
    });

    // Invalidate map layout size helper (prevents weird Leaflet resizing grid glitch)
    const timeoutId = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [origin, destination, isDarkMode]);

  // Reset to original Zoom/Position
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([origin.lat, origin.lng], [destination.lat, destination.lng]);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 6,
      });
    }
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
        isDarkMode
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-slate-150 border-slate-200 text-slate-800"
      }`}
    >
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
              isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600 border border-blue-100"
            }`}
          >
            <Compass className="h-4 w-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              Interactive Flight Navigator Map
              <span className="bg-emerald-500 text-white font-mono font-bold text-[8px] px-1 rounded-sm uppercase tracking-normal animate-pulse">
                Live
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Drag, zoom, and panning supported. Discover the exact countries and terrain on the route.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleRecenter}
            title="Recenter flight view"
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
              isDarkMode
                ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-3xs"
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            Recenter
          </button>

          <div className="flex items-center gap-1.5 text-[10.5px] font-medium">
            <span
              className={`px-2.5 py-1 rounded-md ${
                isDarkMode ? "bg-slate-800 text-blue-300 border border-slate-700" : "bg-blue-50 text-blue-800 font-semibold border border-blue-100"
              }`}
            >
              {origin.city} ({origin.code})
            </span>
            <span className="text-slate-400 font-mono">→</span>
            <span
              className={`px-2.5 py-1 rounded-md ${
                isDarkMode ? "bg-slate-800 text-emerald-300 border border-slate-700" : "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100"
              }`}
            >
              {destination.city} ({destination.code})
            </span>
          </div>
        </div>
      </div>

      {/* Actual Live Map Div Element */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-inner border border-slate-350 border-opacity-30">
        <div
          ref={mapContainerRef}
          style={{ height: "380px" }}
          className="w-full z-10 rounded-xl"
        />

        {/* Dynamic Flying Stats Card inside Map */}
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none select-none">
          <div
            className={`px-3 py-2 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 animate-fade-in ${
              isDarkMode
                ? "bg-slate-900/90 border-slate-800 text-slate-100"
                : "bg-white/90 border-slate-200 text-slate-800"
            }`}
          >
            <div className={`p-1 w-7 h-7 flex items-center justify-center rounded-lg ${
              isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-600"
            }`}>
              <Navigation className="h-3.5 w-3.5 transform rotate-45" />
            </div>
            <div>
              <p className="text-[9px] text-slate-415 font-bold uppercase tracking-wider text-slate-400">
                Route Distance
              </p>
              <p className="text-xs font-extrabold font-mono text-blue-500">
                {stats.miles.toLocaleString()} miles <span className="text-slate-400 font-normal">/</span> {stats.km.toLocaleString()} km
              </p>
            </div>
          </div>
        </div>

        {/* Info Helper Tooltip overlay */}
        <div className="absolute top-3 right-3 z-[1000] flex gap-1.5 pointer-events-none">
          <span className="px-2 py-1 text-[9px] font-medium rounded-lg bg-slate-900/80 backdrop-blur-xs text-white border border-slate-800 flex items-center gap-1 shadow-md">
            <HelpCircle className="h-3 w-3" />
            Scroll to Zoom / Drag to Pan
          </span>
        </div>
      </div>

      {/* Legend with brief instructions */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-dashed border-opacity-40 gap-2 ${
        isDarkMode ? "border-slate-800" : "border-slate-300"
      }`}>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded bg-blue-600 border border-white shrink-0 shadow-3xs"></span>
            <span>Origin Airport ({origin.code})</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600 border border-white shrink-0 shadow-3xs"></span>
            <span>Destination ({destination.code})</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-[2px] bg-blue-500 shrink-0"></span>
            <span>Trajectory Path</span>
          </div>
        </div>
        <p className="text-[9px] text-right italic text-slate-400/80">
          Showing calculated Great Circle route with custom Bezier climb-profile projections
        </p>
      </div>
    </div>
  );
}
