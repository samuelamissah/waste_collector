'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

type MarkerData = {
  id: string
  lat: number
  lng: number
  label: string
}

export default function MapView({ markers }: { markers: MarkerData[] }) {
  return (
    <MapContainer
      center={[5.6037, -0.1870]}
      zoom={12}
      scrollWheelZoom
      className="h-[500px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}