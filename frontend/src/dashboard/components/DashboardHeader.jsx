export default function DashboardHeader({ currentUser, profileOpen, onToggleProfile, onLogout, onOpenProfile }) {
  const [firstName] = (currentUser.name || currentUser.email).split(/\s|@/);
  const initials = firstName?.[0]?.toUpperCase() || 'U';

  return (
    <div className="dashboard-header">
      <div>
        <h2 style={{ margin: 0 }}>Welcome back, {currentUser.name}</h2>
        <p className="subtitle" style={{ margin: '4px 0 0' }}>
          {currentUser.role?.toUpperCase() === 'ADMIN'
            ? 'You can manage users and run AI-assisted analysis.'
            : 'Ask questions and get AI-assisted financial insights.'}
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          className="small-btn"
          onClick={onToggleProfile}
          aria-label="Open profile menu"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <div className="profile-avatar">{initials}</div>
        </button>

        {profileOpen && (
          <div className="profile-menu">
            <div className="profile-menu-user">
              <strong>{currentUser.name || currentUser.email}</strong>
              <small>{currentUser.email}</small>
              <small>{currentUser.role}</small>
            </div>
            <button className="small-btn profile-menu-item" onClick={() => onOpenProfile()}>Profile Details</button>
            <button className="small-btn profile-menu-item" onClick={() => alert('DMAT account placeholder')}>DMAT Account</button>
            <button className="small-btn profile-menu-item" onClick={() => alert('Bank details placeholder')}>Bank Details</button>
            <button className="small-btn profile-menu-item" onClick={() => alert('Reports placeholder')}>Reports</button>
            <button className="small-btn profile-menu-item" onClick={() => alert('Support placeholder')}>Support</button>
            <div className="profile-menu-logout">
              <button className="small-btn profile-menu-item" onClick={onLogout}>Logout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
