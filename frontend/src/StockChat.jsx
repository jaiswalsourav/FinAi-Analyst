import { useState } from 'react';

/*
  StockChat.jsx
  - Lightweight, ephemeral chat UI scoped to the currently selected `symbol`.
  - Messages are kept in component state only (ephemeral per session) as
  - requested. On submit the component posts to `/ask-stock` which enriches
  - the prompt with recent stock data and forwards it to Gemini.
*/
export default function StockChat({ symbol }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // sendMessage: append the user's message locally, call the AI service,
  // then append the AI's reply. This keeps the chat flow simple and
  // avoids persisting conversations.
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { from: 'user', text: input };
    setMessages((m) => [...m, userMsg]);
    const question = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8001/ask-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, question }),
      });

      const data = await res.json();
      const botMsg = { from: 'bot', text: data.answer || 'No response' };
      setMessages((m) => [...m, botMsg]);
    } catch (e) {
      setMessages((m) => [...m, { from: 'bot', text: 'Failed to reach AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  // If no symbol is selected, do not render the chat box.
  if (!symbol) return null;

  return (
    <div className="result-box">
      <h3 style={{ marginTop: 0 }}>Chat about {symbol}</h3>

      {/* Message area: shows user and AI messages in chronological order */}
      <div style={{ height: '220px', overflowY: 'auto', background: '#0f1724', padding: '12px', borderRadius: '8px' }}>
        {messages.length === 0 && <div style={{ color: '#8fa2bf' }}>Ask a question specific to this stock.</div>}
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '8px 0', color: m.from === 'user' ? '#cbd5e1' : '#e2e8f0' }}>
            <strong style={{ display: 'block', color: '#94a3b8' }}>{m.from === 'user' ? 'You' : 'AI'}</strong>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      {/* Input area: submit a one-off question. The chat is ephemeral by
          design to match your requirement (no persistent storage). */}
      <form onSubmit={sendMessage} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${symbol} (e.g., valuation, recent news)`}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2d3748' }}
        />
        <button className="primary-btn" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
