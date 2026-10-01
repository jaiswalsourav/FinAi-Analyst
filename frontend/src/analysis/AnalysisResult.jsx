import { Fragment, useEffect, useMemo, useState } from 'react';
import ReportChart from './ReportChart';
import { extractKeyFigures, groupSections, numericColumns, parseBlocks, parseNumber, stripMarkdown, tableHighlights } from './markdown';

function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|(?<![*\w])\*[^*\s][^*]*\*(?!\w))/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function DataTable({ table }) {
  const columns = useMemo(() => numericColumns(table), [table]);
  // Rows that are different metrics (price, P/E, market cap...) have mixed units, so they can't share one axis
  const metricRows = /^(metric|metrics|parameter|indicator|particulars|item|ratio|measure)s?$/i.test(stripMarkdown(table.header[0] || ''));
  const hasChart = columns.length > 0 && table.rows.length >= 2 && !metricRows;

  return (
    <div className="report-table-block">
      {hasChart && <ReportChart table={table} columns={columns} />}
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

const STATUS = ['Fetching market data...', 'Reading the financials...', 'Writing the analysis...'];

function Skeleton() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STATUS.length - 1)), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="report-skeleton" aria-label="Analysing">
      <div className="typing"><span /><span /><span /><small>{STATUS[step]}</small></div>
      <div className="skeleton-line medium" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}

export default function AnalysisResult({ answer }) {
  const loading = answer === 'Thinking...';
  const content = answer && !loading ? answer : '';

  const { sections, figures, isReport } = useMemo(() => {
    const blocks = parseBlocks(content);
    const grouped = groupSections(blocks);
    const listFigures = extractKeyFigures(blocks);
    const firstTable = blocks.find((block) => block.type === 'table' && numericColumns(block).length > 0);
    const highlights = listFigures.length < 2 && firstTable ? tableHighlights(firstTable) : [];
    // Only real analyses (a table, or 2+ titled sections) get the full report layout
    const report = blocks.some((block) => block.type === 'table') || grouped.filter((section) => section.title).length >= 2;
    return { sections: grouped, figures: listFigures.length >= 2 ? listFigures : highlights, isReport: report };
  }, [content]);

  if (loading) return <Skeleton />;
  if (!content) return <div className="empty-state">No answer yet.</div>;

  // Short question -> short conversational answer, no report chrome
  if (!isReport) {
    return (
      <div className="report plain-answer">
        {sections.map((section, index) => (
          <section className="plain-section" key={`${section.title}-${index}`}>
            {section.title && <h4 className="report-heading"><span>{stripMarkdown(section.title)}</span></h4>}
            {section.blocks.map((block, blockIndex) => <Block key={blockIndex} block={block} />)}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="report">
      <div className="report-toolbar">
        <span className="eyebrow">AI report</span>
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

      <p className="report-disclaimer">AI-generated analysis from market data for information only. It is not investment advice - verify figures before acting.</p>
    </div>
  );
}
