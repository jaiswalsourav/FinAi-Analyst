import { useState } from 'react';
import { askAboutStock } from '../services/apiClient';

export function useStockChat(symbol) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (question) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    setMessages((current) => [...current, { from: 'user', text: trimmedQuestion }]);
    setLoading(true);

    try {
      const data = await askAboutStock(symbol, trimmedQuestion);
      setMessages((current) => [...current, { from: 'bot', text: data.answer || 'No response' }]);
    } catch {
      setMessages((current) => [...current, { from: 'bot', text: 'Failed to reach AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
}
