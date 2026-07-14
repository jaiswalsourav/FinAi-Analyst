export default function DashboardPage({ users, currentUser, question, setQuestion, answer, onLogout, onSubmit }) {
  return (
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
        <button className="small-btn" onClick={onLogout}>
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

        <form onSubmit={onSubmit} className="result-box">
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
  );
}
