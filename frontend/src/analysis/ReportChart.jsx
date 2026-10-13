import { useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import ChartModal from '../components/ChartModal';
import { parseNumber, stripMarkdown, timeKey } from './markdown';

const compact = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};
const full = (value) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

// One series (one numeric column), chronological when the row labels are dates / quarters
function buildSeries(table, columnIndex) {
  const rows = table.rows
    .map((row, order) => ({ name: stripMarkdown(row[0] ?? ''), value: parseNumber(row[columnIndex] ?? ''), key: timeKey(row[0] ?? ''), order }))
    .filter((row) => row.value !== null);
  const timed = rows.length > 1 && rows.every((row) => row.key !== null);
  if (timed) rows.sort((a, b) => a.key - b.key);
  return { points: rows.map((row, index) => ({ ...row, index })), timed };
}

const PALETTE = ['#3987e5', '#f0a43a', '#4ade80', '#c084fc', '#f87171', '#22d3ee'];
const seriesColor = (position) => PALETTE[position % PALETTE.length];
const ALL = 'all';

// Every metric in one dataset. Metrics differ in scale (Rs Cr vs Rs per share), so each is plotted as % of its own
// peak (n<i>) while the tooltip keeps the real values (v<i>).
function buildCombined(table, columns) {
  const rows = table.rows.map((row, order) => ({ name: stripMarkdown(row[0] ?? ''), key: timeKey(row[0] ?? ''), order, row }));
  const timed = rows.length > 1 && rows.every((row) => row.key !== null);
  if (timed) rows.sort((a, b) => a.key - b.key);
  const peaks = columns.map((column) => Math.max(0, ...rows.map((row) => Math.abs(parseNumber(row.row[column.index] ?? '') ?? 0))));
  const data = rows.map((row) => {
    const point = { name: row.name };
    columns.forEach((column, position) => {
      const value = parseNumber(row.row[column.index] ?? '');
      point[`v${position}`] = value;
      point[`n${position}`] = value === null || !peaks[position] ? null : (value / peaks[position]) * 100;
    });
    return point;
  });
  return { data, timed };
}

function CombinedTooltip({ active, payload, label, columns }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="viz-tooltip">
      <div className="viz-tooltip-label">{label}</div>
      {columns.map((column, position) => (
        point[`v${position}`] === null || point[`v${position}`] === undefined ? null : (
          <div className="viz-tooltip-row" key={column.index}>
            <span className="viz-key" style={{ background: seriesColor(position) }} />
            <strong>{full(point[`v${position}`])}</strong>
            <span className="viz-tooltip-unit">{column.name}</span>
          </div>
        )
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, unit, showDelta }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="viz-tooltip">
      <div className="viz-tooltip-label">{point.name}</div>
      <div className="viz-tooltip-row">
        <span className="viz-key" />
        <strong>{full(point.value)}</strong>
        <span className="viz-tooltip-unit">{unit}</span>
      </div>
      {showDelta && Number.isFinite(point.delta) && (
        <div className={`viz-tooltip-delta ${point.delta >= 0 ? 'up' : 'down'}`}>
          {point.delta >= 0 ? '▲' : '▼'} {Math.abs(point.delta).toFixed(1)}% vs {point.prev}
        </div>
      )}
    </div>
  );
}

export default function ReportChart({ table, columns, expanded = false, initialActive }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(initialActive ?? (columns.length > 1 ? ALL : columns[0].index));
  const [mode, setMode] = useState(null); // null = auto (line for time series, bars otherwise)
  const [hover, setHover] = useState(null);

  const isAll = active === ALL && columns.length > 1;
  const column = columns.find((item) => item.index === active) || columns[0];
  const combined = useMemo(() => (isAll ? buildCombined(table, columns) : null), [isAll, table, columns]);
  const { points, timed } = useMemo(() => buildSeries(table, column.index), [table, column.index]);
  const chartMode = mode || ((isAll ? combined.timed && combined.data.length >= 3 : timed && points.length >= 3) ? 'line' : 'bars');

  const data = useMemo(() => points.map((point, index) => {
    const before = index > 0 ? points[index - 1] : null;
    const delta = timed && before && before.value ? ((point.value - before.value) / Math.abs(before.value)) * 100 : null;
    return { ...point, delta, prev: before?.name };
  }), [points, timed]);

  if ((isAll ? combined.data.length : data.length) < 2) return null;

  // Compact in the chat; the enlarged popup is tall (portrait)
  const chartHeight = expanded ? Math.max(380, Math.round(window.innerHeight * 0.6)) : 240;

  const unit = (column.name.match(/\(([^)]+)\)/) || [])[1] || '';
  const maxIndex = data.reduce((best, point, index) => (point.value > data[best].value ? index : best), 0);
  const lastIndex = data.length - 1;
  const hasNegative = data.some((point) => point.value < 0);
  const labelAt = (index) => index === lastIndex || index === maxIndex; // label sparingly: latest + peak

  const axis = { stroke: 'var(--viz-axis)', tickLine: false, tick: { fill: 'var(--viz-text-muted)', fontSize: 11 } };
  const grid = <CartesianGrid stroke="var(--viz-grid)" vertical={false} />;
  const tooltip = <Tooltip cursor={chartMode === 'line' ? { stroke: 'var(--viz-axis)', strokeWidth: 1 } : { fill: 'var(--viz-hover)' }} content={<ChartTooltip unit={unit} showDelta={timed} />} isAnimationActive={false} />;

  const renderEndDot = ({ cx, cy, index }) => {
    if (cx == null || cy == null || !labelAt(index)) return <g key={index} />;
    return (
      <g key={index}>
        <circle cx={cx} cy={cy} r={5} fill="var(--viz-series)" stroke="var(--viz-surface)" strokeWidth={2} />
        <text x={cx} y={cy - 12} textAnchor="middle" className="viz-label">{compact(data[index].value)}</text>
      </g>
    );
  };

  return (
    <div className={`report-chart viz${expanded ? ' viz-expanded' : ''}`}>
      <div className="viz-head">
        <div>
          <div className="viz-title">{isAll ? 'All metrics' : column.name}</div>
          <div className="viz-sub">
            {isAll ? combined.data.length : data.length} {(isAll ? combined.timed : timed) ? 'periods' : 'items'} · hover for details
            {isAll && ' · each metric scaled to its own peak'}
          </div>
        </div>
        <div className="viz-controls">
          <div className="viz-seg" role="group" aria-label="Chart type">
            {['bars', 'line'].map((type) => (
              <button key={type} type="button" className={chartMode === type ? 'on' : ''} onClick={() => setMode(type)}>{type === 'bars' ? 'Bars' : 'Line'}</button>
            ))}
          </div>
          {!expanded && (
            <button type="button" className="small-btn viz-enlarge" onClick={() => setOpen(true)} aria-label="Enlarge chart">⤢ Enlarge</button>
          )}
        </div>
      </div>

      {columns.length > 1 && (
        <div className="viz-legend" role="tablist" aria-label="Metric">
          <button type="button" role="tab" aria-selected={isAll} className={isAll ? 'on' : ''} onClick={() => { setActive(ALL); setHover(null); }}>
            <span className="viz-key" />All
          </button>
          {columns.map((item, position) => (
            <button
              key={item.index}
              type="button"
              role="tab"
              aria-selected={!isAll && item.index === column.index}
              className={!isAll && item.index === column.index ? 'on' : ''}
              onClick={() => { setActive(item.index); setHover(null); }}
            >
              <span className="viz-key" style={{ background: seriesColor(position) }} />{item.name}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={chartHeight}>
        {isAll ? (
          chartMode === 'line' ? (
            <ComposedChart data={combined.data} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" {...axis} padding={{ left: 16, right: 16 }} />
              <YAxis {...axis} axisLine={false} width={44} tickFormatter={(v) => `${Math.round(v)}%`} />
              <Tooltip cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }} content={<CombinedTooltip columns={columns} />} isAnimationActive={false} />
              {columns.map((item, position) => (
                <Line key={item.index} type="monotone" dataKey={`n${position}`} name={item.name} connectNulls stroke={seriesColor(position)} strokeWidth={2} dot={{ r: 3, fill: seriesColor(position), stroke: 'var(--viz-surface)', strokeWidth: 1 }} activeDot={{ r: 5, stroke: 'var(--viz-surface)', strokeWidth: 2 }} isAnimationActive={false} />
              ))}
            </ComposedChart>
          ) : (
            <BarChart data={combined.data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} barCategoryGap="18%">
              {grid}
              <XAxis dataKey="name" {...axis} interval={0} tickFormatter={(label) => (label.length > 12 ? `${label.slice(0, 11)}…` : label)} />
              <YAxis {...axis} axisLine={false} width={44} tickFormatter={(v) => `${Math.round(v)}%`} />
              <Tooltip cursor={{ fill: 'var(--viz-hover)' }} content={<CombinedTooltip columns={columns} />} isAnimationActive={false} />
              {columns.map((item, position) => (
                <Bar key={item.index} dataKey={`n${position}`} name={item.name} fill={seriesColor(position)} maxBarSize={18} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              ))}
            </BarChart>
          )
        ) : chartMode === 'line' ? (
          <ComposedChart data={data} margin={{ top: 26, right: 20, left: 0, bottom: 0 }}>
            {grid}
            <XAxis dataKey="name" {...axis} padding={{ left: 16, right: 16 }} />
            <YAxis {...axis} axisLine={false} width={52} tickFormatter={compact} domain={hasNegative ? ['auto', 'auto'] : [(min) => Math.max(0, min * 0.9), 'auto']} />
            {tooltip}
            <Area type="monotone" dataKey="value" stroke="none" fill="var(--viz-series)" fillOpacity={0.1} isAnimationActive={false} />
            <Line type="monotone" dataKey="value" stroke="var(--viz-series)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={renderEndDot} activeDot={{ r: 5, fill: 'var(--viz-series)', stroke: 'var(--viz-surface)', strokeWidth: 2 }} isAnimationActive={false} />
          </ComposedChart>
        ) : (
          <BarChart data={data} margin={{ top: 26, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%" onMouseLeave={() => setHover(null)}>
            {grid}
            <XAxis dataKey="name" {...axis} interval={0} tickFormatter={(label) => (label.length > 12 ? `${label.slice(0, 11)}…` : label)} />
            <YAxis {...axis} axisLine={false} width={52} tickFormatter={compact} />
            {tooltip}
            <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]} onMouseEnter={(_, index) => setHover(index)} isAnimationActive={false}>
              {data.map((point) => (
                <Cell
                  key={point.name}
                  fill={point.value < 0 ? 'var(--viz-negative)' : 'var(--viz-series)'}
                  fillOpacity={hover === null || hover === point.index ? 1 : 0.45}
                  stroke="var(--viz-surface)"
                  strokeWidth={0}
                />
              ))}
              <LabelList dataKey="value" position="top" content={({ x, y, width, index, value }) => (labelAt(index)
                ? <text x={x + width / 2} y={y - 8} textAnchor="middle" className="viz-label">{compact(value)}</text>
                : null)} />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>

      {open && (
        <ChartModal title={isAll ? 'All metrics' : column.name} onClose={() => setOpen(false)}>
          <ReportChart table={table} columns={columns} expanded initialActive={active} />
        </ChartModal>
      )}
    </div>
  );
}
