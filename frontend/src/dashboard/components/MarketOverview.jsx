import { useEffect, useState } from 'react';
import ChartModal from '../../components/ChartModal';
import { fetchMarketOverview } from '../../services/apiClient';
import RangeBar from '../../stock/RangeBar';
import StockChart from '../../stock/StockChart';

const REFRESH_MS = 120000; // matches the 2-minute cache on the server

const money = (value) => (Number.isFinite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 'N/A');
const signed = (value) => `${value > 0 ? '+' : ''}${money(value)}`;
const tone = (value) => (value >= 0 ? 'trend-up' : 'trend-down');

function IndexCard({ index, active, onSelect }) {
  return (
    <button type="button" className={`index-card${active ? ' active' : ''}`} onClick={() => onSelect(index.symbol)} aria-pressed={active}>
      <div className="index-card-head">
        <span className="cap-tag">{index.cap}</span>
        <span className={`index-change ${tone(index.day_change_percent)}`}>
          {index.day_change_percent >= 0 ? '▲' : '▼'} {Math.abs(index.day_change_percent).toFixed(2)}%
        </span>
      </div>
      <div className="index-name">{index.name}</div>
      <div className="index-level">{money(index.level)}</div>
      <div className={`index-delta ${tone(index.day_change)}`}>{signed(index.day_change)} today</div>
      <RangeBar label="Day range" low={index.day_low} high={index.day_high} value={index.level} format={money} />
    </button>
  );
}

function MoversCard({ title, rows, onSelectStock }) {
  return (
    <div className="result-box movers-card">
      <div className="panel-heading"><div><span className="eyebrow">Nifty 50</span><h3>{title}</h3></div></div>
      <ul className="mover-list">
        {rows.map((row) => (
          <li key={row.symbol}>
            <button type="button" className="mover-row" onClick={() => onSelectStock(`NSE:${row.symbol}`, row.symbol)}>
              <span className="mover-symbol">{row.symbol}</span>
              <span className="mover-price">₹{money(row.price)}</span>
              <span className={`mover-change ${tone(row.change_percent)}`}>{signed(row.change_percent)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MarketOverview({ token, onSelectStock }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [chartSymbol, setChartSymbol] = useState('^NSEI');
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => fetchMarketOverview(token)
      .then((result) => { if (active) { setData(result); setError(''); } })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load market data.'); });

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { active = false; clearInterval(timer); };
  }, [token]);

  const indices = data?.indices || [];
  const selected = indices.find((index) => index.symbol === chartSymbol);
  const movers = data?.movers;
  const total = movers ? movers.advancing + movers.declining : 0;

  return (
    <div className="market-overview">
      <div className="panel-heading" style={{ marginBottom: 8 }}>
        <div>
          <span className="eyebrow">Indian markets</span>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Market overview</h3>
        </div>
        {data?.as_of && <small className="helper-text" style={{ margin: 0 }}>Updated {new Date(data.as_of).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small>}
      </div>

      {error && !data && <div className="result-box error-text">{error}</div>}
      {!data && !error && (
        <div className="index-grid" aria-label="Loading market data">
          {[0, 1, 2, 3].map((item) => <div className="index-card skeleton-line" style={{ height: 190 }} key={item} />)}
        </div>
      )}

      {data && (
        <div className="index-grid">
          {indices.map((index) => (
            <IndexCard key={index.symbol} index={index} active={index.symbol === chartSymbol} onSelect={setChartSymbol} />
          ))}
        </div>
      )}

      <div className="stock-workspace" style={{ marginTop: 14 }}>
        <div className="result-box">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Live chart</span>
              <h3>{selected?.name || 'Nifty 50'}</h3>
            </div>
            <span className="symbol-pill">{chartSymbol}</span>
          </div>
          {!enlarged && <StockChart symbol={chartSymbol} height={240} onEnlarge={() => setEnlarged(true)} />}
        </div>

        <div className="stock-sidebar">
          {movers && (
            <div className="result-box">
              <div className="panel-heading"><div><span className="eyebrow">Market breadth</span><h3>Nifty 50 today</h3></div></div>
              <div className="breadth-bar" role="img" aria-label={`${movers.advancing} advancing, ${movers.declining} declining`}>
                <span className="up" style={{ width: `${total ? (movers.advancing / total) * 100 : 50}%` }} />
              </div>
              <div className="breadth-legend">
                <span className="trend-up">▲ {movers.advancing} advancing</span>
                <span className="trend-down">▼ {movers.declining} declining</span>
              </div>
            </div>
          )}
          {movers && <MoversCard title="Top gainers" rows={movers.top_gainers} onSelectStock={onSelectStock} />}
          {movers && <MoversCard title="Top losers" rows={movers.top_losers} onSelectStock={onSelectStock} />}
          {data && !movers && <div className="result-box empty-state">Top movers are unavailable right now.</div>}
        </div>
      </div>

      {enlarged && (
        <ChartModal title={`${selected?.name || 'Nifty 50'} (${chartSymbol})`} onClose={() => setEnlarged(false)}>
          <StockChart symbol={chartSymbol} height="100%" />
        </ChartModal>
      )}
    </div>
  );
}
