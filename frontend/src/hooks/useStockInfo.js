import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchStockInfo } from '../services/apiClient';

export function useStockInfo(symbol) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (!symbol) return undefined;

    let active = true;
    setLoading(true);
    setError('');
    setInfo(null);

    fetchStockInfo(symbol, token)
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Failed to fetch stock data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol, token]);

  return { info, loading, error };
}
