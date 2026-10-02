import { useState } from 'react';
import ChartModal from '../../components/ChartModal';
import StockChart from '../../stock/StockChart';
import StockChat from '../../stock/StockChat';
import StockDetail from '../../stock/StockDetail';
import StockNews from '../../stock/StockNews';

export default function StockWorkspace({ symbol, companyName }) {
  const [enlarged, setEnlarged] = useState(false);
  const title = companyName || symbol;

  return (
    <div className="stock-workspace">
      <div className="result-box">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Live chart</span>
            <h3>{title}</h3>
          </div>
          <div className="heading-actions">
            <span className="symbol-pill">{symbol}</span>
            <button type="button" className="small-btn" onClick={() => setEnlarged(true)} aria-label="Enlarge chart">⤢ Enlarge</button>
          </div>
        </div>
        {!enlarged && <StockChart symbol={symbol} />}
        <StockNews symbol={symbol} />
      </div>
      <div className="stock-sidebar">
        <StockDetail symbol={symbol} />
        <StockChat symbol={symbol} />
      </div>

      {enlarged && (
        <ChartModal title={`${title} (${symbol})`} onClose={() => setEnlarged(false)}>
          <StockChart symbol={symbol} height="100%" />
        </ChartModal>
      )}
    </div>
  );
}
