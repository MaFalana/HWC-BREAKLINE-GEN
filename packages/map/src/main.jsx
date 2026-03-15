import "leaflet/dist/leaflet.css";
import React, { useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import "./map.css";
import { LayerToggle, ZoomControls } from "./controls.jsx";
import { MapAttribution } from "./attribution.jsx";

/**
 * Canonical item shape (default):
 *   { id, lat, lon, name? }
 *
 * If your data differs, override getId/getLatLng/getLabel.
 */

function FitBounds({ items, getLatLng, enabled = true }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!items?.length) return;

    const latLngs = items
      .map((it) => getLatLng(it))
      .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));

    if (latLngs.length > 0) {
      map.fitBounds(latLngs, { padding: [50, 50] });
    }
  }, [map, items, getLatLng, enabled]);

  return null;
}

function MapNavigator({ targetItem, getLatLng }) {
  const map = useMap();

  useEffect(() => {
    if (!targetItem) return;
    const p = getLatLng(targetItem);
    if (!p) return;
    const [lat, lon] = p;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    map.panTo([lat, lon], { animate: true, duration: 1 });
  }, [map, targetItem, getLatLng]);

  return null;
}

function MapZoomControls({ items, getLatLng, orthoBounds }) {
  const map = useMap();

  const handleZoomIn = () => map.setZoom(map.getZoom() + 1);
  const handleZoomOut = () => map.setZoom(map.getZoom() - 1);

  const handleZoomToAll = () => {
    // If ortho bounds exist, fit to those
    if (orthoBounds) {
      map.fitBounds(orthoBounds, { padding: [50, 50] });
      return;
    }

    // Otherwise fit to items
    if (!items?.length) return;

    const latLngs = items
      .map((it) => getLatLng(it))
      .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));

    if (latLngs.length > 0) {
      map.fitBounds(latLngs, { padding: [50, 50] });
    }
  };

  return (
    <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onZoomToAll={handleZoomToAll} />
  );
}

export function HwcMap({
  items = [],

  // Mapping functions (override these to adapt to your data shape)
  getId = (it) => it?.id ?? it?._id,

  // Returns [lat, lon]
  getLatLng = (it) => {
    // Canonical: { lat, lon }
    if (it?.lat != null && it?.lon != null) return [it.lat, it.lon];

    // Cloud-viewer common: { location: { lat, lon } }
    if (it?.location?.lat != null && it?.location?.lon != null) return [it.location.lat, it.location.lon];

    // Fallbacks you may have in older objects:
    // - { lng } or { location: { lng } } (we accept to reduce friction)
    if (it?.lat != null && it?.lng != null) return [it.lat, it.lng];
    if (it?.location?.lat != null && it?.location?.lng != null) return [it.location.lat, it.location.lng];

    return null;
  },

  // Default label: item.name (no label prop needed)
  getLabel = (it) => it?.name,

  // Optional; not used by default but left for forward compatibility
  getBounds = (it) => it?.bounds,

  // State/UX hooks
  selectedIds,
  onSelect,
  highlightedId,
  onHover,
  targetItem,

  // Map config
  initialCenter = [0, 0],
  initialZoom = 2,
  minZoom = 2,
  maxZoom,
  fitBoundsOnLoad = true,

  // Layers
  baseLayer,
  onBaseLayerChange,
  mapTilerKey,

  // Ortho overlay
  orthoBounds,

  // Controls
  showControls = true,
  showAttribution = true,

  // Marker/cluster options
  cluster = true,
  clusterOptions = { showCoverageOnHover: false },

  // Children for additional overlays/markers
  children
}) {
  const [isMobile, setIsMobile] = useState(false);

  // Default base layer: if MapTiler key exists, prefer streets, else satellite
  const effectiveBaseLayer = baseLayer ?? (mapTilerKey ? "streets" : "satellite");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(window.innerWidth < 768);
  }, []);

  const validItems = useMemo(() => {
    return (items || []).filter((it) => {
      const p = getLatLng(it);
      return p && Number.isFinite(p[0]) && Number.isFinite(p[1]);
    });
  }, [items, getLatLng]);

  const hasSelected = (id) => {
    if (!selectedIds) return false;
    if (selectedIds instanceof Set) return selectedIds.has(id);
    if (Array.isArray(selectedIds)) return selectedIds.includes(id);
    return false;
  };

  const createMarkerIcon = (it) => {
    const size = isMobile ? 32 : 24;
    const id = getId(it);

    const classes = [
      "hwc-map-marker",
      highlightedId != null && id === highlightedId ? "is-highlighted" : "",
      hasSelected(id) ? "is-selected" : ""
    ]
      .filter(Boolean)
      .join(" ");

    return divIcon({
      html: `<div>•</div>`,
      className: classes,
      iconSize: [size, size]
    });
  };

  const createClusterCustomIcon = (clusterObj) => {
    const count = clusterObj.getChildCount();
    const size = count < 10 ? 33 : count < 100 ? 40 : 47;

    return divIcon({
      html: `<div>${count}</div>`,
      className: "hwc-marker-cluster",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  const handleMarkerClick = (it) => {
    if (!onSelect) return;
    const id = getId(it);
    if (id == null) return;
    onSelect(id, it);
  };

  const handleMarkerMouseOver = (it) => {
    if (!onHover) return;
    const id = getId(it);
    if (id == null) return;
    onHover(id, it);
  };

  const handleMarkerMouseOut = (it) => {
    if (!onHover) return;
    onHover(null, it);
  };

  const layerOptions = useMemo(() => {
    const opts = [{ key: "streets", label: "Streets" }];
    if (mapTilerKey) opts.push({ key: "satellite", label: "Satellite" });
    return opts;
  }, [mapTilerKey]);

  return (
    <div className="map-wrapper">
      {showControls && (
        <LayerToggle
          baseLayer={effectiveBaseLayer}
          setBaseLayer={(k) => onBaseLayerChange?.(k)}
          options={layerOptions}
        />
      )}

      {showAttribution && <MapAttribution baseLayer={effectiveBaseLayer} />}

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={true}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        fadeAnimation={true}
        markerZoomAnimation={true}
        style={{ height: "100%", width: "100%" }}
      >
        {effectiveBaseLayer === "streets" && (
          <TileLayer
            key="streets"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        )}

        {effectiveBaseLayer === "satellite" && (
          <TileLayer
            key="satellite-esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri, Maxar, Earthstar Geographics"
            maxZoom={19}
          />
        )}

        <FitBounds items={validItems} getLatLng={getLatLng} enabled={fitBoundsOnLoad} />
        <MapNavigator targetItem={targetItem} getLatLng={getLatLng} />
        <MapZoomControls items={validItems} getLatLng={getLatLng} orthoBounds={orthoBounds} />

        {children}

        {cluster ? (
          <MarkerClusterGroup iconCreateFunction={createClusterCustomIcon} {...clusterOptions}>
            {validItems.map((it) => {
              const id = getId(it);
              const p = getLatLng(it);
              if (!p) return null;
              const [lat, lon] = p;
              const label = getLabel(it);

              return (
                <Marker
                  key={String(id)}
                  position={[lat, lon]}
                  icon={createMarkerIcon(it)}
                  eventHandlers={{
                    click: () => handleMarkerClick(it),
                    mouseover: () => handleMarkerMouseOver(it),
                    mouseout: () => handleMarkerMouseOut(it)
                  }}
                >
                  {label ? (
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                      {label}
                    </Tooltip>
                  ) : null}
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        ) : (
          validItems.map((it) => {
            const id = getId(it);
            const p = getLatLng(it);
            if (!p) return null;
            const [lat, lon] = p;
            const label = getLabel(it);

            return (
              <Marker
                key={String(id)}
                position={[lat, lon]}
                icon={createMarkerIcon(it)}
                eventHandlers={{
                  click: () => handleMarkerClick(it),
                  mouseover: () => handleMarkerMouseOver(it),
                  mouseout: () => handleMarkerMouseOut(it)
                }}
              >
                {label ? (
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                    {label}
                  </Tooltip>
                ) : null}
              </Marker>
            );
          })
        )}
      </MapContainer>
    </div>
  );
}

export default HwcMap;
