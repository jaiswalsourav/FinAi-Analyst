import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for Nifty50
const niftyChartData = [
  { time: '09:15', price: 24150 },
  { time: '10:00', price: 24180 },
  { time: '10:45', price: 24165 },
  { time: '11:30', price: 24210 },
  { time: '12:15', price: 24195 },
  { time: '13:00', price: 24240 },
  { time: '13:45', price: 24260 },
  { time: '14:30', price: 24225 },
  { time: '15:15', price: 24280 },
];

const topStocks = [
  { symbol: 'RELIANCE', name: 'Reliance', price: 2945.50, change: 1.25, changePercent: 0.43 },
  { symbol: 'TCS', name: 'TCS', price: 3850.00, change: 52.50, changePercent: 1.38 },
  { symbol: 'INFY', name: 'Infosys', price: 1680.25, change: 28.50, changePercent: 1.72 },
  { symbol: 'WIPRO', name: 'Wipro', price: 385.75, change: 5.75, changePercent: 1.51 },
  { symbol: 'ITC', name: 'ITC', price: 432.80, change: -3.20, changePercent: -0.74 },
  { symbol: 'MARUTI', name: 'Maruti', price: 8920.00, change: -125.00, changePercent: -1.38 },
];

export default function StockMarket() {
  const currentNiftyPrice = niftyChartData[niftyChartData.length - 1].price;
  const previousNiftyPrice = niftyChartData[0].price;
  const niftyChange = currentNiftyPrice - previousNiftyPrice;
  const niftyChangePercent = ((niftyChange / previousNiftyPrice) * 100).toFixed(2);
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
          <AreaChart data={niftyChartData}>
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
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    padding: '12px 8px',
                    color: stock.change >= 0 ? '#4ade80' : '#ef4444',
                    fontWeight: 500
                  }}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
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
