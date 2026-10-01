import { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import StockSearch from './components/StockSearch';
import StockWorkspace from './components/StockWorkspace';
import UserManagement from './components/UserManagement';
import { companyMap } from './config/companyMap';

export default function DashboardPage({
  users,
  currentUser,
  token,
  onLogout,
  onOpenProfile,
  onOpenAnalysis,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [symbol, setSymbol] = useState('NASDAQ:AAPL');

  // Used when live search finds nothing: try a local name, else treat the text as an NSE ticker
  const handleFallback = (text) => {
    const key = text.toUpperCase().replace(/\s+/g, '');
    setSymbol(companyMap[key] || (key.includes(':') ? key : `NSE:${key}`));
    setCompanyName('');
  };

  return (
    <div className="dashboard-card">
      <DashboardHeader
        currentUser={currentUser}
        profileOpen={profileOpen}
        onToggleProfile={() => setProfileOpen((isOpen) => !isOpen)}
        onOpenProfile={() => {
          setProfileOpen(false);
          onOpenProfile?.();
        }}
        onLogout={onLogout}
        onOpenAnalysis={onOpenAnalysis}
      />

      {currentUser.role === 'admin' && (
        <button
          type="button"
          className="primary-btn"
          style={{ marginBottom: 20 }}
          onClick={() => setShowUserList((visible) => !visible)}
        >
          {showUserList ? 'Hide users' : 'View all users'}
        </button>
      )}

      <StockSearch
        token={token}
        activeSymbol={symbol}
        onSelect={(selected, name) => { setSymbol(selected); setCompanyName(name || ''); }}
        onFallback={handleFallback}
      />
      <StockWorkspace symbol={symbol} companyName={companyName} />

      <div className="dashboard-grid">
        <UserManagement users={users} visible={currentUser.role === 'admin' && showUserList} />
      </div>
    </div>
  );
}
