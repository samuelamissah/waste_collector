'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) {
        setNotifications(data as Notification[])
        setUnreadCount(data.filter((n: any) => !n.is_read).length)
      }
    }

    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
          
          // Optional: Browser notification if supported/enabled
          if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification(newNotification.title, { body: newNotification.message })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const markAsRead = async () => {
    if (unreadCount === 0) return

    // Optimistic update
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  const toggleOpen = () => {
    if (!isOpen) {
      markAsRead()
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-bell"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-zinc-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto border-t border-zinc-100 dark:border-zinc-800">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-zinc-100 p-4 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{notification.title}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{notification.message}</p>
                  <p className="mt-2 text-[10px] text-zinc-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
