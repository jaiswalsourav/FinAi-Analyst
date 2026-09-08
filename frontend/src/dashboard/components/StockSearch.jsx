export default function StockSearch({ value, onChange, onSearch }) {
  return (
    <div className="result-box stock-search-panel">
      <h3>Search Company Chart</h3>
      <form className="stock-search-form" onSubmit={onSearch}>
        <input
          type="text"
          value={value}
          placeholder="Apple, Microsoft, Reliance, TCS..."
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="submit" className="primary-btn">Search</button>
      </form>
    </div>
  );
}
