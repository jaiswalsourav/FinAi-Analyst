import { useState } from 'react';
import ChartModal from '../../components/ChartModal';
import StockChart from '../../stock/StockChart';
import StockChat from '../../stock/StockChat';
import StockDetail from '../../stock/StockDetail';
import StockNews from '../../stock/StockNews';

// Chart height on the stock page. Fits the screen: the window height minus ~260px for the header,
// search and panel title, but never smaller than 360px or taller than 900px.
// Change it to a fixed size if you prefer, e.g. '400px'.
//const CHART_HEIGHT = 'clamp(360px, calc(100vh - 360px), 800px)';
const CHART_HEIGHT = '300px';
export default function StockWorkspace({ symbol, companyName }) {
  const [enlarged, setEnlarged] = useState(false);
  const title = companyName || symbol;

  return (
    <div className="stock-page">
      <div className="result-box">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Live chart</span>
            <h3>{title}</h3>
          </div>
          <span className="symbol-pill">{symbol}</span>
        </div>
        {!enlarged && <StockChart symbol={symbol} height={CHART_HEIGHT} onEnlarge={() => setEnlarged(true)} />}
      </div>

      {/* Everything else sits below the chart, side by side on wide screens */}
      <div className="stock-details-grid">
        <StockDetail symbol={symbol} />
        <StockNews symbol={symbol} />
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
