import { useState } from 'react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'game', label: 'Energy Game' },
  { id: 'chat', label: 'AI Advisor' },
]

function TabNav({ activeTab, setActiveTab, theme, setTheme, userName, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    setMenuOpen(false)
  }

  return (
    <header className="tab-nav">
      <div className="brand-block">
        <div className="brand-spark" aria-hidden="true">
          PL
        </div>
        <div className="brand-copy">
          <p className="brand-title">Phantom Load</p>
          <p className="brand-subtitle">Energy waste command center</p>
        </div>
      </div>

      <button
        type="button"
        className={`nav-burger ${menuOpen ? 'nav-burger-open' : ''}`}
        onClick={() => setMenuOpen((current) => !current)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className={`nav-actions ${menuOpen ? 'nav-actions-open' : ''}`}>
        <nav className="tab-list" aria-label="Primary navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${activeTab === tab.id ? 'nav-tab-active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="nav-utility-group">
          {userName ? (
            <div className="session-pill" aria-label={`Signed in as ${userName}`}>
              <span className="theme-toggle-label">Signed in</span>
              <strong>{userName}</strong>
            </div>
          ) : null}

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            <span className="theme-toggle-label">Theme</span>
            <strong>{theme === 'light' ? 'Light' : 'Dark'}</strong>
          </button>

          {onLogout ? (
            <button type="button" className="button button-secondary nav-logout" onClick={onLogout}>
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default TabNav
