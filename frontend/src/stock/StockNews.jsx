import { useEffect, useState } from 'react';
import { fetchStockNews } from '../services/apiClient';

function timeAgo(iso) {
  if (!iso) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StockNews({ symbol }) {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!symbol) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setNews(null);

    fetchStockNews(symbol)
      .then((data) => active && setNews(data))
      .catch((requestError) => active && setError(requestError.message || 'Could not load news.'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [symbol]);

  if (!symbol) return null;
  const articles = news?.articles || [];

  return (
    <div className="news-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">In the news</span>
          <h3>{news?.company ? `Latest on ${news.company}` : 'Latest news'}</h3>
        </div>
      </div>

      {loading && (
        <div className="news-list" aria-label="Loading news">
          {[0, 1, 2].map((item) => <div className="news-item skeleton-line" style={{ height: 54 }} key={item} />)}
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      {!loading && !error && news && articles.length === 0 && <div className="empty-state">No recent news found for this company.</div>}

      {articles.length > 0 && (
        <ul className="news-list">
          {articles.map((article) => (
            <li key={article.url}>
              <a className="news-item" href={article.url} target="_blank" rel="noopener noreferrer">
                <span className="news-title">{article.title}</span>
                <span className="news-meta">
                  {article.source && <strong>{article.source}</strong>}
                  {article.published && <span>{timeAgo(article.published)}</span>}
                  <span className="news-open" aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
