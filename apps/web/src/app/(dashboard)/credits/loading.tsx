export default function CreditsLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] px-4 pb-36 pt-6 sm:px-6 lg:px-8">
      <div className="h-52 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-96 animate-pulse rounded-[26px] border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </main>
  );
}
