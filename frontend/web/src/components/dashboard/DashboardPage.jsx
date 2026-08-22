import Sidebar from '../layout/Sidebar'
import MetricGrid from './MetricGrid'
import QueuePanel from './QueuePanel'
import ModelPanel from './ModelPanel'
import ActivityPanel from './ActivityPanel'
import ChecklistPanel from './ChecklistPanel'
import { metrics, queues, timeline } from '../../data/dashboard'

function DashboardPage() {
  return (
    <div className="shell">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Monday, August 20, 2026</p>
            <h2>Operational overview</h2>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-button">
              Export report
            </button>
            <button type="button" className="primary-button">
              Create rule
            </button>
          </div>
        </header>

        <MetricGrid metrics={metrics} />

        <section className="content-grid">
          <QueuePanel queues={queues} />
          <ModelPanel />
        </section>

        <section className="bottom-grid">
          <ActivityPanel timeline={timeline} />
          <ChecklistPanel />
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
