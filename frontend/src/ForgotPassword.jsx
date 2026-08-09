export default function ForgotPasswordPage({ resetEmail, setResetEmail, error, message, onRequestReset, onBack }) {
  return (
    <div className="login-card">
      <div className="brand">
        <div className="brand-badge">FA</div>
        <div>
          <h1 style={{ margin: 0 }}>Forgot Password</h1>
          <p style={{ margin: '4px 0 0', color: '#1dac2e' }}>Enter your email to receive a reset token.</p>
        </div>
      </div>

      <div className="result-box" style={{ marginTop: 12 }}>
        <form onSubmit={onRequestReset}>
          <div className="form-field">
            <label htmlFor="resetEmail">Email</label>
            <input
              id="resetEmail"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>
          <button type="submit" className="primary-btn" style={{ width: '100%' }}>
            Request Reset Token
          </button>
        </form>
        {message ? <p className="helper-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          type="button"
          style={{ background: 'transparent', border: 'none', color: '#7db0ff', cursor: 'pointer', padding: 0 }}
          onClick={onBack}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
