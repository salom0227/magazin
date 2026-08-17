import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass, AlertCircle, Loader2, Check } from 'lucide-react';

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (loc: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    region?: string;
    district?: string;
    street?: string;
  }) => void;
}

// Fix Leaflet marker icon asset issue
const customIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `<div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background-color: #7000ff; color: white; border-radius: 50%; box-shadow: 0 4px 14px rgba(112,0,255,0.45); border: 3px solid white; transform: translate(-50%, -50%);">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [0, 0],
});

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat = 41.311081, // Default Tashkent
  initialLng = 69.240562,
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [addressText, setAddressText] = useState<string>('Toshkent shahri');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Reverse geocoding using OSM Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    setLocationError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'uz,ru,en',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.address || {};
        const road = address.road || address.pedestrian || address.neighbourhood || '';
        const suburb = address.suburb || address.district || address.city_district || '';
        const city = address.city || address.town || address.state || 'Toshkent';
        const houseNumber = address.house_number || '';

        const formatted = data.display_name || `${city}, ${suburb} ${road} ${houseNumber}`.trim();
        setAddressText(formatted);

        onLocationSelect({
          latitude: lat,
          longitude: lng,
          formattedAddress: formatted,
          region: city,
          district: suburb,
          street: `${road} ${houseNumber}`.trim(),
        });
      } else {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddressText(fallback);
        onLocationSelect({
          latitude: lat,
          longitude: lng,
          formattedAddress: fallback,
        });
      }
    } catch {
      const fallback = `Koordinata: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddressText(fallback);
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        formattedAddress: fallback,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add custom zoom controls on top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng();
        setCoords({ lat: newPos.lat, lng: newPos.lng });
        reverseGeocode(newPos.lat, newPos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Initial reverse geocode
      reverseGeocode(coords.lat, coords.lng);
    }

    return () => {
      // clean up on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Browser Geolocation trigger
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setLocationError("Brauzeringizda Geolocation qo'llab-quvvatlanmaydi");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });
          markerRef.current.setLatLng([latitude, longitude]);
        }

        reverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        let msg = "Joylashuvni aniqlab bo'lmadi";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Geolokatsiya ruxsati berilmadi. Iltimos, xaritadan o'zingiz tanlang yoki manzilni qo'lda kiriting.";
        }
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200/60 px-3 py-1.5 rounded-lg">
          <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Xaritada nuqtani belgilang yoki sudrang</span>
        </div>

        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isLocating}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Aniqlanmoqda...</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5" />
              <span>Mening joylashuvim</span>
            </>
          )}
        </button>
      </div>

      {locationError && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-[220px] sm:h-[260px] rounded-xl overflow-hidden border border-gray-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Selected location display */}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Compass className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-gray-800 block">Belgilangan nuqta manzili:</span>
              <p className="text-gray-600 mt-0.5 line-clamp-2">
                {isGeocoding ? 'Manzil aniqlanmoqda...' : addressText}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-gray-600 font-mono block">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
