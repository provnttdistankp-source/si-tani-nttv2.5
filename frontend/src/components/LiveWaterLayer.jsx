import { useEffect, useRef, useState } from "react";
import { CircleMarker, Polygon, Polyline, Popup, useMapEvents } from "react-leaflet";
import { api } from "../lib/api";

const pointColors = {
  "Mata Air": "#0ea5e9",
  "Mata Air Panas": "#f97316",
  "Air Minum": "#06b6d4",
  Sumur: "#6366f1",
  Bendung: "#0284c7",
  Reservoir: "#2563eb",
  Danau: "#1d4ed8",
  Laguna: "#0f766e",
  Perairan: "#0f766e",
  Sungai: "#0ea5e9",
  Aliran: "#38bdf8",
  Kanal: "#14b8a6",
  Drainase: "#22c55e"
};

function featureColor(type) {
  return pointColors[type] || "#0ea5e9";
}

function buildCacheKey(bounds, zoom, extraParams) {
  return [
    zoom,
    bounds.getWest().toFixed(3),
    bounds.getSouth().toFixed(3),
    bounds.getEast().toFixed(3),
    bounds.getNorth().toFixed(3),
    extraParams || ""
  ].join(":");
}

function LiveWaterPopup({ feature }) {
  return (
    <div className="min-w-48 space-y-1.5">
      <h4 className="font-semibold text-slate-900">{feature.name}</h4>
      <p className="text-xs font-medium text-sky-700">{feature.waterType}</p>
      {feature.distanceKm !== undefined ? <p className="text-xs text-slate-600">Jarak dari titik analisis: {feature.distanceKm} km</p> : null}
      <p className="text-[11px] text-slate-500">Sumber: OpenStreetMap Live</p>
    </div>
  );
}

function useLiveWaterState({ endpoint, minZoom, extraParams = "" }) {
  const [state, setState] = useState({ features: [], stats: { total: 0, byType: {} }, message: "", loading: false });
  const timerRef = useRef(null);
  const cacheRef = useRef(new Map());

  const map = useMapEvents({
    moveend: scheduleLoad
  });

  useEffect(() => {
    scheduleLoad();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [extraParams]);

  function scheduleLoad() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(load, 500);
  }

  async function load() {
    const zoom = map.getZoom();
    if (zoom < minZoom) {
      setState({ features: [], stats: { total: 0, byType: {} }, message: `Perbesar peta ke zoom ${minZoom}+ untuk memuat air nyata dari internet.`, loading: false });
      return;
    }

    const bounds = map.getBounds();
    const cacheKey = buildCacheKey(bounds, zoom, extraParams);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setState({ ...cached, loading: false });
      return;
    }

    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].map((value) => Number(value).toFixed(6)).join(",");
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const query = new URLSearchParams({ bbox, zoom: String(zoom) });
      if (extraParams) {
        for (const [key, value] of new URLSearchParams(extraParams).entries()) query.set(key, value);
      }
      const result = await api.get(`${endpoint}?${query.toString()}`);
      cacheRef.current.set(cacheKey, result);
      setState({ ...result, loading: false, message: result.message || "" });
    } catch (error) {
      setState({ features: [], stats: { total: 0, byType: {} }, message: error.message || "Gagal memuat data air internet.", loading: false });
    }
  }

  return state;
}

export function LiveWaterLayer({ endpoint = "/api/map/live-water", minZoom = 12 }) {
  const state = useLiveWaterState({ endpoint, minZoom });

  return (
    <>
      {state.features.map((feature) => {
        const color = featureColor(feature.waterType);
        if (feature.geometryType === "Polygon" && feature.geometry?.length) {
          return (
            <Polygon key={feature.id} positions={feature.geometry} pathOptions={{ color, fillColor: color, fillOpacity: 0.14, weight: 1.8 }}>
              <Popup><LiveWaterPopup feature={feature} /></Popup>
            </Polygon>
          );
        }
        if (feature.geometryType === "LineString" && feature.geometry?.length) {
          return (
            <Polyline key={feature.id} positions={feature.geometry} pathOptions={{ color, weight: 2, opacity: 0.82 }}>
              <Popup><LiveWaterPopup feature={feature} /></Popup>
            </Polyline>
          );
        }
        return (
          <CircleMarker key={feature.id} center={[Number(feature.latitude), Number(feature.longitude)]} radius={5} pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1.5 }}>
            <Popup><LiveWaterPopup feature={feature} /></Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
