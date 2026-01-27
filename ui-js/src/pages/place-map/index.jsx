import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import markers from "./markers.json";
import { AnimatePresence } from "framer-motion";
import Inspector from "./Inspector";
import Sidebar from "./Sidebar";
import { useOpenAiGlobal } from "../../hooks/use-openai-global.ts";
import { useMaxHeight } from "../../hooks/use-max-height";
import { Maximize2 } from "lucide-react";
import {
  Routes,
  Route,
  BrowserRouter,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Button } from "@openai/apps-sdk-ui/components/Button";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZXJpY25pbmciLCJhIjoiY21icXlubWM1MDRiczJvb2xwM2p0amNyayJ9.n-3O6JI5nOp_Lw96ZO5vJQ";

function fitMapToMarkers(map, coords) {
  if (!map || !coords.length) return;
  if (coords.length === 1) {
    map.flyTo({ center: coords[0], zoom: 12 });
    return;
  }
  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds(coords[0], coords[0])
  );
  map.fitBounds(bounds, { padding: 60, animate: true });
}

function PlaceMapShell() {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerObjs = useRef([]);

  const toolOutput = useOpenAiGlobal("toolOutput");
  // console.log(toolOutput)

  const places = React.useMemo(() => {
    const raw = toolOutput?.places;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((p) => {
        const lng = p?.location?.lng;
        const lat = p?.location?.lat;
        if (typeof lng !== "number" || typeof lat !== "number") return null;

        const id =
          p?.placeId || p?.cid || p?.fid || p?.title || `${lng},${lat}`;

        const place = {
          id: String(id),
          name: p?.title ?? "Untitled place",
          coords: [lng, lat],
          description: Array.isArray(p?.address)
            ? p.address.filter(Boolean).join("\n\n")
            : (p?.address ?? ""),
          city: p?.city ?? p?.neighborhood ?? "",
          rating:
            typeof p?.reviewScore === "number" ? p.reviewScore : undefined,
          price:
            p?.price ??
            (Array.isArray(p?.hotelPrices) && p.hotelPrices[0]?.price
              ? p.hotelPrices[0].price
              : undefined),
          thumbnail: p?.imageUrl ?? undefined,
          // keep the original tool payload if Inspector/Sidebar wants it later
          //raw: p,
        };
        
        return place
      })
      .filter(Boolean);
  }, [toolOutput]);

  // const places = markers?.places || [];
  const markerCoords = places.map((p) => p.coords);

  const navigate = useNavigate();
  const location = useLocation();

  const selectedId = React.useMemo(() => {
    const match = location?.pathname?.match(/(?:^|\/)place\/([^/]+)/);
    return match && match[1] ? match[1] : null;
  }, [location?.pathname]);

  const selectedPlace = places.find((p) => p.id === selectedId) || null;

  const [viewState, setViewState] = useState(() => ({
    center: markerCoords.length > 0 ? markerCoords[0] : [0, 0],
    zoom: markerCoords.length > 0 ? 12 : 2,
  }));

  const displayMode = useOpenAiGlobal("displayMode");
  const allowInspector = displayMode === "fullscreen";
  const maxHeight = useMaxHeight() ?? undefined;

  function addAllMarkers(placesList) {
    markerObjs.current.forEach((m) => m.remove());
    markerObjs.current = [];

    placesList.forEach((place) => {
      const marker = new mapboxgl.Marker({ color: "#F46C21" })
        .setLngLat(place.coords)
        .addTo(mapObj.current);

      const el = marker.getElement();
      if (el) {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          navigate(`/place/${place.id}`);
          panTo(place.coords, { offsetForInspector: true });
        });
      }

      markerObjs.current.push(marker);
    });
  }

  function getInspectorOffsetPx() {
    if (displayMode !== "fullscreen") return 0;
    if (typeof window === "undefined") return 0;

    const isXlUp =
      window.matchMedia && window.matchMedia("(min-width: 1280px)").matches;
    const el = document.querySelector(".pizzaz-inspector");
    const w = el ? el.getBoundingClientRect().width : 360;
    const half = Math.round(w / 2);
    return isXlUp ? -half : half;
  }

  function panTo(coord, { offsetForInspector } = { offsetForInspector: false }) {
    if (!mapObj.current) return;

    const inspectorOffset = offsetForInspector ? getInspectorOffsetPx() : 0;

    const flyOpts = {
      center: coord,
      zoom: 14,
      speed: 1.2,
      curve: 1.6,
      ...(inspectorOffset ? { offset: [inspectorOffset, 0] } : {}),
    };

    mapObj.current.flyTo(flyOpts);
  }

  // init map once
  useEffect(() => {
    if (mapObj.current) return;

    mapObj.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 2,
      attributionControl: false,
    });

    requestAnimationFrame(() => mapObj.current.resize());

    const onResize = () => mapObj.current && mapObj.current.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      mapObj.current?.remove();
      mapObj.current = null;
    };
  }, []);

  const hasFitOnce = useRef(false);

  useEffect(() => {
    if (!mapObj.current) return;
    if (!places.length) return;

    addAllMarkers(places);

    // Fit only the first time we get data (so it doesn’t fight user panning)
    if (!hasFitOnce.current) {
      fitMapToMarkers(mapObj.current, places.map((p) => p.coords));
      hasFitOnce.current = true;
    }
  }, [places]);

  // track view state
  useEffect(() => {
    if (!mapObj.current) return;

    const handler = () => {
      const c = mapObj.current.getCenter();
      setViewState({ center: [c.lng, c.lat], zoom: mapObj.current.getZoom() });
    };

    mapObj.current.on("moveend", handler);
    return () => mapObj.current && mapObj.current.off("moveend", handler);
  }, []);

  // pan when selected place changes
  useEffect(() => {
    if (!mapObj.current || !selectedPlace) return;
    panTo(selectedPlace.coords, { offsetForInspector: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // resize map when layout changes
  useEffect(() => {
    if (!mapObj.current) return;
    mapObj.current.resize();
  }, [maxHeight, displayMode]);

  // push state to widget if available
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.oai &&
      typeof window.oai.widget?.setState === "function"
    ) {
      window.oai.widget.setState({
        center: viewState.center,
        zoom: viewState.zoom,
        markers: markerCoords,
      });
    }
  }, [viewState, markerCoords]);

  return (
    <>
      <div
        style={{
          maxHeight,
          height: displayMode === "fullscreen" ? maxHeight - 40 : 480,
        }}
        className={
          "relative antialiased w-full min-h-[480px] overflow-hidden " +
          (displayMode === "fullscreen"
            ? "rounded-none border-0"
            : "border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl")
        }
      >
        {/* Nested route content renders here (optional) */}
        <Outlet />

        {displayMode !== "fullscreen" && (
          <Button
            aria-label="Enter fullscreen"
            className="absolute top-4 right-4 z-30 shadow-lg pointer-events-auto bg-white text-black"
            color="secondary"
            size="sm"
            variant="soft"
            uniform
            onClick={() => {
              if (selectedId) navigate("/", { replace: true });
              if (window?.webplus?.requestDisplayMode) {
                window.webplus.requestDisplayMode({ mode: "fullscreen" });
              }
            }}
          >
            <Maximize2 strokeWidth={1.5} className="h-4.5 w-4.5" aria-hidden="true" />
          </Button>
        )}

        <Sidebar
          places={places}
          selectedId={selectedId}
          onSelect={(place) => {
            navigate(`/places-map/${place.id}`);
            panTo(place.coords, { offsetForInspector: true });
          }}
        />

        <AnimatePresence>
          {allowInspector && selectedPlace && (
            <Inspector
              key={selectedPlace.id}
              place={selectedPlace}
              onClose={() => navigate("/", { replace: true })}
            />
          )}
        </AnimatePresence>

        <div
          className={
            "absolute inset-0 overflow-hidden" +
            (displayMode === "fullscreen"
              ? " left-[340px] right-2 top-2 bottom-4 border border-black/10 rounded-3xl"
              : "")
          }
        >
          <div
            ref={mapRef}
            className="w-full h-full absolute bottom-0 left-0 right-0"
            style={{
              maxHeight,
              height: displayMode === "fullscreen" ? maxHeight : undefined,
            }}
          />
        </div>
      </div>

      {displayMode === "fullscreen" && (
        <div className="hidden antialiased md:flex absolute inset-x-0 bottom-2 z-30 justify-center pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
            {["Open now", "Top rated", "Vegetarian friendly"].map((label) => (
              <Button
                key={label}
                color="secondary"
                variant="soft"
                size="sm"
                className="font-base"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * The actual page export: wraps PlaceMapShell in BrowserRouter.
 * This makes the page work standalone under /places-map/ and /places-map/place/:id
 */
export default function PlaceMapPage() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceMapShell />}>
          <Route index element={null} />
          <Route path="places-map/:placeId" element={null} />
        </Route>
        <Route path="*" element={<PlaceMapShell />} />
      </Routes>
    </BrowserRouter>
  );
}
