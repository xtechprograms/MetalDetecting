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
import type { Find } from "@/types/database";
import { FIND_CATEGORIES, formatCoordinates, formatDate } from "@/lib/utils";
import { findPinIcon, historyIcon, selectedIcon } from "./leafletIcons";
import Link from "next/link";
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
  onHistoryMarkerClick?: (id: string) => void;
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
  onHistoryMarkerClick,
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
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={historyIcon}
          eventHandlers={{
            click: () => onHistoryMarkerClick?.(marker.id),
          }}
        >
          <Popup>
            <div className="min-w-0 max-w-[220px]">
              <p className="font-semibold text-gold-400 text-sm">{marker.title}</p>
              {marker.label && <p className="text-xs text-slate-500 mt-1">{marker.label}</p>}
              {onHistoryMarkerClick && (
                <button
                  type="button"
                  onClick={() => onHistoryMarkerClick(marker.id)}
                  className="text-xs text-gold-500 hover:underline mt-2 block"
                >
                  View history
                </button>
              )}
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
            icon={findPinIcon}
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
                {find.is_anonymous !== false ? (
                  <p className="text-xs text-slate-500 mt-1">Anonymous detectorist</p>
                ) : (
                  find.profiles && (
                    <Link
                      href={`/profile/${find.profiles.username}`}
                      className="text-xs text-gold-500 hover:underline mt-1 block"
                    >
                      by @{find.profiles.username}
                    </Link>
                  )
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
