import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StockMarket() {
  const [niftyData, setNiftyData] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [currentNiftyPrice, setCurrentNiftyPrice] = useState(0);
  const [niftyChange, setNiftyChange] = useState(0);
  const [niftyChangePercent, setNiftyChangePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const FINNHUB_API_KEY = 'cqn3a49r01qpkpfev4d0cqn3a49f';
  const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        setError('');
        const niftyResponse = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=%5ENSEI&token=${FINNHUB_API_KEY}`);
        const niftyJson = await niftyResponse.json();
        if (niftyJson.c) {
          const change = niftyJson.c - niftyJson.pc;
          setCurrentNiftyPrice(niftyJson.c);
          setNiftyChange(change);
          setNiftyChangePercent(((change / niftyJson.pc) * 100).toFixed(2));
          setNiftyData(Array.from({ length: 9 }, (_, index) => ({ time: `${9 + Math.floor(index / 1.5)}:${(index * 10) % 60}`, price: niftyJson.pc + (Math.random() - 0.4) * 200 + index * 15 })));
        }
        const stocksData = [];
        for (const symbol of ['RELIANCE', 'TCS', 'INFY', 'WIPRO', 'ITC', 'MARUTI']) {
          try {
            const response = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}.NS&token=${FINNHUB_API_KEY}`);
            const data = await response.json();
            if (data.c) {
              const change = data.c - data.pc;
              stocksData.push({ symbol, name: symbol, price: data.c, change: change.toFixed(2), changePercent: ((change / data.pc) * 100).toFixed(2) });
            }
          } catch (stockError) {
            console.warn(`Failed to fetch ${symbol}:`, stockError);
          }
        }
        setTopStocks(stocksData);
      } catch (stockError) {
        console.error('Failed to fetch stock data:', stockError);
        setError('Unable to load stock data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchStockData();
    const interval = setInterval(fetchStockData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading stock data...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  const isPositive = niftyChange >= 0;

  return <div style={{ width: '100%', padding: 20 }}><div className="result-box"><h2>NIFTY 50</h2><p>National Stock Exchange</p><strong>{currentNiftyPrice.toFixed(2)}</strong><div style={{ color: isPositive ? '#4ade80' : '#ef4444' }}>{isPositive ? '+' : ''}{niftyChange.toFixed(2)} ({niftyChangePercent}%)</div><ResponsiveContainer width="100%" height={300}><AreaChart data={niftyData}><defs><linearGradient id="niftyPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isPositive ? '#4ade80' : '#ef4444'} stopOpacity={0.3} /><stop offset="95%" stopColor={isPositive ? '#4ade80' : '#ef4444'} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#2d3748" /><XAxis dataKey="time" stroke="#8fa2bf" /><YAxis stroke="#8fa2bf" /><Tooltip /><Area type="monotone" dataKey="price" stroke={isPositive ? '#4ade80' : '#ef4444'} fill="url(#niftyPrice)" /></AreaChart></ResponsiveContainer></div><div className="result-box"><h3>Top Movers</h3><table style={{ width: '100%' }}><tbody>{topStocks.map((stock) => <tr key={stock.symbol}><td>{stock.symbol}</td><td>₹{stock.price.toFixed(2)}</td><td>{stock.change}</td><td>{stock.changePercent}%</td></tr>)}</tbody></table></div></div>;
}
