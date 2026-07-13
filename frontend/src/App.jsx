import { useEffect, useState } from 'react';
import './App.css';

const initialUsers = [
  { email: 'admin@company.com', password: 'admin123', role: 'admin' }
];

const loadUsers = () => {
  if (typeof window === 'undefined') {
    return initialUsers;
  }

  const savedUsers = window.localStorage.getItem('finai-users');
  if (!savedUsers) {
    return initialUsers;
  }

  try {
    return JSON.parse(savedUsers);
  } catch {
    return initialUsers;
  }
};

function App() {
  const [users, setUsers] = useState(loadUsers);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    window.localStorage.setItem('finai-users', JSON.stringify(users));
  }, [users]);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const foundUser = users.find(
      (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password
    );

    if (!foundUser) {
      setError('Invalid credentials.');
      return;
    }

    setCurrentUser(foundUser);
    setError('');
    setMessage('');
    setView('dashboard');
  };

  const handleCreateUser = (e) => {
    e.preventDefault();

    const trimmedEmail = newUserEmail.trim().toLowerCase();
    const trimmedPassword = newUserPassword.trim();

    if (!trimmedEmail || !trimmedPassword || !confirmPassword) {
      setError('Please provide email, password, and confirmation for the new user.');
      return;
    }

    if (trimmedPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === trimmedEmail)) {
      setError('That user already exists.');
      return;
    }

    const newUser = { email: trimmedEmail, password: trimmedPassword, role: 'user' };
    setUsers((prev) => [...prev, newUser]);
    setNewUserEmail('');
    setNewUserPassword('');
    setConfirmPassword('');
    setError('');
    setMessage(`User ${trimmedEmail} was created successfully.`);
    setView('login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setQuestion('');
    setAnswer('');
    setError('');
    setMessage('');
    setView('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnswer('Thinking...');

    const buildAuthHeaders = () => {
      if (!currentUser) {
        return {};
      }

      return {
        Authorization: `Basic ${btoa(`${currentUser.email}:${currentUser.password}`)}`
      };
    };

    try {
      const backendResponse = await fetch('http://localhost:8080/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({ question })
      });

      if (!backendResponse.ok) {
        throw new Error(`Backend responded with ${backendResponse.status}`);
      }

      const backendData = await backendResponse.json();
      if (backendData.answer) {
        setAnswer(backendData.answer);
        return;
      }

      throw new Error('No response from backend');
    } catch (backendError) {
      console.warn('Backend request failed, trying AI service fallback.', backendError);

      try {
        const aiResponse = await fetch('http://localhost:8001/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question })
        });

        if (!aiResponse.ok) {
          throw new Error(`AI service responded with ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        setAnswer(aiData.answer || 'No response');
      } catch {
        setAnswer('Unable to reach the backend or AI service right now.');
      }
    }
  };

  return (
    <div className="app-shell">
      {view === 'login' && !currentUser ? (
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
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#7db0ff', cursor: 'pointer', padding: 0 }}
              onClick={() => setView('create-user')}
            >
              Click here to create new user
            </button>
          </div>
        </div>
      ) : null}

      {view === 'create-user' && !currentUser ? (
        <div className="login-card">
          <div className="brand">
            <div className="brand-badge">FA</div>
            <div>
              <h1 style={{ margin: 0 }}>Create Account</h1>
              <p style={{ margin: '4px 0 0', color: '#8fa2bf' }}>Create a new normal user account.</p>
            </div>
          </div>

          <div className="result-box" style={{ marginTop: 12 }}>
            <form onSubmit={handleCreateUser}>
              <div className="form-field">
                <label htmlFor="newUserEmail">New user email</label>
                <input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@company.com"
                />
              </div>
              <div className="form-field">
                <label htmlFor="newUserPassword">Password</label>
                <input
                  id="newUserPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Create password"
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
              <button type="submit" className="primary-btn" style={{ width: '100%' }}>
                Create User
              </button>
            </form>
            {message ? <p className="helper-text">{message}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#7db0ff', cursor: 'pointer', padding: 0 }}
              onClick={() => setView('login')}
            >
              Back to sign in
            </button>
          </div>
        </div>
      ) : null}

      {view === 'dashboard' && currentUser ? (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <h2 style={{ margin: 0 }}>Welcome back, {currentUser.email}</h2>
              <p className="subtitle" style={{ margin: '4px 0 0' }}>
                {currentUser.role === 'admin'
                  ? 'You can manage users and run AI-assisted analysis.'
                  : 'Ask questions and get AI-assisted financial insights.'}
              </p>
            </div>
            <button className="small-btn" onClick={handleLogout}>
              Sign out
            </button>
          </div>

          <div className="dashboard-grid">
            {currentUser.role === 'admin' ? (
              <div className="result-box">
                <h3 style={{ marginTop: 0 }}>User management</h3>
                <p style={{ marginTop: 0 }}>Created users:</p>
                <ul>
                  {users.map((user) => (
                    <li key={user.email}>
                      {user.email} <span style={{ color: '#8fa2bf' }}>({user.role})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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
      ) : null}
    </div>
  );
}

export default App;
