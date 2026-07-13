import { useState } from 'react';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnswer('Thinking...');

    try {
      const response = await fetch('http://localhost:8080/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();
      setAnswer(data.answer || 'No response');
    } catch (error) {
      setAnswer('Error contacting backend.');
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>FinAI Analyst</h1>
      <p>Ask a financial question and get an AI-assisted analysis.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          rows="4"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Example: Compare Apple and Microsoft based on recent revenue growth"
          style={{ padding: 12, fontSize: 16 }}
        />
        <button type="submit" style={{ padding: '10px 16px', width: 140 }}>
          Analyze
        </button>
      </form>

      <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h3>Answer</h3>
        <p>{answer}</p>
      </div>
    </div>
  );
}

export default App;
