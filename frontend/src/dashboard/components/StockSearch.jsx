import { useEffect, useRef, useState } from 'react';
import { searchStocks } from '../../services/apiClient';
import { popularIndianStocks } from '../config/companyMap';

export default function StockSearch({ token, activeSymbol, onSelect, onFallback, eyebrow = 'Indian markets', title = 'Search any NSE company', compact = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [notFound, setNotFound] = useState(false);
  const wrapper = useRef(null);

  // Debounced live lookup while typing
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setNotFound(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchStocks(text, token)
        .then((data) => {
          if (!active) return;
          setResults(Array.isArray(data) ? data : []);
          setNotFound(!data?.length);
          setHighlight(-1);
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setNotFound(true);
        })
        .finally(() => active && setLoading(false));
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, token]);

  // Close the dropdown when clicking elsewhere
  useEffect(() => {
    const close = (event) => {
      if (wrapper.current && !wrapper.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (symbol, label) => {
    onSelect(symbol, label);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (highlight >= 0 && results[highlight]) {
      choose(results[highlight].exchangeSymbol, results[highlight].stockName);
    } else if (results.length > 0) {
      choose(results[0].exchangeSymbol, results[0].stockName);
    } else if (query.trim()) {
      onFallback(query.trim());
      setQuery('');
      setOpen(false);
    }
  };

  const handleKeyDown = (event) => {
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  // Small pill for the dashboard header: no heading, no chips; popular stocks show in the dropdown
  if (compact) {
    const typing = query.trim().length >= 2;
    return (
      <div className="search-compact" ref={wrapper}>
        <form onSubmit={handleSubmit} role="search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="text"
            value={query}
            placeholder="Search NSE company or ticker"
            aria-label="Search company"
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </form>

        {open && (
          <ul className="search-dropdown" role="listbox">
            {!typing && <li className="search-status">Popular</li>}
            {!typing && popularIndianStocks.map((stock) => (
              <li
                key={stock.symbol}
                role="option"
                aria-selected={activeSymbol === stock.symbol}
                className="search-option"
                onMouseDown={(event) => { event.preventDefault(); choose(stock.symbol, stock.label); }}
              >
                <span className="search-option-name">{stock.label}</span>
                <span className="symbol-pill">{stock.symbol}</span>
              </li>
            ))}
            {typing && loading && <li className="search-status">Searching...</li>}
            {typing && !loading && notFound && (
              <li className="search-status">No NSE company found. Press Enter to try "{query.trim()}" as a ticker.</li>
            )}
            {typing && results.map((item, index) => (
              <li
                key={item.exchangeSymbol}
                role="option"
                aria-selected={index === highlight}
                className={`search-option${index === highlight ? ' active' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => { event.preventDefault(); choose(item.exchangeSymbol, item.stockName); }}
              >
                <span className="search-option-name">{item.stockName}</span>
                <span className="symbol-pill">{item.exchangeSymbol}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="result-box stock-search-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="search-wrapper" ref={wrapper}>
        <form className="stock-search-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={query}
            placeholder="Search by company name or ticker, e.g. Tata Motors, SBIN, Zomato..."
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <button type="submit" className="primary-btn">Search</button>
        </form>

        {showDropdown && (
          <ul className="search-dropdown" role="listbox">
            {loading && <li className="search-status">Searching...</li>}
            {!loading && notFound && (
              <li className="search-status">No NSE company found for "{query.trim()}". Press Search to try it as a ticker.</li>
            )}
            {results.map((item, index) => (
              <li
                key={item.exchangeSymbol}
                role="option"
                aria-selected={index === highlight}
                className={`search-option${index === highlight ? ' active' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => { event.preventDefault(); choose(item.exchangeSymbol, item.stockName); }}
              >
                <span className="search-option-name">{item.stockName}</span>
                <span className="symbol-pill">{item.exchangeSymbol}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="chip-row">
        <span className="chip-label">Popular:</span>
        {popularIndianStocks.map((stock) => (
          <button
            key={stock.symbol}
            type="button"
            className={`chip${activeSymbol === stock.symbol ? ' chip-active' : ''}`}
            onClick={() => choose(stock.symbol, stock.label)}
          >
            {stock.label}
          </button>
        ))}
      </div>
    </div>
  );
}
