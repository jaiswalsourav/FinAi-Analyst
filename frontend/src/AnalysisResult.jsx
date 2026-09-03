import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function cleanLine(line) {
  return line
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trim();
}

function extractMetrics(text) {
  const metrics = [];
  const pattern = /([A-Za-z][A-Za-z &/%-]{2,35})\s*[:=-]\s*(\$?\s?-?\d[\d,.]*(?:\.\d+)?\s*%?)/g;
  let match;

  while ((match = pattern.exec(text)) && metrics.length < 6) {
    const label = match[1].trim();
    const value = match[2].replace(/\s+/g, '');
    if (!metrics.some((metric) => metric.label.toLowerCase() === label.toLowerCase())) {
      metrics.push({ label, value });
    }
  }

  return metrics;
}

function formatAnswer(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(cleanLine)
    .filter((line) => !/^#{1,6}\s/.test(line));
}

export default function AnalysisResult({ answer }) {
  const content = answer && answer !== 'Thinking...' ? answer : '';
  const lines = useMemo(() => formatAnswer(content), [content]);
  const metrics = useMemo(() => extractMetrics(content), [content]);
  const chartData = useMemo(
    () => metrics.map((metric, index) => ({
      name: metric.label.length > 14 ? `${metric.label.slice(0, 14)}...` : metric.label,
      value: Number.parseFloat(metric.value.replace(/[$,%]/g, '')),
      fullLabel: metric.label,
    })).filter((metric) => Number.isFinite(metric.value)),
    [metrics],
  );

  if (!content) {
    return <div className="empty-state">Your insights will appear here.</div>;
  }

  return (
    <div className="analysis-result">
      {metrics.length > 0 && (
        <div className="metric-grid">
          {metrics.map((metric) => (
            <div className="metric-card" key={`${metric.label}-${metric.value}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="insight-chart" aria-label="Extracted analysis metrics chart">
          <div className="section-heading">
            <span>Visual snapshot</span>
            <small>Values detected in the response</small>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
              <CartesianGrid stroke="#25344a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#91a4bf" tick={{ fontSize: 11 }} />
              <YAxis stroke="#91a4bf" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#132238', border: '1px solid #2c405c', borderRadius: 8 }}
                labelStyle={{ color: '#dce7f5' }}
              />
              <Bar dataKey="value" fill="#63d7bd" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="answer-copy">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}
