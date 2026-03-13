'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

type MarkerData = {
  id: string
  lat: number
  lng: number
  label: string
}

export default function MapView({ markers }: { markers: MarkerData[] }) {
  const center: [number, number] = [5.6037, -0.187]

  if (typeof window !== 'undefined') {
    const anyL = L as unknown as { Icon: { Default: { prototype: { _getIconUrl?: unknown } } } }
    if (anyL.Icon?.Default?.prototype) {
      delete anyL.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x.src,
        iconUrl: markerIcon.src,
        shadowUrl: markerShadow.src,
      })
    }
  }

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
        <Marker key={marker.id} position={[marker.lat, marker.lng]}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
