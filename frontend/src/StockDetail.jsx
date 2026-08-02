import { useEffect, useState } from 'react';

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

  return (
    <div className="result-box">
      <h3 style={{ marginTop: 0 }}>Stock Details</h3>

      {loading && <div>Loading stock data...</div>}
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      {info && (
        <div>
          {/* Header row: symbol, price, change */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <strong>Symbol:</strong> {symbol}
            </div>
            <div>
              <strong>Price:</strong>{' '}
              {info.global_quote && info.global_quote['05. price']
                ? Number(info.global_quote['05. price']).toFixed(2)
                : 'N/A'}
            </div>
            <div>
              <strong>Change:</strong>{' '}
              {info.global_quote && info.global_quote['09. change']
                ? Number(info.global_quote['09. change']).toFixed(2)
                : 'N/A'}
            </div>
            <div>
              <strong>%:</strong>{' '}
              {info.global_quote && info.global_quote['10. change percent']
                ? info.global_quote['10. change percent']
                : 'N/A'}
            </div>
          </div>

          {/* Recent close prices table to give quick context */}
          {info.time_series && Object.keys(info.time_series).length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ margin: '6px 0' }}>Recent Close Prices</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#8fa2bf' }}>
                    <th>Date</th>
                    <th>Close</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(info.time_series)
                    .slice(0, 5)
                    .map(([date, vals]) => (
                      <tr key={date} style={{ borderBottom: '1px solid #1a202c' }}>
                        <td style={{ padding: '8px 4px' }}>{date}</td>
                        <td style={{ padding: '8px 4px' }}>{Number(vals['4. close']).toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
