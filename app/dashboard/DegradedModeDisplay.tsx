// app/dashboard/DegradedModeDisplay.tsx
'use client'

export function DegradedModeDisplay() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow text-center">
        <h2 className="text-lg font-bold mb-2">Modo Offline</h2>
        <p className="text-sm text-gray-500">
          Você está sem conexão. Os dados podem estar desatualizados.
        </p>
      </div>
    </div>
  )
}