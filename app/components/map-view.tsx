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

export type CollectorMarkerData = MarkerData & {
  collectorId: string
}

export default function MapView({
  markers,
  collectorMarkers = [],
  center,
  zoom,
  className,
}: {
  markers: MarkerData[]
  collectorMarkers?: CollectorMarkerData[]
  center?: [number, number]
  zoom?: number
  className?: string
}) {
  const [isMounted, setIsMounted] = useState(false)
  const [leaflet, setLeaflet] = useState<any>(null)
  const [reactLeaflet, setReactLeaflet] = useState<any>(null)
  const [liveCollectors, setLiveCollectors] = useState<CollectorMarkerData[]>(collectorMarkers)

  useEffect(() => {
    // Only update if the length changed or if we don't have any collectors yet
    // This simple check prevents infinite loops if the array reference changes but content is same
    if (collectorMarkers.length !== liveCollectors.length) {
      setLiveCollectors(collectorMarkers)
    }
  }, [collectorMarkers, liveCollectors.length])

  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = payload.new as { id: string, current_lat?: number, current_lng?: number }
          
          if (updatedProfile.current_lat && updatedProfile.current_lng) {
            setLiveCollectors((prev) => 
              prev.map(c => 
                c.collectorId === updatedProfile.id 
                  ? { ...c, lat: updatedProfile.current_lat as number, lng: updatedProfile.current_lng as number }
                  : c
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  const collectorIcon = useMemo(() => {
    if (!leaflet) return null
    return leaflet.default.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', // We could use a truck icon here if we had one
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      className: 'hue-rotate-90' // Make the collector marker a different color (greenish)
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
      scrollWheelZoom={false}
      className={`${className ?? 'h-[500px] w-full rounded-2xl'} z-0`}
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
      
      {liveCollectors.map((marker) => (
        <Marker key={`collector-${marker.collectorId}`} position={[marker.lat, marker.lng]} icon={collectorIcon ?? undefined}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
