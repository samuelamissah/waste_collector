'use client'

import QRCode from 'react-qr-code'

export default function BinQR({ 
  code, 
  size = 128, 
  className 
}: { 
  code: string
  size?: number
  className?: string 
}) {
  if (!code) return null

  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black ${className}`}>
      <div className="bg-white p-2">
        <QRCode
          value={code}
          size={size}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={`0 0 ${size} ${size}`}
        />
      </div>
      <div className="font-mono text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {code}
      </div>
    </div>
  )
}
