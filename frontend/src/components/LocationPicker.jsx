import { useEffect, useMemo, useState } from "react";
import { CircleMarker, LayersControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button } from "./UI";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function resolveCenter(lookups, values, regencyField, districtField, latField, lngField) {
  const district = lookups.districts?.find((item) => item.value === values[districtField]);
  const regency = lookups.regencies?.find((item) => item.value === values[regencyField]);
  return [
    Number(values[latField] ?? district?.latitude ?? regency?.latitude ?? -8.657),
    Number(values[lngField] ?? district?.longitude ?? regency?.longitude ?? 121.079)
  ];
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    }
  });
  return null;
}

export function LocationPicker({ label, lookups, values, latField, lngField, regencyField, districtField, onChange, height = 320 }) {
  const center = useMemo(() => resolveCenter(lookups, values, regencyField, districtField, latField, lngField), [lookups, values, regencyField, districtField, latField, lngField]);
  const dynamicZoom = values[districtField] ? 12 : values[regencyField] ? 10 : 8;
  const [position, setPosition] = useState(() => {
    const lat = values[latField];
    const lng = values[lngField];
    return lat && lng ? [Number(lat), Number(lng)] : center;
  });

  const visibleWaterSources = useMemo(() => (
    (lookups.waterSources || []).filter((item) => {
      if (values[districtField] && item.districtCode !== values[districtField]) return false;
      if (values[regencyField] && item.regencyCode !== values[regencyField]) return false;
      return true;
    })
  ), [lookups.waterSources, values, districtField, regencyField]);

  useEffect(() => {
    const lat = values[latField];
    const lng = values[lngField];
    if (lat !== undefined && lat !== "" && lng !== undefined && lng !== "") {
      setPosition([Number(lat), Number(lng)]);
      return;
    }
    setPosition(center);
  }, [values, latField, lngField, center]);

  const pickLocation = (latlng) => {
    const nextLat = Number(latlng.lat).toFixed(6);
    const nextLng = Number(latlng.lng).toFixed(6);
    onChange(latField, nextLat);
    onChange(lngField, nextLng);
    setPosition([Number(nextLat), Number(nextLng)]);
  };

  const resetToRegion = () => {
    onChange(latField, Number(center[0]).toFixed(6));
    onChange(lngField, Number(center[1]).toFixed(6));
    setPosition(center);
  };

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
          <p className="mt-1 text-xs text-slate-500">Klik peta satelit untuk memilih titik lokasi. Picker dibuat ringan agar input Poktan dan Petani tetap lancar.</p>
        </div>
        <Button type="button" variant="secondary" onClick={resetToRegion}>Pusatkan ke wilayah</Button>
      </div>
      <div style={{ height }} className="overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer center={center} zoom={dynamicZoom} scrollWheelZoom preferCanvas className="h-full w-full">
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satelit">
              <TileLayer attribution='Tiles &copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Peta standar">
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay name="Label wilayah">
              <TileLayer attribution='Tiles &copy; Esri' url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.Overlay>
          </LayersControl>
          <ChangeView center={position || center} zoom={dynamicZoom} />
          <ClickHandler onPick={pickLocation} />
          {visibleWaterSources.map((source) => (
            <CircleMarker key={source.value} center={[Number(source.latitude), Number(source.longitude)]} radius={5} pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.8, weight: 1.5 }} />
          ))}
          {position ? <Marker position={position} icon={markerIcon} /> : null}
        </MapContainer>
      </div>
      <div className="flex flex-col gap-2 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>Koordinat aktif: {values[latField] || Number(position?.[0] ?? center[0]).toFixed(6)} , {values[lngField] || Number(position?.[1] ?? center[1]).toFixed(6)}</p>
        <p>{visibleWaterSources.length} titik sumber air lokal tampil pada area yang dipilih.</p>
      </div>
    </div>
  );
}
