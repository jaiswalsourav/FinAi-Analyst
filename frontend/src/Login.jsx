export default function LoginPage({ email, password, setEmail, setPassword, error, onLogin, onCreateUser }) {
  return (
    <div className="login-card">
      <div className="brand">
        <div className="brand-badge">FA</div>
        <div>
          <h1 style={{ margin: 0 }}>FinAI Analyst</h1>
          <p style={{ margin: '4px 0 0', color: '#e8ebef' }}>Secure workspace</p>
        </div>
      </div>

      <p className="subtitle">
        Sign in to access AI-powered market research, earnings summaries, and financial analysis.
      </p>

      <form onSubmit={onLogin}>
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
          onClick={onCreateUser}
        >
          Click here to create new user
        </button>
      </div>
    </div>
  );
}
