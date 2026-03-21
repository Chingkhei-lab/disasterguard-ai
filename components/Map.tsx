"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { MAP_DEFAULT } from "@/lib/constants";

export type FireMarkerData = {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  acq_date: string;
};

export type DisasterMarkerData = {
  lat: number;
  lng: number;
  title: string;
  alertLevel: string;
  eventType: string;
};

type SelectedLocation = { lat: number; lng: number } | null;

type MapProps = {
  fires: FireMarkerData[];
  disasters: DisasterMarkerData[];
  selectedLocation: SelectedLocation;
  onLocationClick: (lat: number, lng: number) => void;
};

const fireIcon = L.divIcon({
  html: '<span class="fire-marker"></span>',
  className: "map-marker-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const disasterIcon = L.divIcon({
  html: '<span class="disaster-marker"></span>',
  className: "map-marker-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const selectedIcon = L.divIcon({
  html: '<span class="selected-marker"></span>',
  className: "map-marker-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClickHandler({ onLocationClick }: Pick<MapProps, "onLocationClick">) {
  useMapEvents({
    click: (event) => {
      onLocationClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function RecenterMap({ selectedLocation }: { selectedLocation: SelectedLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    map.setView([selectedLocation.lat, selectedLocation.lng], 9);
  }, [map, selectedLocation]);

  return null;
}

export function Map({ fires, disasters, selectedLocation, onLocationClick }: MapProps) {
  return (
    <MapContainer
      center={MAP_DEFAULT.center}
      zoom={MAP_DEFAULT.zoom}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onLocationClick={onLocationClick} />
      <RecenterMap selectedLocation={selectedLocation} />

      {fires.map((fire, index) => (
        <Marker key={`fire-${index}`} position={[fire.lat, fire.lng]} icon={fireIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Fire Detection</p>
              <p>Confidence: {fire.confidence}</p>
              <p>Date: {fire.acq_date}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {disasters.map((disaster, index) => (
        <Marker key={`disaster-${index}`} position={[disaster.lat, disaster.lng]} icon={disasterIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{disaster.title}</p>
              <p>Alert: {disaster.alertLevel}</p>
              <p>Type: {disaster.eventType}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {selectedLocation ? (
        <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={selectedIcon}>
          <Popup>
            <p className="text-sm font-semibold">Selected analysis point</p>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
