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

  const handleSearch = (event) => {
    event.preventDefault();
    const key = search.trim().toUpperCase();
    if (key) setSymbol(companyMap[key] || key);
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
