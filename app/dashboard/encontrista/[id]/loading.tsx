import { SkeletonCard } from '@/app/components/SkeletonCard'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-6 bg-slate-200 rounded-lg w-48 animate-pulse mb-2" />
              <div className="h-3 bg-slate-200 rounded-lg w-24 animate-pulse" />
            </div>
            <div className="w-20 h-8 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Conteúdo com Skeletons */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Card de Perfil Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
              <div>
                <div className="h-5 bg-slate-200 rounded-lg w-32 animate-pulse mb-2" />
                <div className="h-3 bg-slate-200 rounded-lg w-40 animate-pulse" />
              </div>
            </div>
            <div className="w-6 h-6 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Medicações Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 bg-slate-200 rounded-lg w-24 animate-pulse" />
          </div>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>

        {/* Histórico Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 bg-slate-200 rounded-lg w-28 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-5 h-5 bg-slate-200 rounded-full animate-pulse" />
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-32 animate-pulse mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-24 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-slate-200 rounded w-12 animate-pulse mb-1" />
                    <div className="h-3 bg-slate-200 rounded w-20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-5 h-5 bg-slate-200 rounded-full animate-pulse" />
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-28 animate-pulse mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-20 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-slate-200 rounded w-12 animate-pulse mb-1" />
                    <div className="h-3 bg-slate-200 rounded w-20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}