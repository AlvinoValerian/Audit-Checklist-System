"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GeofenceMapProps {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  storeName: string;
}

export default function GeofenceMap({
  latitude,
  longitude,
  radius,
  storeName,
}: GeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Cleanup previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 17,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // CartoDB Positron - Clean, aesthetic light tiles
    const cartoApiKey =
      process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() ||
      "cb1_487k_1_803aeda913479a5e5cd35779";
    const tileUrl = cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Geofence Circle (Radius)
    const circle = L.circle([latitude, longitude], {
      color: "#0284c7", // Sky 600
      fillColor: "#38bdf8", // Sky 400
      fillOpacity: 0.18,
      weight: 2,
      dashArray: "4, 4",
      radius: radius,
    }).addTo(map);

    // Outer subtle boundary ring
    L.circle([latitude, longitude], {
      color: "#93c5fd",
      fillOpacity: 0.05,
      weight: 1,
      radius: radius * 1.35,
    }).addTo(map);

    // Custom DivIcon for Store Marker
    const initialLetter =
      storeName.replace(/toko\s*/i, "").charAt(0) || storeName.charAt(0);

    const storeIconHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-50%, -50%); pointer-events: none;">
        <div style="position: relative; width: 38px; height: 38px; border-radius: 50%; background: #193f53; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(25, 63, 83, 0.35); border: 2.5px solid #ffffff;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>
        <div style="margin-top: 4px; padding: 2px 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 9999px; font-size: 10px; font-weight: 700; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap;">
          ${storeName}
        </div>
      </div>
    `;

    const customMarkerIcon = L.divIcon({
      html: storeIconHtml,
      className: "geofence-store-marker",
      iconSize: [0, 0],
    });

    L.marker([latitude, longitude], { icon: customMarkerIcon }).addTo(map);

    // Zoom buttons in top-right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map);

    // Fit bounds to circle nicely
    map.fitBounds(circle.getBounds(), { padding: [30, 30] });

    // Handle container resize when modal opens
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, radius, storeName]);

  return (
    <div className="relative w-full h-52 sm:h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Subtle bottom radar indicator */}
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-xs border border-slate-200/80 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-600 flex items-center gap-1.5 shadow-2xs pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
        <span>Radius Geofence: {radius}M Aktif</span>
      </div>
    </div>
  );
}
