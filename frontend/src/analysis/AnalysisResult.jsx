import { Fragment, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { extractKeyFigures, groupSections, numericColumns, parseBlocks, parseNumber, stripMarkdown, tableHighlights } from './markdown';

const TIME_LABEL = /(q[1-4]|fy\s?\d|\b(19|20)\d\d\b|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|(?<![*\w])\*[^*\s][^*]*\*(?!\w))/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function TableChart({ table, columns, active }) {
  const column = columns.find((item) => item.index === active) || columns[0];
  const data = table.rows
    .map((row) => ({ name: stripMarkdown(row[0] ?? ''), value: parseNumber(row[column.index] ?? '') }))
    .filter((point) => point.value !== null);
  const isTrend = data.length >= 3 && data.every((point) => TIME_LABEL.test(point.name));
  const axis = { stroke: '#91a4bf', tick: { fontSize: 11 } };
  const tooltip = { contentStyle: { background: '#132238', border: '1px solid #2c405c', borderRadius: 8 }, formatter: (value) => [value, column.name] };

  return (
    <ResponsiveContainer width="100%" height={230}>
      {isTrend ? (
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#25344a" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tooltip} />
          <Line type="monotone" dataKey="value" stroke="#63d7bd" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#25344a" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" {...axis} interval={0} tickFormatter={(label) => (label.length > 12 ? `${label.slice(0, 11)}…` : label)} />
          <YAxis {...axis} />
          <Tooltip {...tooltip} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {data.map((point) => <Cell key={point.name} fill={point.value < 0 ? '#f87171' : '#63d7bd'} />)}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function DataTable({ table }) {
  const columns = useMemo(() => numericColumns(table), [table]);
  const [active, setActive] = useState(columns[0]?.index);
  const hasChart = columns.length > 0 && table.rows.length >= 2;

  return (
    <div className="report-table-block">
      {hasChart && (
        <div className="report-chart">
          <div className="section-heading">
            <span>Visual snapshot</span>
            {columns.length > 1 && (
              <div className="chip-row" style={{ margin: 0 }}>
                {columns.map((column) => (
                  <button
                    key={column.index}
                    type="button"
                    className={`chip${(active ?? columns[0].index) === column.index ? ' chip-active' : ''}`}
                    onClick={() => setActive(column.index)}
                  >
                    {column.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <TableChart table={table} columns={columns} active={active ?? columns[0].index} />
        </div>
      )}
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>{table.header.map((cell, index) => <th key={index} className={index > 0 ? 'num' : ''}><Inline text={cell} /></th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {table.header.map((_, colIndex) => {
                  const cell = row[colIndex] ?? '';
                  const value = colIndex > 0 ? parseNumber(cell) : null;
                  const tone = value === null ? '' : /^[\s₹$]*[-−(]/.test(stripMarkdown(cell)) ? ' neg' : /^\s*\+/.test(stripMarkdown(cell)) ? ' pos' : '';
                  return <td key={colIndex} className={`${colIndex > 0 ? 'num' : ''}${tone}`}><Inline text={cell} /></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const VERDICT_SECTION = /verdict|recommend|conclusion|outlook|rating|summary/i;
const VERDICTS = [
  [/\b(strong buy|buy|accumulate|bullish|outperform)\b/i, 'good'],
  [/\b(hold|neutral|wait|mixed)\b/i, 'warn'],
  [/\b(sell|avoid|bearish|underperform|reduce)\b/i, 'bad'],
];

function verdictFor(section) {
  if (!VERDICT_SECTION.test(section.title)) return null;
  const text = section.blocks.map((block) => block.text || block.items?.map((item) => item.text).join(' ') || '').join(' ');
  for (const [pattern, tone] of VERDICTS) {
    const match = text.match(pattern);
    if (match) return { label: match[0].toUpperCase(), tone };
  }
  return null;
}

function Block({ block }) {
  switch (block.type) {
    case 'p': return <p><Inline text={block.text} /></p>;
    case 'quote': return <blockquote><Inline text={block.text} /></blockquote>;
    case 'ul': return <ul>{block.items.map((item, index) => <li key={index} className={item.nested ? 'nested' : ''}><Inline text={item.text} /></li>)}</ul>;
    case 'ol': return <ol>{block.items.map((item, index) => <li key={index}><Inline text={item.text} /></li>)}</ol>;
    case 'table': return <DataTable table={block} />;
    default: return null;
  }
}

function Skeleton() {
  return (
    <div className="report-skeleton" aria-label="Analysing">
      <div className="skeleton-line short" />
      <div className="skeleton-cards"><span /><span /><span /></div>
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line medium" />
      <small className="helper-text">Analysing — fetching market data and writing the report...</small>
    </div>
  );
}

export default function AnalysisResult({ answer }) {
  const [copied, setCopied] = useState(false);
  const loading = answer === 'Thinking...';
  const content = answer && !loading ? answer : '';

  const { sections, figures } = useMemo(() => {
    const blocks = parseBlocks(content);
    const listFigures = extractKeyFigures(blocks);
    const firstTable = blocks.find((block) => block.type === 'table' && numericColumns(block).length > 0);
    const highlights = listFigures.length < 2 && firstTable ? tableHighlights(firstTable) : [];
    return { sections: groupSections(blocks), figures: listFigures.length >= 2 ? listFigures : highlights };
  }, [content]);

  if (loading) return <Skeleton />;
  if (!content) return <div className="empty-state">Your analysis report will appear here. Pick a company, ask a question, and press Analyze.</div>;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="report">
      <div className="report-toolbar">
        <span className="eyebrow">AI report</span>
        <button type="button" className="small-btn" onClick={copyReport}>{copied ? 'Copied ✓' : 'Copy report'}</button>
      </div>

      {figures.length >= 2 && (
        <div className="metric-grid report-figures">
          {figures.map((figure) => (
            <div className="metric-card" key={figure.label}>
              <span>{figure.label}</span>
              <strong>{figure.value}</strong>
              {figure.period && <small className="metric-period">{figure.period}</small>}
              {Number.isFinite(figure.delta) && (
                <small className={`metric-delta ${figure.delta >= 0 ? 'up' : 'down'}`}>
                  {figure.delta >= 0 ? '▲' : '▼'} {Math.abs(figure.delta).toFixed(1)}% vs {figure.versus}
                </small>
              )}
            </div>
          ))}
        </div>
      )}

      {sections.map((section, index) => {
        const verdict = verdictFor(section);
        return (
          <section className={`report-section${index === 0 && !section.title ? ' report-lead' : ''}`} key={`${section.title}-${index}`}>
            {section.title && (
              <h4 className="report-heading">
                <span>{stripMarkdown(section.title)}</span>
                {verdict && <span className={`verdict-badge ${verdict.tone}`}>{verdict.label}</span>}
              </h4>
            )}
            {section.blocks.map((block, blockIndex) => <Block key={blockIndex} block={block} />)}
          </section>
        );
      })}

      <p className="report-disclaimer">AI-generated analysis from market data for information only. It is not investment advice — verify figures before acting.</p>
    </div>
  );
}
