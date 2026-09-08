import { useState } from 'react';
import { useStockChat } from '../hooks/useStockChat';

export default function StockChat({ symbol }) {
	const [input, setInput] = useState('');
	const { messages, loading, sendMessage } = useStockChat(symbol);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!input.trim()) return;
		const question = input;
		setInput('');
		await sendMessage(question);
	};

	if (!symbol) return null;

	return (
		<div className="result-box">
			<h3 style={{ marginTop: 0 }}>Chat about {symbol}</h3>
			<div style={{ height: '220px', overflowY: 'auto', background: '#0f1724', padding: '12px', borderRadius: '8px' }}>
				{messages.length === 0 && <div style={{ color: '#8fa2bf' }}>Ask a question specific to this stock.</div>}
				{messages.map((message, index) => (
					<div key={index} style={{ margin: '8px 0', color: message.from === 'user' ? '#cbd5e1' : '#e2e8f0' }}>
						<strong style={{ display: 'block', color: '#94a3b8' }}>{message.from === 'user' ? 'You' : 'AI'}</strong>
						<div>{message.text}</div>
					</div>
				))}
			</div>
			<form onSubmit={handleSubmit} style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
				<input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Ask about ${symbol}`} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2d3748' }} />
				<button className="primary-btn" disabled={loading}>{loading ? 'Thinking...' : 'Ask'}</button>
			</form>
		</div>
	);
}
