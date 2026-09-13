import { useState } from 'react';
import AnalysisResult from '../analysis/AnalysisResult';
import DashboardHeader from './components/DashboardHeader';
import FinancialQuestionForm from './components/FinancialQuestionForm';
import StockSearch from './components/StockSearch';
import StockWorkspace from './components/StockWorkspace';
import UserManagement from './components/UserManagement';
import { companyMap } from './config/companyMap';

export default function DashboardPage({
  users,
  currentUser,
  question,
  setQuestion,
  answer,
  onLogout,
  onSubmit,
  onOpenProfile,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [search, setSearch] = useState('');
  const [symbol, setSymbol] = useState('NASDAQ:AAPL');

  const handleSearch = async (event) => {
  event.preventDefault();
  const query = search.trim();
  if (!query) return;

  // 1. Check local companyMap first for fast resolution
  const key = query.toUpperCase();
  if (companyMap && companyMap[key]) {
    setSymbol(companyMap[key]);
    return;
  }

  // 2. Fetch live matching NSE stock from backend
  try {
    const token = localStorage.getItem('token');

    const resp = await fetch(
      `http://localhost:8080/search/stocksname?stockName=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.length > 0) {
        // Top matching result (e.g., "NSE:TCS")
        setSymbol(data[0].exchangeSymbol);
        return;
      }
    } else if (resp.status === 401 || resp.status === 403) {
      console.error('Unauthorized: Invalid or expired JWT token');
    }
  } catch (err) {
    console.error('Failed to search stock:', err);
  }

  // 3. Fallback: format directly as an NSE ticker if no backend match found
  setSymbol(key.startsWith('NSE:') ? key : `NSE:${key}`);
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

      <StockSearch value={search} onChange={setSearch} onSearch={handleSearch} />
      <StockWorkspace symbol={symbol} />

      <div className="dashboard-grid">
        <UserManagement users={users} visible={currentUser.role === 'admin' && showUserList} />
        <FinancialQuestionForm question={question} setQuestion={setQuestion} onSubmit={onSubmit} />
        <div className="result-box">
          <h3>Analysis</h3>
          <AnalysisResult answer={answer} />
        </div>
      </div>
    </div>
  );
}
