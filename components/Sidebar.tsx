type View = 'dashboard' | 'statistics'

type SidebarProps = {
  activeView: View
  setActiveView: (view: View) => void
}

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  function navClass(view: View) {
    const isActive = activeView === view

    return isActive
      ? 'block w-full rounded-xl bg-violet-600 px-4 py-3 text-left font-medium text-white'
      : 'block w-full rounded-xl px-4 py-3 text-left text-slate-400 hover:bg-white/5 hover:text-white'
  }

  return (
    <aside className="hidden w-64 border-r border-white/10 bg-[#0B1020] p-6 lg:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-lg font-bold">
          A
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-wide">
            Austria Wien
          </p>
          <p className="text-xs text-slate-400">Analytics</p>
        </div>
      </div>

      <nav className="space-y-2 text-sm">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className={navClass('dashboard')}
        >
          Dashboard
        </button>

        <button
          type="button"
          onClick={() => setActiveView('statistics')}
          className={navClass('statistics')}
        >
          Statistiken
        </button>
      </nav>
    </aside>
  )
}