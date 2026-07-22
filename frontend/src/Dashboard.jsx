import { useState } from "react";
import StockMarket from "./StockMarket";
import StockChart from "./StockChart";

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
  const [search, setSearch] = useState("");
  const [symbol, setSymbol] = useState("NASDAQ:AAPL");

  const handleSearch = () => {
    if (!search.trim()) return;

    const key = search.trim().toUpperCase();
    setSymbol(companyMap[key] || key);
  };

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
        </div>

        <button className="small-btn" onClick={onLogout}>
          Sign out
        </button>
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

      {/* Company Chart */}
      <div
        className="result-box"
        style={{ marginBottom: "20px" }}
      >
        <StockChart symbol={symbol} />
      </div>

      {/* Existing Dashboard */}
      <div className="dashboard-grid">
        <div
          className="result-box"
          style={{ gridColumn: "1 / -1" }}
        >
          <StockMarket />
        </div>

        {currentUser.role === "admin" && (
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

          <p>
            {answer || "Your insights will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}