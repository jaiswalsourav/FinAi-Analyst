import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StockMarket() {
  const [niftyData, setNiftyData] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [currentNiftyPrice, setCurrentNiftyPrice] = useState(0);
  const [niftyChange, setNiftyChange] = useState(0);
  const [niftyChangePercent, setNiftyChangePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Finnhub API key (free tier)
  const FINNHUB_API_KEY = 'cqn3a49r01qpkpfev4d0cqn3a49r01qpkpfev4dg';
  const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch NIFTY50 data (using ^NSEI for NIFTY50 index)
        const niftyResponse = await fetch(
          `${FINNHUB_BASE_URL}/quote?symbol=%5ENSEI&token=${FINNHUB_API_KEY}`
        );
        const niftyJson = await niftyResponse.json();

        if (niftyJson.c) {
          const currentPrice = niftyJson.c;
          const previousPrice = niftyJson.pc;
          const change = currentPrice - previousPrice;
          const changePercent = ((change / previousPrice) * 100).toFixed(2);

          setCurrentNiftyPrice(currentPrice);
          setNiftyChange(change);
          setNiftyChangePercent(changePercent);

          // Generate chart data (simulated intraday for now)
          const chartData = [];
          const basePrice = previousPrice;
          for (let i = 0; i < 9; i++) {
            chartData.push({
              time: `${9 + Math.floor(i / 1.5)}:${(i * 10) % 60}`,
              price: basePrice + (Math.random() - 0.4) * 200 + i * 15
            });
          }
          setNiftyData(chartData);
        }

        // Fetch top Indian stocks
        const stockSymbols = ['RELIANCE', 'TCS', 'INFY', 'WIPRO', 'ITC', 'MARUTI'];
        const stocksData = [];

        for (const symbol of stockSymbols) {
          try {
            const response = await fetch(
              `${FINNHUB_BASE_URL}/quote?symbol=${symbol}.NS&token=${FINNHUB_API_KEY}`
            );
            const data = await response.json();

            if (data.c) {
              const change = data.c - data.pc;
              const changePercent = ((change / data.pc) * 100).toFixed(2);
              
              stocksData.push({
                symbol,
                name: symbol,
                price: data.c,
                change: change.toFixed(2),
                changePercent
              });
            }
          } catch (err) {
            console.warn(`Failed to fetch ${symbol}:`, err);
          }
        }

        setTopStocks(stocksData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch stock data:', err);
        setError('Unable to load stock data. Please try again later.');
        setLoading(false);
      }
    };

    fetchStockData();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchStockData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#8fa2bf' }}>Loading stock data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  const isPositive = niftyChange >= 0;

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      {/* Nifty50 Overview */}
      <div className="result-box" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0' }}>NIFTY 50</h2>
            <p style={{ margin: 0, color: '#8fa2bf' }}>National Stock Exchange</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {currentNiftyPrice.toFixed(2)}
            </div>
            <div style={{
              fontSize: '16px',
              color: isPositive ? '#4ade80' : '#ef4444',
              fontWeight: 500
            }}>
              {isPositive ? '+' : ''}{niftyChange.toFixed(2)} ({niftyChangePercent}%)
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={niftyData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#4ade80' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? '#4ade80' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis dataKey="time" stroke="#8fa2bf" />
            <YAxis stroke="#8fa2bf" domain={['dataMin - 50', 'dataMax + 50']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a202c',
                border: '1px solid #2d3748',
                borderRadius: '8px'
              }}
              formatter={(value) => value.toFixed(2)}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#4ade80' : '#ef4444'}
              fillOpacity={1}
              fill="url(#colorPrice)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Stocks */}
      <div className="result-box">
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Top Movers</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d3748' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#8fa2bf' }}>Symbol</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8fa2bf' }}>Price</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8fa2bf' }}>Change</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8fa2bf' }}>% Change</th>
              </tr>
            </thead>
            <tbody>
              {topStocks.map((stock) => (
                <tr key={stock.symbol} style={{
                  borderBottom: '1px solid #1a202c',
                  backgroundColor: stock.change >= 0 ? 'rgba(74, 222, 128, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 500 }}>{stock.symbol}</div>
                    <div style={{ color: '#8fa2bf', fontSize: '12px' }}>{stock.name}</div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                    ₹{stock.price.toFixed(2)}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    padding: '12px 8px',
                    color: stock.change >= 0 ? '#4ade80' : '#ef4444'
                  }}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    padding: '12px 8px',
                    color: stock.change >= 0 ? '#4ade80' : '#ef4444',
                    fontWeight: 500
                  }}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
