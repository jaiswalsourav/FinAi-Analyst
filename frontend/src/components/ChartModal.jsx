import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Tall (portrait) popup used to enlarge a chart. Esc, the Close button or a click outside closes it.
export default function ChartModal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="chart-modal-backdrop" onMouseDown={onClose}>
      <div className="chart-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="chart-modal-head">
          <strong>{title}</strong>
          <button type="button" className="small-btn" onClick={onClose} autoFocus>Close ✕</button>
        </div>
        <div className="chart-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
