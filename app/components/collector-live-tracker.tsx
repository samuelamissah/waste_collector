'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CollectorLiveTracker({
  collectorId,
  isTrackingEnabled,
}: {
  collectorId: string
  isTrackingEnabled: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'tracking' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const supabase = createClient()
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    if (!isTrackingEnabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setStatus('idle')
      return
    }

    if (!('geolocation' in navigator)) {
      setStatus('error')
      setErrorMessage('Geolocation is not supported by your browser.')
      return
    }

    setStatus('tracking')
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now()
        // Throttle updates to once every 5 seconds to avoid spamming the database
        if (now - lastUpdateRef.current < 5000) return
        lastUpdateRef.current = now

        const { latitude, longitude } = position.coords

        const { error } = await supabase
          .from('profiles')
          .update({
            current_lat: latitude,
            current_lng: longitude,
            location_updated_at: new Date().toISOString()
          })
          .eq('id', collectorId)

        if (error) {
          console.error('Failed to update live location:', error)
          // Don't change status to error on every failure to avoid flickering UI, 
          // but we log it for debugging
        }
      },
      (error) => {
        setStatus('error')
        setErrorMessage(`Location error: ${error.message}`)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [collectorId, isTrackingEnabled, supabase])

  if (!isTrackingEnabled) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm shadow-lg dark:border-white/[.145] dark:bg-black">
      {status === 'tracking' && (
        <>
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
          <span className="font-medium text-zinc-700 dark:text-zinc-200">Live tracking active</span>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <span className="font-medium text-red-700 dark:text-red-400">Tracking failed: {errorMessage}</span>
        </>
      )}
    </div>
  )
}
