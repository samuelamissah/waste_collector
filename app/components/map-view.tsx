'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import 'leaflet/dist/leaflet.css'

export type MarkerData = {
  id: string
  lat: number
  lng: number
  label: string
}

export type LiveMarkerData = {
  id: string
  lat: number
  lng: number
  label: string
  kind: 'resident' | 'collector'
}

export default function MapView({
  markers,
  liveMarkers = [],
  center,
  zoom,
  className,
}: {
  markers: MarkerData[]
  liveMarkers?: LiveMarkerData[]
  center?: [number, number]
  zoom?: number
  className?: string
}) {
  const [isMounted, setIsMounted] = useState(false)
  const [leaflet, setLeaflet] = useState<any>(null)
  const [reactLeaflet, setReactLeaflet] = useState<any>(null)
const [livePeople, setLivePeople] = useState<LiveMarkerData[]>([])

  useEffect(() => {
    setLivePeople(liveMarkers)
  }, [liveMarkers])

  useEffect(() => {
    const supabase = createClient()
    const allowedIds = new Set(liveMarkers.map((m) => m.id))

    const channel = supabase
      .channel('live-map-profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updated = payload.new as {
            id: string
            current_lat?: number | null
            current_lng?: number | null
          }

          if (!allowedIds.has(updated.id)) return
          if (typeof updated.current_lat !== 'number' || typeof updated.current_lng !== 'number') return

          setLivePeople((prev) =>
            prev.map((person) =>
              person.id === updated.id
                ? {
                    ...person,
                    lat: updated.current_lat as number,
                    lng: updated.current_lng as number,
                  }
                : person
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [liveMarkers])

  useEffect(() => {
    setIsMounted(true)
    Promise.all([import('leaflet'), import('react-leaflet')]).then(([L, RL]) => {
      setLeaflet(L)
      setReactLeaflet(RL)
    })
  }, [])

  const allPoints = [
    ...markers.map((m) => [m.lat, m.lng] as [number, number]),
    ...livePeople.map((m) => [m.lat, m.lng] as [number, number]),
  ]

  const computedCenter: [number, number] =
    center ?? (allPoints.length > 0 ? allPoints[0] : [5.6037, -0.187])

  const computedZoom =
    typeof zoom === 'number' ? zoom : allPoints.length > 0 ? 14 : 12

  const defaultIcon = useMemo(() => {
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

  const collectorIcon = useMemo(() => {
    if (!leaflet) return null
    return leaflet.default.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: 'hue-rotate-90',
    })
  }, [leaflet])

  const residentIcon = useMemo(() => {
    if (!leaflet) return null
    return leaflet.default.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: 'hue-rotate-180',
    })
  }, [leaflet])

  if (!isMounted || !reactLeaflet) {
    return (
      <div className={`${className ?? 'h-[500px] w-full rounded-2xl'} flex items-center justify-center bg-zinc-100 dark:bg-zinc-900`}>
        <span className="text-sm text-zinc-500">Loading map...</span>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = reactLeaflet

  return (
    <MapContainer
      center={computedCenter}
      zoom={computedZoom}
      scrollWheelZoom={false}
      className={`${className ?? 'h-[500px] w-full rounded-2xl'} z-0`}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={defaultIcon ?? undefined}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}

      {livePeople.map((person) => (
        <Marker
          key={person.id}
          position={[person.lat, person.lng]}
          icon={person.kind === 'collector' ? collectorIcon ?? undefined : residentIcon ?? undefined}
        >
          <Popup>{person.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}