'use client'

import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'

type MarkerData = {
  id: string
  lat: number
  lng: number
  label: string
}

export default function MapView({
  markers,
  center,
  zoom,
  className,
}: {
  markers: MarkerData[]
  center?: [number, number]
  zoom?: number
  className?: string
}) {
  const [isMounted, setIsMounted] = useState(false)
  const [leaflet, setLeaflet] = useState<any>(null)
  const [reactLeaflet, setReactLeaflet] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
    // Dynamically import leaflet and react-leaflet only on the client side
    Promise.all([import('leaflet'), import('react-leaflet')]).then(([L, RL]) => {
      setLeaflet(L)
      setReactLeaflet(RL)
    })
  }, [])

  const computedCenter: [number, number] =
    center ?? (markers.length > 0 ? [markers[0].lat, markers[0].lng] : [5.6037, -0.187])
  const computedZoom = typeof zoom === 'number' ? zoom : markers.length > 0 ? 15 : 12

  const icon = useMemo(() => {
    if (!leaflet) return null
    return leaflet.default.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }, [leaflet])

  if (!isMounted || !reactLeaflet) {
    return (
      <div className={`${className ?? 'h-[500px] w-full rounded-2xl'} bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center`}>
        <span className="text-sm text-zinc-500">Loading map...</span>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = reactLeaflet

  return (
    <MapContainer
      center={computedCenter}
      zoom={computedZoom}
      scrollWheelZoom
      className={className ?? 'h-[500px] w-full rounded-2xl'}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
