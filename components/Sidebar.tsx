type View = 'dashboard' | 'statistics' | 'players'

type SidebarProps = {
  activeView: View
  setActiveView: (view: View) => void
}

const navItems: Array<{ label: string; view: View }> = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Statistiken', view: 'statistics' },
  { label: 'Spieler', view: 'players' },
]

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  function navClass(view: View) {
    const isActive = activeView === view

    return isActive
      ? 'block w-full rounded-xl bg-violet-600 px-4 py-3 text-left font-medium text-white'
      : 'block w-full rounded-xl px-4 py-3 text-left text-slate-400 hover:bg-white/5 hover:text-white'
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1020]/95 px-4 py-4 backdrop-blur lg:hidden">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-bold">
            A
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-wide">
              Austria Wien
            </p>
            <p className="text-xs text-slate-400">Stats</p>
          </div>
        </div>

        <nav className="grid grid-cols-3 gap-2 text-xs">
          {navItems.map((item) => {
            const isActive = activeView === item.view

            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setActiveView(item.view)}
                className={`rounded-lg px-2 py-2 font-medium ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-slate-300'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>

      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0B1020] p-6 lg:block">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-lg font-bold">
            A
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wide">
              Austria Wien
            </p>
            <p className="text-xs text-slate-400">Stats</p>
          </div>
        </div>

        <nav className="space-y-2 text-sm">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => setActiveView(item.view)}
              className={navClass(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
