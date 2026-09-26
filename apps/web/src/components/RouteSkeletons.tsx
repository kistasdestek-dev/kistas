function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-white/[0.07] ${className}`} />;
}

export function DiscoveryRouteSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Projeler yükleniyor" className="mx-auto min-h-screen w-full max-w-[1180px] px-4 pb-24 pt-24 sm:px-6">
      <SkeletonBlock className="h-8 w-44" />
      <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
      <SkeletonBlock className="mt-8 h-14 w-full rounded-[28px]" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonBlock key={index} className="h-44 w-full rounded-[24px]" />
        ))}
      </div>
      <span className="sr-only">Projeler yükleniyor</span>
    </div>
  );
}

export function ProjectDetailRouteSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Proje yükleniyor" className="mx-auto min-h-screen w-full max-w-[1040px] px-4 pb-24 pt-24 sm:px-6">
      <SkeletonBlock className="h-10 w-10 rounded-full" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <SkeletonBlock className="aspect-[16/10] w-full rounded-[28px]" />
        <div>
          <SkeletonBlock className="h-9 w-3/4" />
          <SkeletonBlock className="mt-4 h-5 w-full" />
          <SkeletonBlock className="mt-2 h-5 w-5/6" />
          <SkeletonBlock className="mt-8 h-12 w-40 rounded-full" />
        </div>
      </div>
      <SkeletonBlock className="mt-10 h-40 w-full rounded-[28px]" />
      <span className="sr-only">Proje yükleniyor</span>
    </div>
  );
}
