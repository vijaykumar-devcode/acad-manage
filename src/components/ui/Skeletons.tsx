export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const SkeletonCard = () => (
  <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <Skeleton className="h-6 w-24 rounded-md" />
      <Skeleton className="h-5 w-16 rounded-md" />
    </div>
    <Skeleton className="h-6 w-3/4 mb-3" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const SkeletonStatCard = () => (
  <div className="p-6 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
    <div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-12" />
    </div>
    <div className="p-3 bg-slate-50 rounded-lg">
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-surface rounded-xl border border-surface-border overflow-x-auto">
    <div className="bg-canvas-alt px-6 py-4 border-b border-surface-border flex gap-8 min-w-[600px]">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="divide-y divide-surface-border min-w-[600px]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-8 items-center">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-3 w-48">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonResultSheet = () => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="p-4 sm:p-8 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start gap-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg shrink-0" />
        <div>
          <Skeleton className="h-6 sm:h-8 w-48 sm:w-72 mb-2" />
          <Skeleton className="h-4 sm:h-5 w-32 sm:w-48 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-8 border-b border-slate-200">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <Skeleton className="h-3 w-16 sm:w-24 mb-2" />
          <Skeleton className="h-5 w-24 sm:w-32" />
        </div>
      ))}
    </div>
    <div className="p-4 sm:p-8">
      <SkeletonTable rows={4} />
    </div>
  </div>
);

export const SkeletonNotice = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 mb-4">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
        <div>
          <Skeleton className="h-5 sm:h-6 w-32 sm:w-48 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-md" />
    </div>
    <div className="space-y-3 pl-14 sm:pl-16">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[75%]" />
    </div>
  </div>
);

export const SkeletonProfile = () => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto mt-6">
    <div className="p-6 sm:p-10 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-6">
      <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
      <div className="text-center sm:text-left w-full flex-1">
        <Skeleton className="h-8 w-48 mb-3 sm:mx-0 mx-auto" />
        <Skeleton className="h-5 w-32 mb-2 sm:mx-0 mx-auto" />
        <Skeleton className="h-5 w-24 sm:mx-0 mx-auto" />
      </div>
      <Skeleton className="h-10 w-32 rounded-md mx-auto sm:mx-0 mt-4 sm:mt-0" />
    </div>
    <div className="p-6 sm:p-10">
      <Skeleton className="h-6 w-40 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonAppShell = () => (
  <div className="min-h-screen bg-canvas flex flex-col">
    <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="flex flex-1">
      <div className="w-64 bg-[#0B1120] hidden md:block p-4 space-y-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <Skeleton className="h-8 w-8 rounded-md bg-slate-800" />
          <Skeleton className="h-5 w-32 bg-slate-800" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-10 w-full rounded-lg bg-slate-800/50" />
        ))}
      </div>
      <div className="flex-1 p-6 md:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);
