import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPlatformColor, getPlatformEmoji, getPlatformName } from './PlatformBadge';

// Fix default marker icons in webpack/vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Shop {
  id: string;
  platform: string;
  name: string;
  lat: number;
  lng: number;
  area: string;
  city: string;
  distance_km?: number;
}

interface MiniMapProps {
  userLat: number;
  userLng: number;
  shops: Shop[];
  height?: string;
}

export const MiniMap = ({ userLat, userLng, shops, height = '200px' }: MiniMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([userLat, userLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // User location marker — pulsing blue dot
    const userIconHtml = `
      <div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:-4px;border-radius:50%;background:#3B82F6;opacity:0.3;animation:pulse 1.5s infinite;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:#3B82F6;border:2px solid white;box-shadow:0 2px 6px rgba(59,130,246,0.4);"></div>
      </div>
      <style>
        @keyframes pulse {
          0%,100%{transform:scale(1);opacity:0.3}
          50%{transform:scale(1.5);opacity:0}
        }
      </style>
    `;
    const userIcon = L.divIcon({
      html: userIconHtml,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<div style="font-family:sans-serif;font-size:11px;font-weight:bold">📍 You are here</div>');

    // Shop markers with platform emoji badges
    shops.forEach((shop) => {
      const color = getPlatformColor(shop.platform);
      const emoji = getPlatformEmoji(shop.platform);
      const platformName = getPlatformName(shop.platform);

      const shopIconHtml = `
        <div style="position:relative;cursor:pointer;">
          <div style="width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px ${color}60;display:flex;align-items:center;justify-content:center;font-size:13px;">
            ${emoji}
          </div>
          <div style="position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.15);">
            <div style="width:6px;height:6px;border-radius:50%;background:${color};"></div>
          </div>
        </div>
      `;

      const shopIcon = L.divIcon({
        html: shopIconHtml,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([shop.lat, shop.lng], { icon: shopIcon }).addTo(map);

      marker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;min-width:140px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:14px">${emoji}</span>
            <strong style="color:${color};font-size:13px">${shop.name}</strong>
          </div>
          <div style="color:#666;font-size:11px;margin-bottom:2px">${shop.area}, ${shop.city}</div>
          ${shop.distance_km ? `<div style="color:#3B82F6;font-weight:bold;font-size:11px">📍 ${shop.distance_km.toFixed(1)} km away</div>` : ''}
          <div style="margin-top:4px;padding-top:4px;border-top:1px solid #eee;font-size:10px;color:#888">${platformName} Dark Store</div>
        </div>`,
        { offset: [0, -8] }
      );
    });

    // Fit bounds to include user and all shops
    if (shops.length > 0) {
      const bounds = L.latLngBounds([[userLat, userLng]]);
      shops.forEach((s) => bounds.extend([s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [userLat, userLng, shops]);

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: '12px' }} className="z-0" />;
};
