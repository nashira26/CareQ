import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Centre, Application, ParentProfile } from '../../data/mockData';
import { OntarioCentre } from '../../data/ontarioTypes';

const NO_REAL_CENTRES: OntarioCentre[] = [];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
import {
  MapPin,
  Clock,
  CheckCircle2,
  Plus,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Navigation,
  Layers,
} from 'lucide-react';

interface DaycareMapProps {
  centres: Centre[];
  applications: Application[];
  parentProfile: ParentProfile;
  /** Real open-data centres: shown as small dots; centres without lat/lng are skipped. */
  realCentres?: OntarioCentre[];
  onSelectCentre: (centreId: string) => void;
  onOpenConversation: (centreId: string) => void;
  onNavigateToApply: () => void;
}

export const DaycareMap: React.FC<DaycareMapProps> = ({
  centres,
  applications,
  parentProfile,
  realCentres = NO_REAL_CENTRES,
  onSelectCentre,
  onOpenConversation,
  onNavigateToApply,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const realLayerRef = useRef<L.LayerGroup | null>(null);
  const realCentresOnMap = useMemo(
    () => realCentres.filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number'),
    [realCentres]
  );
  const [activeCentreId, setActiveCentreId] = useState<string | null>(
    centres.length > 0 ? centres[0].id : null
  );

  const applicationByCentreId = new Map(applications.map((app) => [app.centreId, app]));
  const activeCentre = centres.find((c) => c.id === activeCentreId) || centres[0];

  // Initialize and update the Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance if not already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [43.665, -79.40],
        zoom: 12,
        zoomControl: false,
      });

      // Standard OpenStreetMap Tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Add zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    // Create markers for each centre with valid lat/lng
    centres.forEach((centre) => {
      if (typeof centre.lat !== 'number' || typeof centre.lng !== 'number') return;

      const latLng: [number, number] = [centre.lat, centre.lng];
      bounds.extend(latLng);

      const isSelected = applicationByCentreId.has(centre.id);

      // Custom div icon with modern pin design
      const pinColorClass = isSelected
        ? 'bg-emerald-600 border-white text-white'
        : 'bg-teal-700 border-white text-white';

      const customIcon = L.divIcon({
        className: 'careq-custom-marker',
        iconSize: [38, 46],
        iconAnchor: [19, 44],
        popupAnchor: [0, -42],
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 hover:scale-110">
            <div class="w-9 h-9 rounded-full ${pinColorClass} border-2 shadow-lg flex items-center justify-center font-bold text-xs">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
            </div>
            <div class="w-2.5 h-2.5 bg-stone-800 rotate-45 -mt-1 shadow-md"></div>
            ${
              isSelected
                ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>`
                : ''
            }
          </div>
        `,
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

      // Popup content
      const popupHtml = `
        <div class="p-1 font-sans text-xs max-w-[220px]">
          <div class="font-bold text-sm text-stone-900 leading-tight mb-1">${centre.name}</div>
          <div class="text-stone-600 mb-1 flex items-center gap-1">
            <span>📍 ${centre.neighbourhood}</span>
            ${centre.feeNote ? '· <span class="text-amber-800 font-semibold">CWELCC</span>' : ''}
          </div>
          <div class="text-stone-500 text-[11px] mb-2">${centre.hours}</div>
          <div class="text-stone-700 text-[11px] font-medium">Click marker to view details & apply</div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -38] });

      marker.on('click', () => {
        setActiveCentreId(centre.id);
        marker.openPopup();
      });

      markersRef.current[centre.id] = marker;
    });

    // Fit map bounds to show all markers if any exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    // Invalidate size to ensure proper rendering after container mount
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timeout);
  }, [centres, applications]);

  // Real open-data centres on their own layer (canvas dots, fast for ~1,100 points).
  // Runs after the effect above has created the map.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!realLayerRef.current) realLayerRef.current = L.layerGroup().addTo(map);
    const layer = realLayerRef.current;
    layer.clearLayers();
    const renderer = L.canvas({ padding: 0.5 });

    realCentresOnMap.forEach((c) => {
      const ages = c.ageGroups === null ? 'Ages not reported' : c.ageGroups.join(', ') || 'No infant, toddler or preschool spaces listed';
      L.circleMarker([c.lat as number, c.lng as number], {
        renderer,
        radius: 4,
        color: '#ffffff',
        weight: 1,
        fillColor: '#6B5B95',
        fillOpacity: 0.85,
      })
        .bindPopup(
          `<div class="p-1 font-sans text-xs max-w-[220px]">
            <div class="font-bold text-sm text-stone-900 leading-tight mb-1">${escapeHtml(c.name)}</div>
            <div class="text-stone-600 mb-1">${escapeHtml(c.address)}</div>
            <div class="text-stone-500 text-[11px]">${escapeHtml(ages)}</div>
            <div class="text-stone-700 text-[11px] font-semibold mt-1">Availability not reported</div>
            <div class="text-stone-400 text-[10px] mt-1">Licensed centre · open data</div>
          </div>`,
          { closeButton: false }
        )
        .addTo(layer);
    });
  }, [realCentresOnMap]);

  // When active centre changes, fly to its coordinates
  const handleSelectActiveCentre = (centre: Centre) => {
    setActiveCentreId(centre.id);
    if (
      mapInstanceRef.current &&
      typeof centre.lat === 'number' &&
      typeof centre.lng === 'number'
    ) {
      mapInstanceRef.current.flyTo([centre.lat, centre.lng], 14, {
        duration: 0.8,
      });

      const marker = markersRef.current[centre.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const isSelected = activeCentre ? applicationByCentreId.has(activeCentre.id) : false;
  const currentApp = activeCentre ? applicationByCentreId.get(activeCentre.id) : undefined;

  return (
    <div className="space-y-4">
      {/* Map + Sidebar Split Layout */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[580px] sm:min-h-[640px]">
        {/* Left Side: Interactive Leaflet Map Container */}
        <div className="lg:col-span-8 relative h-[360px] sm:h-[420px] lg:h-auto min-h-[380px]">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Overlay Controls & Legend */}
          <div className="absolute top-3 left-3 z-1000 bg-white/95 backdrop-blur-xs border border-stone-200 rounded-xl px-3 py-2 shadow-sm text-xs space-y-1">
            <div className="font-semibold text-stone-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-700" />
              <span>Toronto Child Care Map</span>
            </div>
            <div className="text-[11px] text-stone-500 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-700 inline-block"></span>
                <span>CareQ partner centre (simulated)</span>
              </span>
              {realCentresOnMap.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6B5B95] inline-block"></span>
                  <span>Licensed centre (open data)</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                <span>Selected</span>
              </span>
            </div>
          </div>

          {/* Bottom helper pill */}
          <div className="absolute bottom-3 left-3 z-1000 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full shadow-sm pointer-events-none">
            Powered by OpenStreetMap • {centres.length} partner (simulated) + {realCentresOnMap.length} licensed centres
          </div>
        </div>

        {/* Right Side: Active Centre Focus Card & Selector */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-stone-200 bg-stone-50/50 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto">
          {activeCentre ? (
            <div className="space-y-4">
              {/* Centre Image */}
              {activeCentre.imageUrl && (
                <div className="relative h-36 rounded-xl overflow-hidden shadow-xs bg-stone-200">
                  <img
                    src={activeCentre.imageUrl}
                    alt={activeCentre.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
                    <span className="font-semibold text-[11px] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-300" />
                      {activeCentre.neighbourhood}
                    </span>
                    {activeCentre.feeNote && (
                      <span className="bg-amber-400 text-stone-950 font-bold text-[10px] px-2 py-0.5 rounded-sm shadow-xs">
                        CWELCC ($10/day)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Centre Heading */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-stone-900 leading-snug">
                    {activeCentre.name}
                  </h3>
                </div>
                {activeCentre.address && (
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{activeCentre.address}</span>
                  </p>
                )}
                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{activeCentre.hours}</span>
                </p>
              </div>


              {/* Age groups & program availability */}
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
                  Licensed Programs:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeCentre.ageGroups.map((age) => (
                    <span
                      key={age}
                      className="text-xs font-medium bg-stone-200/70 text-stone-700 px-2.5 py-0.5 rounded-md"
                    >
                      {age}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirements checklist count */}
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                  Intake Requirements ({activeCentre.requirements.length}):
                </span>
                <ul className="text-xs text-stone-600 space-y-1">
                  {activeCentre.requirements.slice(0, 3).map((req, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                      <span className="truncate">{req}</span>
                    </li>
                  ))}
                  {activeCentre.requirements.length > 3 && (
                    <li className="text-[11px] text-stone-400 italic">
                      + {activeCentre.requirements.length - 3} more prerequisite documents
                    </li>
                  )}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex gap-2">
                  {isSelected ? (
                    <button
                      type="button"
                      onClick={onNavigateToApply}
                      className="flex-1 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-medium text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Selected ({currentApp?.status || 'Draft'})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectCentre(activeCentre.id)}
                      className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Select to Apply</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenConversation(activeCentre.id)}
                    className="p-2 border border-stone-300 hover:border-teal-700 text-stone-700 hover:text-teal-800 bg-white rounded-lg transition-colors flex items-center justify-center text-xs"
                    title={`Message ${activeCentre.name}`}
                  >
                    <MessageSquare className="w-4 h-4 text-teal-700" />
                  </button>
                </div>

                {/* External directions link */}
                {activeCentre.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${activeCentre.name}, ${activeCentre.address}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center text-[11px] text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1 py-1"
                  >
                    <span>Open in Maps for Directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500 text-xs">
              Select a marker on the map to inspect centre details.
            </div>
          )}

          {/* Quick Centre Carousel / Switcher at bottom of panel */}
          <div className="mt-4 pt-3 border-t border-stone-200">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
              Switch Centre on Map:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {centres.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectActiveCentre(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-md shrink-0 transition-colors border ${
                    activeCentreId === c.id
                      ? 'bg-teal-700 text-white border-teal-700 font-semibold'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
