export default function StatisticsView() {
  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-sm text-violet-300">Erweiterte Auswertung</p>
        <h1 className="text-3xl font-bold tracking-tight">Statistiken</h1>
        <p className="mt-2 text-sm text-slate-400">
          Hier entsteht die Detailansicht fuer Austria Wien Kennzahlen.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20">
        <h2 className="font-semibold">Noch keine erweiterten Stats</h2>
        <p className="mt-2 text-sm text-slate-400">
          Der Bereich ist vorbereitet und kann als naechstes mit Match-, Team-
          und Saisonmetriken befuellt werden.
        </p>
      </section>
    </>
  )
}
