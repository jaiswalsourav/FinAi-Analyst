import { useState } from 'react';
import { useSelector } from 'react-redux';
import { parseAnswer } from '../analysis/followUps';
import { askAboutStock } from '../services/apiClient';

export function useStockChat(symbol) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = useSelector((state) => state.auth.token);

  const sendMessage = async (question) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    setMessages((current) => [...current, { from: 'user', text: trimmedQuestion }]);
    setLoading(true);
//Financial Question
    try {
      const data = await askAboutStock(symbol, trimmedQuestion, token);
      // Drop the follow-up suggestion block; this small chat only shows the answer
      const { text } = parseAnswer(data.answer || 'No response');
      setMessages((current) => [...current, { from: 'bot', text }]);
    } catch (error) {
      setMessages((current) => [...current, { from: 'bot', text: error.message || 'Failed to reach AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
}
