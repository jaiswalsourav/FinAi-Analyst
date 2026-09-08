export default function FinancialQuestionForm({ question, setQuestion, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="result-box">
      <div className="form-field">
        <label>Financial Question</label>
        <textarea
          rows="4"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Example: Compare Apple and Microsoft"
        />
      </div>
      <button type="submit" className="primary-btn">Analyze</button>
    </form>
  );
}
