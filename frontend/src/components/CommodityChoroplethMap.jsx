import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, LayersControl, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { AlertCircle, MapPin, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";

function normalizeDigits(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 4) return digits;
  return digits.padStart(4, "0").slice(-4);
}

function getColor(value, max) {
  if (!value || !max) return "#dbe4ea";
  const ratio = value / max;
  if (ratio > 0.85) return "#14532d";
  if (ratio > 0.65) return "#166534";
  if (ratio > 0.45) return "#15803d";
  if (ratio > 0.25) return "#16a34a";
  if (ratio > 0.1) return "#4ade80";
  return "#bbf7d0";
}

function bubbleRadius(value, max, selected = false) {
  if (!value || !max) return selected ? 10 : 8;
  const ratio = value / max;
  const base = 8 + Math.round(ratio * 18);
  return selected ? base + 4 : base;
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value || 0));
}

function fitBoundsFromPoints(points = []) {
  const valid = points.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
  if (!valid.length) return null;
  return L.latLngBounds(valid.map((item) => [Number(item.latitude), Number(item.longitude)]));
}

function computeGeoJsonBounds(featureCollection) {
  if (!featureCollection?.features?.length) return null;
  try {
    const layer = L.geoJSON(featureCollection);
    const bounds = layer.getBounds();
    return bounds?.isValid() ? bounds : null;
  } catch {
    return null;
  }
}

function FitMap({ points = [], featureCollection = null, selectedRegencyCode }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (featureCollection?.features?.length) {
      const selected = featureCollection.features.find((feature) => normalizeDigits(feature.properties?.regencyCode) === normalizeDigits(selectedRegencyCode));
      if (selected) {
        const layer = L.geoJSON(selected);
        const selectedBounds = layer.getBounds();
        if (selectedBounds?.isValid()) {
          map.fitBounds(selectedBounds.pad(0.18), { animate: true, duration: 0.8 });
          return;
        }
      }
      const boundaryBounds = computeGeoJsonBounds(featureCollection);
      if (boundaryBounds?.isValid()) {
        map.fitBounds(boundaryBounds.pad(0.08), { animate: true, duration: 0.8 });
        return;
      }
    }

    const selectedPoint = points.find((item) => normalizeDigits(item.regencyCode) === normalizeDigits(selectedRegencyCode));
    if (selectedPoint && Number.isFinite(Number(selectedPoint.latitude)) && Number.isFinite(Number(selectedPoint.longitude))) {
      map.flyTo([Number(selectedPoint.latitude), Number(selectedPoint.longitude)], Math.max(map.getZoom(), 9), { duration: 0.8 });
      return;
    }
    const bounds = fitBoundsFromPoints(points);
    if (bounds?.isValid()) map.fitBounds(bounds.pad(0.14));
  }, [map, points, featureCollection, selectedRegencyCode]);

  return null;
}

function Legend({ maxValue, unitLabel, mode }) {
  const steps = [0.1, 0.25, 0.45, 0.65, 0.85].map((ratio) => ({
    ratio,
    value: maxValue * ratio,
    color: getColor(maxValue * ratio, maxValue)
  }));

  return (
    <div className="absolute bottom-4 left-4 z-[500] w-64 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Legenda</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">Intensitas indikator per wilayah</div>
      <div className="mt-1 text-[11px] leading-5 text-slate-500">
        {mode === "polygon"
          ? "Boundary resmi aktif. Warna polygon mengikuti nilai indikator per kabupaten/kota."
          : "Mode aman memakai titik centroid kabupaten/kota sampai boundary resmi BIG tersedia atau lolos validasi."}
      </div>
      <div className="mt-3 space-y-2 text-xs text-slate-600">
        {steps.reverse().map((step) => (
          <div key={step.ratio} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: step.color }} />
              <span>{step.ratio === 0.85 ? "Sangat tinggi" : step.ratio === 0.65 ? "Tinggi" : step.ratio === 0.45 ? "Menengah" : step.ratio === 0.25 ? "Rendah" : "Sangat rendah"}</span>
            </div>
            <span>{formatNumber(step.value, 1)} {unitLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoundaryModeBadge({ boundaryStatus, fallbackReason }) {
  if (boundaryStatus === "polygon") {
    return (
      <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-emerald-700">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        Boundary resmi BIG aktif dan cocok dengan 22 kode wilayah kabupaten/kota NTT di aplikasi.
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
      {fallbackReason || "Boundary resmi belum tersedia atau belum lolos validasi. Peta kembali ke mode aman berbasis titik wilayah."}
    </div>
  );
}

export default function CommodityChoroplethMap({ regencies = [], metricLabel = "Produksi", unitLabel = "ton", selectedRegencyCode = null, onSelectRegency, height = "560px", note = "" }) {
  const [boundaryPayload, setBoundaryPayload] = useState({ status: "loading", data: null, source: null, warnings: [] });
  const [boundaryError, setBoundaryError] = useState("");
  const geoJsonRef = useRef(null);

  useEffect(() => {
    let active = true;
    api
      .get("/api/dashboard/commodity-boundary")
      .then((payload) => {
        if (!active) return;
        setBoundaryPayload(payload);
        setBoundaryError("");
      })
      .catch((error) => {
        if (!active) return;
        setBoundaryPayload({ status: "fallback", data: null, source: "safe-centroid", warnings: [] });
        setBoundaryError(error.message || "Boundary resmi tidak dapat dimuat.");
      });
    return () => {
      active = false;
    };
  }, []);

  const statsByCode = useMemo(
    () => new Map(regencies.map((item) => [normalizeDigits(item.regencyCode), item])),
    [regencies]
  );

  const maxValue = useMemo(() => Math.max(...regencies.map((item) => Number(item.value || 0)), 0), [regencies]);
  const points = useMemo(
    () => regencies.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))),
    [regencies]
  );

  const officialFeatureCollection = useMemo(() => {
    if (boundaryPayload.status !== "ready" || !boundaryPayload.data?.features?.length) return null;
    return {
      ...boundaryPayload.data,
      features: boundaryPayload.data.features.map((feature) => {
        const code = normalizeDigits(feature.properties?.regencyCode);
        const stat = statsByCode.get(code) || null;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            regencyCode: code,
            value: stat?.value || 0,
            unit: stat?.unit || unitLabel,
            hasData: Boolean(stat?.hasData),
            topCommodity: stat?.topCommodity || "-",
            coverage: stat?.coverage || 0,
            datasets: stat?.datasets || [],
            regencyName: stat?.regencyName || feature.properties?.regencyName || "-",
            regencyFullName: stat?.regencyFullName || feature.properties?.regencyFullName || feature.properties?.regencyName || "-"
          }
        };
      })
    };
  }, [boundaryPayload, statsByCode, unitLabel]);

  const fallbackReason = useMemo(() => {
    if (boundaryError) return boundaryError;
    const warnings = boundaryPayload.warnings || [];
    const remoteIssue = warnings.find((item) => item.source === "remote" && item.reason);
    const localIssue = warnings.find((item) => item.source === "local" && item.reason);
    return remoteIssue?.reason || localIssue?.reason || "Boundary resmi belum tersedia pada mode offline ini.";
  }, [boundaryPayload, boundaryError]);

  const boundaryMode = officialFeatureCollection ? "polygon" : "centroid";

  const styleFeature = (feature) => {
    const props = feature.properties || {};
    const selected = normalizeDigits(props.regencyCode) === normalizeDigits(selectedRegencyCode);
    return {
      color: selected ? "#0f172a" : "#ffffff",
      weight: selected ? 2.8 : 1.25,
      fillColor: getColor(props.value, maxValue),
      fillOpacity: props.hasData ? 0.82 : 0.3,
      dashArray: props.hasData ? undefined : "4 4"
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    layer.on({
      click: () => onSelectRegency?.(props.regencyCode),
      mouseover: () => layer.setStyle({ weight: 2.5, color: "#0f172a" }),
      mouseout: () => geoJsonRef.current?.resetStyle?.(layer)
    });
    layer.bindPopup(`
      <div class="min-width-[230px] space-y-1">
        <div style="font-weight:600;color:#0f172a">${props.regencyFullName || props.regencyName || "-"}</div>
        <div style="font-size:12px;color:#64748b">Boundary resmi kabupaten/kota NTT</div>
        <div style="padding-top:8px;font-size:12px;color:#475569">Nilai indikator: <strong>${formatNumber(props.value, 2)} ${props.unit || unitLabel}</strong></div>
        <div style="font-size:12px;color:#475569">Komoditas utama: <strong>${props.topCommodity || "-"}</strong></div>
        <div style="font-size:12px;color:#475569">Dataset: <strong>${(props.datasets || []).slice(0, 3).join(", ") || "Belum ada data"}</strong></div>
        <div style="font-size:12px;color:#475569">Cakupan record: <strong>${props.coverage || 0}</strong></div>
      </div>
    `);
  };

  if (!points.length) {
    return <div className="flex h-full min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">Koordinat wilayah belum tersedia untuk peta komoditas.</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200" style={{ height }}>
      <MapContainer center={[-8.7, 121.1]} zoom={8} className="h-full w-full" preferCanvas scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satelit">
            <TileLayer attribution='Tiles &copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Peta standar">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Label wilayah">
            <TileLayer attribution='Tiles &copy; Esri' url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.Overlay>
        </LayersControl>
        <FitMap points={points} featureCollection={officialFeatureCollection} selectedRegencyCode={selectedRegencyCode} />
        {officialFeatureCollection ? (
          <GeoJSON ref={geoJsonRef} data={officialFeatureCollection} style={styleFeature} onEachFeature={onEachFeature} />
        ) : (
          points.map((item) => {
            const selected = normalizeDigits(item.regencyCode) === normalizeDigits(selectedRegencyCode);
            const radius = bubbleRadius(item.value, maxValue, selected);
            const color = getColor(item.value, maxValue);
            return (
              <CircleMarker
                key={item.regencyCode}
                center={[Number(item.latitude), Number(item.longitude)]}
                radius={radius}
                pathOptions={{
                  color: selected ? "#0f172a" : color,
                  weight: selected ? 2.8 : 1.8,
                  fillColor: color,
                  fillOpacity: item.hasData ? 0.88 : 0.45
                }}
                eventHandlers={{ click: () => onSelectRegency?.(item.regencyCode) }}
              >
                <Popup>
                  <div className="min-w-[230px] space-y-1">
                    <div className="font-semibold text-slate-900">{item.regencyFullName || item.regencyName}</div>
                    <div className="text-xs text-slate-500">Titik wilayah kabupaten/kota untuk analitik komoditas.</div>
                    <div className="pt-2 text-xs text-slate-600">Nilai indikator: <strong>{formatNumber(item.value, 2)} {item.unit || unitLabel}</strong></div>
                    <div className="text-xs text-slate-600">Komoditas utama: <strong>{item.topCommodity || "-"}</strong></div>
                    <div className="text-xs text-slate-600">Dataset: <strong>{(item.datasets || []).slice(0, 3).join(", ") || "Belum ada data"}</strong></div>
                    <div className="text-xs text-slate-600">Cakupan record: <strong>{item.coverage || 0}</strong></div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })
        )}
        <Legend maxValue={maxValue} unitLabel={unitLabel} mode={boundaryMode} />
      </MapContainer>
      <div className="absolute right-4 top-4 z-[500] max-w-sm rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Peta analitik komoditas</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {boundaryMode === "polygon"
            ? `Klik area kabupaten/kota untuk drilldown ${metricLabel.toLowerCase()}`
            : `Klik titik wilayah kabupaten/kota untuk drilldown ${metricLabel.toLowerCase()}`}
        </div>
        <BoundaryModeBadge boundaryStatus={boundaryMode} fallbackReason={fallbackReason} />
        {note ? <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0 text-emerald-600" />{note}</div> : null}
      </div>
    </div>
  );
}
