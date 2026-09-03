import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/*
  StockDetail.jsx
  - Responsible for fetching per-symbol details from `ai-service`'s
  - `/stock-info` endpoint (Alpha Vantage wrapper).
  - Renders latest quote, percent change, and a small table of recent closes.
*/
export default function StockDetail({ symbol }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError('');
    setInfo(null);

    const fetchInfo = async () => {
      try {
        // Fetch stock info from the local AI service proxy which contacts
        // Alpha Vantage. Keeping this server-side avoids exposing your API
        // keys in the browser.
        const res = await fetch(`http://localhost:8001/stock-info?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        setInfo(data);
      } catch (e) {
        setError(e.message || 'Failed');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [symbol]);

  if (!symbol) return null;

  const quote = info?.global_quote || {};
  const price = quote['05. price'] ? Number(quote['05. price']).toFixed(2) : 'N/A';
  const change = quote['09. change'] ? Number(quote['09. change']).toFixed(2) : 'N/A';
  const percent = quote['10. change percent'] || 'N/A';
  const closeData = info?.time_series
    ? Object.entries(info.time_series)
      .slice(0, 10)
      .reverse()
      .map(([date, values]) => ({ date: date.slice(5), close: Number(values['4. close']) }))
      .filter((point) => Number.isFinite(point.close))
    : [];

  return (
    <div className="result-box">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Market pulse</span>
          <h3>Stock Details</h3>
        </div>
        <span className="symbol-pill">{symbol}</span>
      </div>

      {loading && <div>Loading stock data...</div>}
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      {info && (
        <div>
          <div className="quote-grid">
            <div className="quote-card quote-card-primary">
              <span>Last price</span>
              <strong>${price}</strong>
            </div>
            <div className="quote-card">
              <span>Change</span>
              <strong>{change}</strong>
            </div>
            <div className="quote-card">
              <span>Today</span>
              <strong>{percent}</strong>
            </div>
          </div>

          {closeData.length > 1 && (
            <div className="mini-chart">
              <div className="section-heading">
                <span>Recent close trend</span>
                <small>Last {closeData.length} sessions</small>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={closeData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#25344a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#91a4bf" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#91a4bf" tick={{ fontSize: 10 }} domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    contentStyle={{ background: '#132238', border: '1px solid #2c405c', borderRadius: 8 }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Close']}
                  />
                  <Line type="monotone" dataKey="close" stroke="#63d7bd" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {closeData.length > 0 && (
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead><tr><th>Date</th><th>Close</th></tr></thead>
                <tbody>{closeData.slice(-5).reverse().map((point) => (
                  <tr key={point.date}><td>{point.date}</td><td>${point.close.toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
