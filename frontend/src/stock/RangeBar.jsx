// Low and high shown as separate capsules, with a marker for where the current value sits between them.
export default function RangeBar({ label, low, high, value, format }) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;

  const span = high - low;
  const position = Number.isFinite(value) && span > 0 ? Math.min(100, Math.max(0, ((value - low) / span) * 100)) : null;

  return (
    <div className="range-block">
      {label && <div className="range-label">{label}</div>}
      <div className="range-caps">
        <span className="cap low"><small>Low</small>{format(low)}</span>
        <span className="cap high"><small>High</small>{format(high)}</span>
      </div>
      <div className="range-track" role="img" aria-label={`${label || 'Range'}: low ${format(low)}, high ${format(high)}`}>
        {position !== null && <span className="range-marker" style={{ left: `${position}%` }} />}
      </div>
    </div>
  );
}
