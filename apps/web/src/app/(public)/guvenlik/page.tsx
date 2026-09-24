export default function SecurityPortalPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          🛡️ Pars DevState Savunma Mimarisi
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-white tracking-tight sm:text-5xl">
          Güvenlik ve Şeffaflık
        </h1>
        <p className="mt-4 text-base text-slate-400">
          Kıstas, sıfır güven (Zero-Trust) ilkeleri ve banka standardında veritabanı kalkanlarıyla korunmaktadır.
        </p>
      </div>

      <div className="mt-12 space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white">1. RFC 9116 Sorumlu Zafiyet Bildirimi (VDP)</h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Güvenlik araştırmacılarının platformumuzdaki potansiyel açıkları sorumlu bir şekilde bildirmesini teşvik ediyoruz.
            Güvenlik iletişim adresimiz: <strong className="text-blue-400">kistasdestek@gmail.com</strong>
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white">2. Veri Güvenliği ve RLS İzolasyonu</h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Kullanıcı oturumları `httpOnly` çerezlerde saklanır ve yerel tarayıcı depolamasında (localStorage) asla taşınmaz.
            Her işlem sunucu tarafında yeniden yetkilendirilir ve veritabanı satır düzeyinde (RLS) kilitlenir.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white">3. Finansal Bütünlük & İmmutable Audit</h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Tüm bakiye ve kredi hareketleri çift taraflı defter-i kebir (double-entry ledger) ve SHA-256 hash zincirli değiştirilemez denetim kayıtlarıyla kayıt altına alınır. Eksi bakiye veya çift harcama donanımsal düzeyde engellenmiştir.
          </p>
        </div>
      </div>
    </div>
  );
}
