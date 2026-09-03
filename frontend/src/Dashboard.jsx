import { useState } from "react";
import StockMarket from "./StockMarket";
import StockChart from "./StockChart";
import StockDetail from "./StockDetail";
import StockChat from "./StockChat";
import AnalysisResult from "./AnalysisResult";

/*
  Dashboard.jsx
  - Top-level dashboard layout for the app.
  - Provides a search box to switch the displayed stock symbol.
  - Shows the TradingView chart (`StockChart`), stock details (`StockDetail`),
    and a chat panel scoped to the currently selected symbol (`StockChat`).
  - Contains header with profile menu and sign-out control.
*/

const companyMap = {
  APPLE: "NASDAQ:AAPL",
  MICROSOFT: "NASDAQ:MSFT",
  GOOGLE: "NASDAQ:GOOGL",
  AMAZON: "NASDAQ:AMZN",
  NVIDIA: "NASDAQ:NVDA",
  META: "NASDAQ:META",
  TESLA: "NASDAQ:TSLA",
  RELIANCE: "NSE:RELIANCE",
  TCS: "NSE:TCS",
  INFY: "NSE:INFY",
  HDFCBANK: "NSE:HDFCBANK",
  SBI: "NSE:SBIN",
};

export default function DashboardPage({
  users,
  currentUser,
  question,
  setQuestion,
  answer,
  onLogout,
  onSubmit,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");

  const initials = currentUser?.email?.split('@')[0]?.[0]?.toUpperCase() || 'U';

  // handleSearch: convert friendly names (Apple, TCS) to exchange symbols
  // and update `symbol` used by the chart / details / chat components.
  const handleSearch = () => {
    if (!search.trim()) return;

    const key = search.trim().toUpperCase();
    setSymbol(companyMap[key] || key);
  };

  const [showUserList, setShowUserList] = useState(false);

  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0 }}>
            Welcome back, {currentUser.email}
          </h2>

          <p className="subtitle" style={{ margin: "4px 0 0" }}>
            {currentUser.role === "admin"
              ? "You can manage users and run AI-assisted analysis."
              : "Ask questions and get AI-assisted financial insights."}
          </p>

          {currentUser.role === "admin" && (
            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: 12 }}
              onClick={() => setShowUserList((visible) => !visible)}
            >
              {showUserList ? 'Hide users' : 'View all users'}
            </button>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="small-btn"
            onClick={() => setProfileOpen((s) => !s)}
            aria-label="Open profile menu"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'linear-gradient(135deg,#4f8cff,#3b82f6)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              color: '#061826'
            }}>{initials}</div>
          </button>

          {profileOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              marginTop: 8,
              background: '#071826',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 8,
              minWidth: 220,
              zIndex: 40
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <strong style={{ display: 'block' }}>{currentUser.email}</strong>
                <small style={{ color: '#8fa2bf' }}>{currentUser.role}</small>
              </div>

              <button className="small-btn" style={{ width: '100%', marginTop: 8, textAlign: 'left' }} onClick={() => { setProfileOpen(false); onOpenProfile && onOpenProfile(); }}>Profile Details</button>
              <button className="small-btn" style={{ width: '100%', marginTop: 6, textAlign: 'left' }} onClick={() => { alert('DMAT account placeholder'); setProfileOpen(false); }}>DMAT Account</button>
              <button className="small-btn" style={{ width: '100%', marginTop: 6, textAlign: 'left' }} onClick={() => { alert('Bank details placeholder'); setProfileOpen(false); }}>Bank Details</button>
              <button className="small-btn" style={{ width: '100%', marginTop: 6, textAlign: 'left' }} onClick={() => { alert('Reports placeholder'); setProfileOpen(false); }}>Reports</button>
              <button className="small-btn" style={{ width: '100%', marginTop: 6, textAlign: 'left' }} onClick={() => { alert('Support placeholder'); setProfileOpen(false); }}>Support</button>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: 8, paddingTop: 8 }}>
                <button className="small-btn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setProfileOpen(false); onLogout(); }}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar at Top */}
      <div
        className="result-box"
        style={{
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Search Company Chart</h3>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            type="text"
            value={search}
            placeholder="Apple, Microsoft, Reliance, TCS..."
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />

          <button
            type="button"
            className="primary-btn"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>

      {/* Company Chart + Details + Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="result-box">
          <StockChart symbol={symbol} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <StockDetail symbol={symbol} />
          <StockChat symbol={symbol} />
        </div>
      </div>

      {/* Existing Dashboard */}
      <div className="dashboard-grid">
  {/* <div
    className="result-box"
    style={{ gridColumn: "1 / -1" }}
  >
    <StockMarket />
  </div> */}

        {currentUser.role === "admin" && showUserList && (
          <div className="result-box">
            <h3>User Management</h3>

            <ul>
              {users.map((user) => (
                <li key={user.email}>
                  {user.email} ({user.role})
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="result-box">
          <div className="form-field">
            <label>Financial Question</label>

            <textarea
              rows="4"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Example: Compare Apple and Microsoft"
            />
          </div>

          <button
            type="submit"
            className="primary-btn"
          >
            Analyze
          </button>
        </form>

        <div className="result-box">
          <h3>Analysis</h3>
          <AnalysisResult answer={answer} />
        </div>
      </div>
    </div>
  );
}