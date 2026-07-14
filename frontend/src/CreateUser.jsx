export default function CreateUserPage({ newUserEmail, newUserPassword, confirmPassword, setNewUserEmail, setNewUserPassword, setConfirmPassword, error, message, onCreateUser, onBack }) {
  return (
    <div className="login-card">
      <div className="brand">
        <div className="brand-badge">FA</div>
        <div>
          <h1 style={{ margin: 0 }}>Create Account</h1>
          <p style={{ margin: '4px 0 0', color: '#8fa2bf' }}>Create a new normal user account.</p>
        </div>
      </div>

      <div className="result-box" style={{ marginTop: 12 }}>
        <form onSubmit={onCreateUser}>
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
          onClick={onBack}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
