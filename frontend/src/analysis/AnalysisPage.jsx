import AnalysisResult from './AnalysisResult';
import StockSearch from '../dashboard/components/StockSearch';
import FinancialQuestionForm from '../dashboard/components/FinancialQuestionForm';

export default function AnalysisPage({ question, setQuestion, symbol, setSymbol, answer, token, onSubmit, onBack }) {
  return (
    <div className="dashboard-card">
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0 }}>AI Analysis</h2>
          <p className="subtitle" style={{ margin: '4px 0 0' }}>
            Ask anything about a stock or the markets for a deeper analysis.
          </p>
        </div>
        <button type="button" className="small-btn" onClick={onBack}>Back to dashboard</button>
      </div>

      <StockSearch
        token={token}
        activeSymbol={symbol}
        eyebrow="Deep analysis"
        title="Pick a company to analyse"
        onSelect={(selected) => setSymbol(selected)}
        onFallback={(text) => {
          const key = text.toUpperCase().replace(/\s+/g, '');
          setSymbol(key.includes(':') ? key : `NSE:${key}`);
        }}
      />

      <div className="dashboard-grid">
        <FinancialQuestionForm
          question={question}
          setQuestion={setQuestion}
          symbol={symbol}
          setSymbol={setSymbol}
          onSubmit={onSubmit}
        />
        <div className="result-box">
          <h3>Analysis</h3>
          <AnalysisResult answer={answer} />
        </div>
      </div>
    </div>
  );
}
