export default function FinancialQuestionForm({ question, setQuestion, symbol, setSymbol, onSubmit, busy }) {
  // Enter sends, Shift+Enter adds a new line
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (question.trim() && !busy) onSubmit(event);
    }
  };

  return (
    <form onSubmit={onSubmit} className="composer">
      {symbol && (
        <div className="selected-stock">
          <span className="helper-text" style={{ margin: 0 }}>Asking about</span>
          <span className="symbol-pill">{symbol}</span>
          <button type="button" className="text-btn" onClick={() => setSymbol('')}>Clear</button>
        </div>
      )}
      <div className="composer-row">
        <textarea
          rows="2"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={symbol ? `Ask about ${symbol}, e.g. Is it a good long-term buy?` : 'Ask a financial question, e.g. Compare TCS and Infosys'}
        />
        <button type="submit" className="primary-btn" disabled={busy || !question.trim()}>
          {busy ? 'Analysing...' : 'Analyze'}
        </button>
      </div>
    </form>
  );
}
