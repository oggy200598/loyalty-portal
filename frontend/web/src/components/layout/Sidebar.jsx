import { navSections } from '../../data/dashboard'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Ecommerce Risk Platform</p>
        <h1>Control Center</h1>
        <p className="sidebar-copy">
          A real-world admin layout for transaction monitoring, manual review,
          and model operations.
        </p>
      </div>

      <nav aria-label="Primary">
        {navSections.map((item, index) => (
          <a
            key={item}
            className={`nav-item ${index === 0 ? 'active' : ''}`}
            href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {item}
          </a>
        ))}
      </nav>

      <div className="sidebar-card">
        <p className="sidebar-card-label">Database</p>
        <strong>PostgreSQL connected</strong>
        <span>Last sync: 2 minutes ago</span>
      </div>
    </aside>
  )
}

export default Sidebar
