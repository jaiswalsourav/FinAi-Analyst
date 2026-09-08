import StockChart from '../../stock/StockChart';
import StockChat from '../../stock/StockChat';
import StockDetail from '../../stock/StockDetail';

export default function StockWorkspace({ symbol }) {
  return (
    <div className="stock-workspace">
      <div className="result-box">
        <StockChart symbol={symbol} />
      </div>
      <div className="stock-sidebar">
        <StockDetail symbol={symbol} />
        <StockChat symbol={symbol} />
      </div>
    </div>
  );
}
