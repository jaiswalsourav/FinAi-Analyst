export default function FinancialQuestionForm({ question, setQuestion, symbol, setSymbol, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="result-box">
      <div className="form-field">
        <label>Selected stock</label>
        {symbol ? (
          <div className="selected-stock">
            <span className="symbol-pill">{symbol}</span>
            <button type="button" className="text-btn" onClick={() => setSymbol('')}>Clear</button>
          </div>
        ) : (
          <small className="helper-text" style={{ margin: 0 }}>None - ask a general question, or search a company above.</small>
        )}
      </div>
      <div className="form-field">
        <label>Financial Question</label>
        <textarea
          rows="4"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={symbol ? `Example: Is ${symbol} a good long-term buy?` : 'Example: Compare TCS and Infosys'}
        />
      </div>
      <button type="submit" className="primary-btn">Analyze</button>
    </form>
  );
}
