"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface AuditPointPickerMapProps {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  onChangeLocation: (lat: number, lng: number) => void;
}

export default function AuditPointPickerMap({
  latitude,
  longitude,
  radius,
  onChangeLocation,
}: AuditPointPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: false,
      scrollWheelZoom: true,
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
      color: "#38bdf8", // Sky 400
      fillColor: "#0284c7", // Sky 600
      fillOpacity: 0.15,
      weight: 2,
      radius: radius,
    }).addTo(map);
    circleRef.current = circle;

    // Red Pin DivIcon
    const redPinHtml = `
      <div style="transform: translate(-50%, -100%); pointer-events: auto; cursor: grab;">
        <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4); border: 2.5px solid #ffffff;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: white;"></div>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ef4444; margin: -2px auto 0;"></div>
      </div>
    `;

    const pinIcon = L.divIcon({
      html: redPinHtml,
      className: "audit-picker-pin",
      iconSize: [0, 0],
    });

    // Draggable Marker
    const marker = L.marker([latitude, longitude], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // Handle marker drag
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeLocation(pos.lat, pos.lng);
      circle.setLatLng(pos);
    });

    // Handle map click
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      circle.setLatLng([lat, lng]);
      onChangeLocation(lat, lng);
    });

    // Zoom buttons in top-right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(map);

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
  }, []);

  // Update map and marker when lat/lng change from inputs or geolocation
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    const currentLatLng = markerRef.current.getLatLng();
    if (
      Math.abs(currentLatLng.lat - latitude) > 0.000001 ||
      Math.abs(currentLatLng.lng - longitude) > 0.000001
    ) {
      markerRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude]);

  // Update circle radius when radius preset changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  return (
    <div className="relative w-full h-[270px] sm:h-[290px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Floating Bottom Info Pill (Lat, Long & Geofence Badge) */}
      <div className="absolute bottom-2.5 inset-x-2.5 z-[400] flex items-center justify-between bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-sm pointer-events-none">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Lat: <strong className="font-bold text-slate-900">{latitude.toFixed(6)}</strong>, Long:{" "}
            <strong className="font-bold text-slate-900">{longitude.toFixed(6)}</strong>
          </span>
        </div>

        <div className="bg-[#eef6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
          GEOFENCE: {radius}M
        </div>
      </div>
    </div>
  );
}
