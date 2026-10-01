import StockChart from '../../stock/StockChart';
import StockChat from '../../stock/StockChat';
import StockDetail from '../../stock/StockDetail';

export default function StockWorkspace({ symbol, companyName }) {
  return (
    <div className="stock-workspace">
      <div className="result-box">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Live chart</span>
            <h3>{companyName || symbol}</h3>
          </div>
          <span className="symbol-pill">{symbol}</span>
        </div>
        <StockChart symbol={symbol} />
      </div>
      <div className="stock-sidebar">
        <StockDetail symbol={symbol} />
        <StockChat symbol={symbol} />
      </div>
    </div>
  );
}
