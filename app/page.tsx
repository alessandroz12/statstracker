'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import DashboardView from '@/components/views/DashboardView'
import PlayersView from '@/components/views/PlayersView'
import StatisticsView from '@/components/views/StatisticsView'

type View = 'dashboard' | 'statistics' | 'players'

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard')

  return (
    <main className="min-h-screen bg-[#070B17] text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        <section className="flex-1 p-6 lg:p-10">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'statistics' && <StatisticsView />}
          {activeView === 'players' && <PlayersView />}
        </section>
      </div>
    </main>
  )
}
