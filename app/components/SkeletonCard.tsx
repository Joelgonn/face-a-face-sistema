export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border bg-slate-50">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-5 bg-slate-200 rounded-lg w-32 animate-pulse mb-2" />
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <div className="h-4 bg-slate-200 rounded-full w-16 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded-full w-20 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded-full w-24 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="h-3 bg-slate-200 rounded w-28 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}