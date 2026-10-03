import { useStockInfo } from '../hooks/useStockInfo';
import RangeBar from './RangeBar';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const isIndian = (symbol) => /^(NSE|BSE):/i.test(symbol || '');

function formatNumber(value, digits = 2) {
	return Number.isFinite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: digits }) : 'N/A';
}

// Market cap / volume in Indian units (Cr, L Cr) for NSE stocks, otherwise B / M / K
function formatLarge(value, indian, currency) {
	if (!Number.isFinite(value)) return 'N/A';
	if (indian) {
		if (value >= 1e12) return `${currency}${(value / 1e12).toFixed(2)} L Cr`;
		if (value >= 1e7) return `${currency}${(value / 1e7).toFixed(2)} Cr`;
		return `${currency}${value.toLocaleString('en-IN')}`;
	}
	if (value >= 1e12) return `${currency}${(value / 1e12).toFixed(2)}T`;
	if (value >= 1e9) return `${currency}${(value / 1e9).toFixed(2)}B`;
	if (value >= 1e6) return `${currency}${(value / 1e6).toFixed(2)}M`;
	return `${currency}${value.toLocaleString()}`;
}

export default function StockDetail({ symbol }) {
	const { info, loading, error } = useStockInfo(symbol);
	if (!symbol) return null;

	const indian = isIndian(symbol);
	const currency = indian ? '₹' : '$';
	const details = info?.details || {};
	const quote = info?.global_quote || {};
	const price = quote['05. price'] ? formatNumber(Number(quote['05. price'])) : 'N/A';
	const changeValue = quote['09. change'] ? Number(quote['09. change']) : null;
	const change = changeValue !== null ? `${changeValue > 0 ? '+' : ''}${formatNumber(changeValue)}` : 'N/A';
	const percent = quote['10. change percent'] || 'N/A';
	const trend = changeValue === null ? '' : changeValue >= 0 ? 'trend-up' : 'trend-down';
	const closeData = info?.time_series
		? Object.entries(info.time_series).slice(0, 10).reverse().map(([date, values]) => ({ date: date.slice(5), close: Number(values['4. close']) })).filter((point) => Number.isFinite(point.close))
		: [];

	const stats = [
		['Sector', details.sector || 'N/A'],
		['Industry', details.industry || 'N/A'],
		['Market cap', formatLarge(details.market_cap, indian, currency)],
		['P/E ratio', formatNumber(details.pe_ratio)],
		['EPS', Number.isFinite(details.eps) ? `${currency}${formatNumber(details.eps)}` : 'N/A'],
		['Dividend yield', Number.isFinite(details.dividend_yield) ? `${formatNumber(details.dividend_yield)}%` : 'N/A'],
		['Volume', formatNumber(details.volume, 0)],
	];

	return (
		<div className="result-box">
			<div className="panel-heading"><div><span className="eyebrow">Market pulse</span><h3>{details.name || 'Stock Details'}</h3></div><span className="symbol-pill">{symbol}</span></div>
			{loading && <div className="empty-state">Loading stock data...</div>}
			{error && <div style={{ color: '#ef4444' }}>{error}</div>}
			{info && <div>
				<div className="quote-grid">
					<div className="quote-card quote-card-primary"><span>Last price</span><strong>{currency}{price}</strong></div>
					<div className="quote-card"><span>Change</span><strong className={trend}>{change}</strong></div>
					<div className="quote-card"><span>Today</span><strong className={trend}>{percent}</strong></div>
				</div>
				<RangeBar label="Day range" low={details.day_low} high={details.day_high} value={Number(quote['05. price'])} format={(value) => `${currency}${formatNumber(value)}`} />
				<RangeBar label="52-week range" low={details.week52_low} high={details.week52_high} value={Number(quote['05. price'])} format={(value) => `${currency}${formatNumber(value)}`} />
				<div className="stat-list">{stats.map(([label, value]) => <div className="stat-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
				{closeData.length > 1 && <div className="mini-chart"><div className="section-heading"><span>Recent close trend</span><small>Last {closeData.length} sessions</small></div><ResponsiveContainer width="100%" height={190}><LineChart data={closeData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#25344a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" stroke="#91a4bf" tick={{ fontSize: 10 }} /><YAxis stroke="#91a4bf" tick={{ fontSize: 10 }} domain={['dataMin', 'dataMax']} /><Tooltip contentStyle={{ background: '#132238', border: '1px solid #2c405c', borderRadius: 8 }} formatter={(value) => [`${currency}${Number(value).toFixed(2)}`, 'Close']} /><Line type="monotone" dataKey="close" stroke="#63d7bd" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>}
				{closeData.length > 0 && <div className="recent-table-wrap"><table className="recent-table"><thead><tr><th>Date</th><th>Close</th></tr></thead><tbody>{closeData.slice(-5).reverse().map((point) => <tr key={point.date}><td>{point.date}</td><td>{currency}{point.close.toFixed(2)}</td></tr>)}</tbody></table></div>}
			</div>}
		</div>
	);
}
