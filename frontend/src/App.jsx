import { useState } from 'react';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setLoggedIn(true);
  };

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
    } catch {
      setAnswer('Error contacting backend.');
    }
  };

  return (
    <div className="app-shell">
      {!loggedIn ? (
        <div className="login-card">
          <div className="brand">
            <div className="brand-badge">FA</div>
            <div>
              <h1 style={{ margin: 0 }}>FinAI Analyst</h1>
              <p style={{ margin: '4px 0 0', color: '#8fa2bf' }}>Secure workspace</p>
            </div>
          </div>

          <p className="subtitle">
            Sign in to access AI-powered market research, earnings summaries, and financial analysis.
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@company.com"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button type="submit" className="primary-btn" style={{ width: '100%' }}>
              Sign In
            </button>
            {error ? <p className="error-text">{error}</p> : null}
            <p className="helper-text">Demo login: use any email and password.</p>
          </form>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <h2 style={{ margin: 0 }}>Welcome back</h2>
              <p className="subtitle" style={{ margin: '4px 0 0' }}>
                Ask questions and get AI-assisted financial insights.
              </p>
            </div>
            <button className="small-btn" onClick={() => setLoggedIn(false)}>
              Sign out
            </button>
          </div>

          <div className="dashboard-grid">
            <form onSubmit={handleSubmit} className="result-box">
              <div className="form-field">
                <label htmlFor="question">Financial question</label>
                <textarea
                  id="question"
                  rows="4"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Example: Compare Apple and Microsoft based on recent revenue growth"
                />
              </div>
              <button type="submit" className="primary-btn">
                Analyze
              </button>
            </form>

            <div className="result-box">
              <h3 style={{ marginTop: 0 }}>Analysis</h3>
              <p style={{ marginBottom: 0, lineHeight: 1.7 }}>{answer || 'Your insights will appear here.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
