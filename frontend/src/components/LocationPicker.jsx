import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER = [20.5937, 78.9629];
const INDIA_BOUNDS = L.latLngBounds([6.5, 68], [35.5, 97.5]);

// Fix default marker icon in Leaflet when using bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export function LocationPicker({ lat, lng, onSelect, onMapSelect, label = 'Location (India)', showRadius, radiusKm, onRadiusChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onMapSelectRef = useRef(onMapSelect);
  onMapSelectRef.current = onMapSelect;

  const initialLat = lat ? Number(lat) : INDIA_CENTER[0];
  const initialLng = lng ? Number(lng) : INDIA_CENTER[1];

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([initialLat, initialLng], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.setMaxBounds(INDIA_BOUNDS.pad(0.1));
    const notifyMapSelect = (latlng) => {
      onMapSelectRef.current?.(latlng.lat, latlng.lng);
    };
    const updateMarker = (latlng, fromUserInteraction = false) => {
      if (markerRef.current) markerRef.current.setLatLng(latlng);
      else {
        markerRef.current = L.marker(latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onSelect(pos.lat, pos.lng);
          notifyMapSelect(pos);
        });
      }
      onSelect(latlng.lat, latlng.lng);
      if (fromUserInteraction) notifyMapSelect(latlng);
    };

    map.on('click', (e) => updateMarker(e.latlng, true));

    if (lat && lng) {
      updateMarker(L.latLng(Number(lat), Number(lng)), false);
    }

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map) return;
    const latN = lat ? Number(lat) : null;
    const lngN = lng ? Number(lng) : null;
    if (latN != null && lngN != null) {
      if (marker) marker.setLatLng([latN, lngN]);
      else markerRef.current = L.marker([latN, lngN]).addTo(map);
    }
  }, [lat, lng]);

  return (
    <div className="card-nb space-y-2">
      <div className="text-sm font-bold uppercase text-black/70">{label}</div>
      <p className="text-xs text-black/60">Click the map to set location (India). Drag the marker to adjust.</p>
      <div ref={mapRef} className="w-full h-64 border-[3px] border-black z-0 [&_.leaflet-container]:rounded-none" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-bold mb-1 text-sm">Latitude</label>
          <input
            type="text"
            value={lat ?? ''}
            onChange={(e) => onSelect(e.target.value || '', lng ?? '')}
            className="input-nb"
            placeholder="e.g. 12.97"
          />
        </div>
        <div>
          <label className="block font-bold mb-1 text-sm">Longitude</label>
          <input
            type="text"
            value={lng ?? ''}
            onChange={(e) => onSelect(lat ?? '', e.target.value || '')}
            className="input-nb"
            placeholder="e.g. 77.59"
          />
        </div>
      </div>
      {showRadius && (
        <div>
          <label className="block font-bold mb-1 text-sm">Search radius</label>
          <select
            value={radiusKm ?? 25}
            onChange={(e) => onRadiusChange?.(Number(e.target.value))}
            className="input-nb"
          >
            {[5, 10, 25, 50, 100].map((km) => (
              <option key={km} value={km}>{km} km</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
