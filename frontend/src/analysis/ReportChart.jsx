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

export default function ReportChart({ table, columns, expanded = false }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(columns[0].index);
  const [mode, setMode] = useState(null); // null = auto (line for time series, bars otherwise)
  const [hover, setHover] = useState(null);

  const column = columns.find((item) => item.index === active) || columns[0];
  const { points, timed } = useMemo(() => buildSeries(table, column.index), [table, column.index]);
  const chartMode = mode || (timed && points.length >= 3 ? 'line' : 'bars');

  const data = useMemo(() => points.map((point, index) => {
    const before = index > 0 ? points[index - 1] : null;
    const delta = timed && before && before.value ? ((point.value - before.value) / Math.abs(before.value)) * 100 : null;
    return { ...point, delta, prev: before?.name };
  }), [points, timed]);

  if (data.length < 2) return null;

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
          <div className="viz-title">{column.name}</div>
          <div className="viz-sub">{data.length} {timed ? 'periods' : 'items'} · hover for details</div>
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
          {columns.map((item) => (
            <button
              key={item.index}
              type="button"
              role="tab"
              aria-selected={item.index === column.index}
              className={item.index === column.index ? 'on' : ''}
              onClick={() => { setActive(item.index); setHover(null); }}
            >
              <span className="viz-key" />{item.name}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={chartHeight}>
        {chartMode === 'line' ? (
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
        <ChartModal title={column.name} onClose={() => setOpen(false)}>
          <ReportChart table={table} columns={columns} expanded />
        </ChartModal>
      )}
    </div>
  );
}
