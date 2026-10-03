import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchStockHistory } from '../services/apiClient';

const RANGES = [['1d', '1D'], ['5d', '5D'], ['1mo', '1M'], ['6mo', '6M'], ['1y', '1Y'], ['5y', '5Y']];
const RANGE_NAMES = { '1d': 'today', '5d': '5 days', '1mo': '1 month', '6mo': '6 months', '1y': '1 year', '5y': '5 years' };

const isIndian = (symbol) => /^(NSE|BSE):/i.test(symbol || '') || /^\^(NSE|BSE|CNX|NSMID)/i.test(symbol || '') || /\.(NS|BO)$/i.test(symbol || '');
const money = (value, digits = 2) => (Number.isFinite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: digits }) : 'N/A');

function formatLabel(iso, range, long = false) {
  const date = new Date(iso);
  const options = {
    '1d': { hour: '2-digit', minute: '2-digit', hour12: false },
    '5d': long ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false } : { day: 'numeric', month: 'short' },
    '1mo': { day: 'numeric', month: 'short' },
    '6mo': { day: 'numeric', month: 'short' },
    '1y': { month: 'short', year: '2-digit' },
    '5y': { month: 'short', year: '2-digit' },
  }[range];
  if (long && !['1d', '5d'].includes(range)) return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return date.toLocaleString('en-IN', { ...options, timeZone: 'Asia/Kolkata' });
}

// Candlestick: the bar spans low..high, so the wick fills the bar and the body is placed from open/close
function Candle({ x, y, width, height, payload }) {
  const { o, c, h, l } = payload;
  const color = c >= o ? 'var(--viz-up)' : 'var(--viz-down)';
  const scale = h > l ? height / (h - l) : 0;
  const bodyTop = y + (h - Math.max(o, c)) * scale;
  const bodyHeight = Math.max(1.5, Math.abs(c - o) * scale);
  const center = x + width / 2;
  const bodyWidth = Math.max(1.5, Math.min(width * 0.7, 14));
  return (
    <g>
      <line x1={center} x2={center} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={center - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
}

function PriceTooltip({ active, payload, currency, range }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="viz-tooltip">
      <div className="viz-tooltip-label">{formatLabel(point.t, range, true)}</div>
      <div className="viz-tooltip-row"><strong>{currency}{money(point.c)}</strong></div>
      {Number.isFinite(point.change) && (
        <div className={`viz-tooltip-delta ${point.change >= 0 ? 'up' : 'down'}`}>
          {point.change >= 0 ? '▲' : '▼'} {Math.abs(point.change).toFixed(2)}% vs previous
        </div>
      )}
      <div className="price-ohlc">
        <span>O {money(point.o)}</span><span>H {money(point.h)}</span>
        <span>L {money(point.l)}</span><span>C {money(point.c)}</span>
      </div>
      {point.v > 0 && <div className="price-ohlc"><span>Vol {money(point.v, 0)}</span></div>}
    </div>
  );
}

// height: a CSS length (e.g. 300 or 'clamp(...)') for a fixed-size chart, or '100%' to fill a parent (the popup)
export default function StockChart({ symbol, height = 300, onEnlarge }) {
  const token = useSelector((state) => state.auth.token);
  const [range, setRange] = useState('6mo');
  const [mode, setMode] = useState('line');
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!symbol) return undefined;
    let active = true;
    setLoading(true);
    setError('');

    fetchStockHistory(symbol, range, token)
      .then((data) => { if (active) setPoints(data.points || []); })
      .catch((requestError) => { if (active) { setError(requestError.message || 'Could not load the chart.'); setPoints(null); } })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [symbol, range, token, reload]);

  const data = useMemo(() => (points || []).map((point, index, all) => ({
    ...point,
    label: formatLabel(point.t, range),
    hl: [point.l, point.h],
    change: index > 0 && all[index - 1].c ? ((point.c - all[index - 1].c) / all[index - 1].c) * 100 : null,
  })), [points, range]);

  if (!symbol) return null;

  const currency = isIndian(symbol) && !/^\^(GSPC|IXIC|DJI)/i.test(symbol) ? '₹' : '$';
  const first = data[0];
  const last = data[data.length - 1];
  const periodChange = first && last && first.c ? ((last.c - first.c) / first.c) * 100 : null;
  const trendUp = periodChange === null || periodChange >= 0;
  const lows = data.map((point) => (mode === 'candles' ? point.l : point.c));
  const highs = data.map((point) => (mode === 'candles' ? point.h : point.c));
  const pad = data.length ? (Math.max(...highs) - Math.min(...lows)) * 0.06 || 1 : 1;
  const domain = data.length ? [Math.min(...lows) - pad, Math.max(...highs) + pad] : ['auto', 'auto'];
  const fillParent = height === '100%';
  const axis = { stroke: 'var(--viz-axis)', tickLine: false, tick: { fill: 'var(--viz-text-muted)', fontSize: 11 } };

  return (
    <div className="price-chart viz" style={fillParent ? { height: '100%' } : undefined}>
      <div className="price-head">
        <div>
          {last && (
            <>
              <span className="price-last">{currency}{money(last.c)}</span>
              {periodChange !== null && (
                <span className={`price-change ${trendUp ? 'trend-up' : 'trend-down'}`}>
                  {trendUp ? '▲' : '▼'} {Math.abs(periodChange).toFixed(2)}% <small>{RANGE_NAMES[range]}</small>
                </span>
              )}
            </>
          )}
        </div>
        <div className="price-controls">
          <div className="viz-seg" role="group" aria-label="Time range">
            {RANGES.map(([key, label]) => (
              <button key={key} type="button" className={range === key ? 'on' : ''} onClick={() => setRange(key)}>{label}</button>
            ))}
          </div>
          <div className="viz-seg" role="group" aria-label="Chart type">
            {[['line', 'Line'], ['candles', 'Candles']].map(([key, label]) => (
              <button key={key} type="button" className={mode === key ? 'on' : ''} onClick={() => setMode(key)}>{label}</button>
            ))}
          </div>
          {onEnlarge && (
            <button type="button" className="small-btn viz-enlarge" onClick={onEnlarge} aria-label="Enlarge chart">⤢ Enlarge</button>
          )}
        </div>
      </div>

      <div className="price-body" style={fillParent ? { flex: 1, minHeight: 0 } : { height }}>
        {error && (
          <div className="price-message">
            <span className="error-text">{error}</span>
            <button type="button" className="small-btn" onClick={() => setReload((count) => count + 1)}>Retry</button>
          </div>
        )}
        {!error && !data.length && <div className="price-message empty-state">{loading ? 'Loading chart...' : 'No price data for this period.'}</div>}

        {!error && data.length > 0 && (
          <div className="price-plot" style={{ opacity: loading ? 0.5 : 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={36} interval="preserveStartEnd" />
                <YAxis {...axis} axisLine={false} width={64} domain={domain} tickFormatter={(value) => money(value, 0)} orientation="right" />
                <Tooltip
                  content={<PriceTooltip currency={currency} range={range} />}
                  cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
                  isAnimationActive={false}
                />
                {mode === 'line' ? (
                  <>
                    <Area type="monotone" dataKey="c" stroke="none" fill={trendUp ? 'var(--viz-up)' : 'var(--viz-down)'} fillOpacity={0.1} isAnimationActive={false} />
                    <Line type="monotone" dataKey="c" stroke={trendUp ? 'var(--viz-up)' : 'var(--viz-down)'} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: 'var(--viz-surface)', strokeWidth: 2 }} isAnimationActive={false} />
                  </>
                ) : (
                  <Bar dataKey="hl" shape={<Candle />} isAnimationActive={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
