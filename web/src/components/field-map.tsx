'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export type Pin = { lat: number; lng: number };

// Board-green pin with a marigold dot, drawn inline so no image request is needed.
const icon = L.divIcon({
  className: '',
  html: '<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C7 29 2 22 2 15a15 15 0 0 1 30 0c0 7-5 14-15 28z" fill="#123F2C"/><circle cx="17" cy="15" r="6" fill="#F5B800"/></svg>',
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

const LATUR = { lat: 18.4, lng: 76.57 };

function Follow({ pin }: { pin: Pin | null }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.setView(pin, 16, { animate: true });
  }, [pin, map]);
  return null;
}

function Tap({ onTap }: { onTap?: (p: Pin) => void }) {
  useMapEvents({ click: (e) => onTap?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** OpenStreetMap view of the farmer's field. Tapping places the pin only when `onTap` is given (demo mode). */
export default function FieldMap({
  pin,
  accuracyM,
  onTap,
}: {
  pin: Pin | null;
  accuracyM: number | null;
  onTap?: (p: Pin) => void;
}) {
  return (
    <MapContainer
      center={pin ?? LATUR}
      zoom={pin ? 16 : 10}
      scrollWheelZoom={false}
      attributionControl
    >
      {/* shortcut: public OSM tiles are fine for development and demos; use a paid tile provider or self-hosted tiles before launch (OSM tile usage policy). */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        maxZoom={19}
      />
      {pin ? <Marker position={pin} icon={icon} /> : null}
      {pin && accuracyM ? (
        <Circle
          center={pin}
          radius={accuracyM}
          pathOptions={{ color: '#1E4FD0', weight: 1, fillOpacity: 0.12 }}
        />
      ) : null}
      <Follow pin={pin} />
      <Tap onTap={onTap} />
    </MapContainer>
  );
}
