"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Find } from "@/types/database";
import { FIND_CATEGORIES, formatCoordinates, formatDate } from "@/lib/utils";
import Link from "next/link";

const goldIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #d4a017, #cd7f32);
    border: 3px solid #fef3c7;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(212,160,23,0.5);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = new L.DivIcon({
  className: "custom-marker-selected",
  html: `<div style="
    width: 24px; height: 24px;
    background: #22c55e;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(34,197,94,0.6);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const historyIcon = new L.DivIcon({
  className: "custom-marker-history",
  html: `<div style="
    width: 20px; height: 20px;
    background: #d4a017;
    border: 2px solid #fef3c7;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(212,160,23,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

type HistoryMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  label?: string;
};

type MapInnerProps = {
  finds: Find[];
  center: [number, number];
  zoom: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectable: boolean;
  selectedLocation: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  historyMarkers?: HistoryMarker[];
};

export default function MapInner({
  finds,
  center,
  zoom,
  onLocationSelect,
  selectable,
  selectedLocation,
  radiusKm = null,
  historyMarkers = [],
}: MapInnerProps) {
  const mapFinds = finds.filter(
    (f) => f.show_on_map && f.latitude != null && f.longitude != null
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full z-0"
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} zoom={zoom} />
      {selectable && <MapClickHandler onLocationSelect={onLocationSelect} />}

      {radiusKm != null && radiusKm > 0 && (
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#d4a017",
            fillColor: "#d4a017",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "6 8",
          }}
        />
      )}

      {historyMarkers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={historyIcon}>
          <Popup>
            <div className="min-w-0 max-w-[220px]">
              <p className="font-semibold text-gold-400 text-sm">{marker.title}</p>
              {marker.label && <p className="text-xs text-slate-500 mt-1">{marker.label}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {mapFinds.map((find) => {
        const category = FIND_CATEGORIES.find((c) => c.value === find.category);
        return (
          <Marker
            key={find.id}
            position={[find.latitude!, find.longitude!]}
            icon={goldIcon}
          >
            <Popup>
              <div className="min-w-0 max-w-[240px] sm:max-w-[280px]">
                {find.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={find.photo_url}
                    alt={find.title}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-semibold text-gold-400">
                  {category?.icon} {find.title}
                </p>
                {find.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {find.description}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  {formatCoordinates(find.latitude!, find.longitude!)}
                </p>
                <p className="text-xs text-slate-500">
                  Found {formatDate(find.found_date)}
                </p>
                {find.profiles && (
                  <Link
                    href={`/profile/${find.profiles.username}`}
                    className="text-xs text-gold-500 hover:underline mt-1 block"
                  >
                    by @{find.profiles.username}
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {selectedLocation && (
        <Marker
          position={[selectedLocation.lat, selectedLocation.lng]}
          icon={selectedIcon}
        />
      )}
    </MapContainer>
  );
}
