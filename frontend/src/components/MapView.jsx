import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, LayersControl, MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";
import L from "leaflet";
import { LiveWaterLayer } from "./LiveWaterLayer";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const waterColors = {
  "Mata Air": "#0ea5e9",
  Embung: "#2563eb",
  Irigasi: "#14b8a6",
  "Sumur Bor": "#6366f1",
  Bendung: "#0891b2",
  Sungai: "#38bdf8",
  Reservoir: "#1d4ed8",
  Danau: "#0f766e"
};

function getDefaultCenter(markers, center) {
  if (center?.length === 2) return center;
  if (markers.length > 0) return [Number(markers[0].latitude), Number(markers[0].longitude)];
  return [-8.657, 121.079];
}

function WaterPopup({ source }) {
  return (
    <div className="min-w-44 space-y-1.5">
      <h4 className="font-semibold text-slate-900">{source.name}</h4>
      <p className="text-xs font-medium text-sky-700">{source.type}</p>
      {source.regencyName ? <p className="text-sm text-slate-700">{source.regencyName}</p> : null}
      {source.districtName ? <p className="text-xs text-slate-600">{source.districtName}</p> : null}
      {source.capacityLps ? <p className="text-xs text-slate-600">Debit/kapasitas: {source.capacityLps} L/detik</p> : null}
      {source.reliability ? <p className="text-xs text-slate-600">Keandalan: {source.reliability}</p> : null}
      <p className="text-[11px] text-slate-500">Lat: {Number(source.latitude).toFixed(6)} · Lng: {Number(source.longitude).toFixed(6)}</p>
    </div>
  );
}

function MarkerPopup({ marker }) {
  return (
    <div className="min-w-56 space-y-1.5">
      <h4 className="font-semibold text-slate-900">{marker.name}</h4>
      <p className="text-xs text-slate-500">{marker.category || marker.entityType}</p>
      {marker.regencyName ? <p className="text-sm text-slate-700">{marker.regencyName}</p> : null}
      {marker.districtName ? <p className="text-xs text-slate-600">{marker.districtName}</p> : null}
      {marker.village ? <p className="text-xs text-slate-600">Desa/Kelurahan: {marker.village}</p> : null}
      {marker.location ? <p className="text-xs text-slate-600">Lokasi: {marker.location}</p> : null}
      {marker.status ? <p className="text-xs text-slate-600">Status: {marker.status}</p> : null}
      {marker.nik ? <p className="text-xs text-slate-600">NIK: {marker.nik}</p> : null}
      {marker.chairman ? <p className="text-xs text-slate-600">Ketua: {marker.chairman}</p> : null}
      {marker.chairmanNik ? <p className="text-xs text-slate-600">NIK Ketua: {marker.chairmanNik}</p> : null}
      {marker.nearestWaterSource ? (
        <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <p className="font-semibold">Sumber air terdekat</p>
          <p>{marker.nearestWaterSource.name}</p>
          <p>{marker.nearestWaterSource.type} · {marker.nearestWaterDistanceKm} km · {marker.waterSupportLevel}</p>
        </div>
      ) : null}
    </div>
  );
}

export function MapView({ markers = [], waterSources = [], height = "520px", center = null, zoom = 8, autoOpenFirst = false, showWaterLines = false }) {
  const markerRefs = useRef({});
  const mapCenter = useMemo(() => getDefaultCenter(markers, center), [markers, center]);

  useEffect(() => {
    if (!autoOpenFirst || markers.length === 0) return;
    const timeout = setTimeout(() => markerRefs.current[markers[0].id]?.openPopup(), 250);
    return () => clearTimeout(timeout);
  }, [markers, autoOpenFirst]);

  return (
    <div style={{ height }} className="overflow-hidden rounded-3xl">
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom preferCanvas className="h-full w-full">
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
          <LayersControl.Overlay checked name="Sumber air kurasi lokal">
            <>
              {waterSources.map((source) => (
                <CircleMarker
                  key={source.id}
                  center={[Number(source.latitude), Number(source.longitude)]}
                  radius={6}
                  pathOptions={{ color: waterColors[source.type] || "#0ea5e9", fillColor: waterColors[source.type] || "#0ea5e9", fillOpacity: 0.85, weight: 2 }}
                >
                  <Popup><WaterPopup source={source} /></Popup>
                </CircleMarker>
              ))}
            </>
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Jaringan air internet">
            <LiveWaterLayer minZoom={12} />
          </LayersControl.Overlay>
        </LayersControl>

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[Number(marker.latitude), Number(marker.longitude)]}
            icon={markerIcon}
            ref={(ref) => {
              if (ref) markerRefs.current[marker.id] = ref;
            }}
          >
            <Popup><MarkerPopup marker={marker} /></Popup>
          </Marker>
        ))}

        {showWaterLines ? markers.filter((marker) => marker.nearestWaterSource).map((marker) => (
          <Polyline
            key={`line-${marker.id}`}
            positions={[[Number(marker.latitude), Number(marker.longitude)], [Number(marker.nearestWaterSource.latitude), Number(marker.nearestWaterSource.longitude)]]}
            pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "6 6", opacity: 0.85 }}
          />
        )) : null}
      </MapContainer>
    </div>
  );
}
