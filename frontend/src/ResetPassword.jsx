export default function ResetPasswordPage({ resetToken, setResetToken, resetNewPassword, resetConfirmPassword, setResetNewPassword, setResetConfirmPassword, error, message, onResetPassword, onBack }) {
  return (
    <div className="login-card">
      <div className="brand">
        <div className="brand-badge">FA</div>
        <div>
          <h1 style={{ margin: 0 }}>Reset Password</h1>
          <p style={{ margin: '4px 0 0', color: '#1dac2e' }}>Use your reset token to set a new password.</p>
        </div>
      </div>

      <div className="result-box" style={{ marginTop: 12 }}>
        <form onSubmit={onResetPassword}>
          <div className="form-field">
            <label htmlFor="resetToken">Reset Token</label>
            <input
              id="resetToken"
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste your token here"
            />
          </div>
          <div className="form-field">
            <label htmlFor="resetNewPassword">New Password</label>
            <input
              id="resetNewPassword"
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              placeholder="New password"
            />
          </div>
          <div className="form-field">
            <label htmlFor="resetConfirmPassword">Confirm Password</label>
            <input
              id="resetConfirmPassword"
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" className="primary-btn" style={{ width: '100%' }}>
            Reset Password
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
