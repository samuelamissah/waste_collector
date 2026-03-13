'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useMemo } from 'react'

type MarkerData = {
  id: string
  lat: number
  lng: number
  label: string
}

export default function MapView({ markers }: { markers: MarkerData[] }) {
  const center: [number, number] = [5.6037, -0.187]

  const icon = useMemo(() => {
    if (typeof window === 'undefined') return null
    return L.icon({
      iconRetinaUrl: markerIcon2x.src,
      iconUrl: markerIconPng.src,
      shadowUrl: markerShadow.src,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }, [])

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-[500px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={icon ?? undefined}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
