import { useEffect, useState } from 'react';
import './App.css';
import LoginPage from './Login';
import CreateUserPage from './CreateUser';
import DashboardPage from './Dashboard';

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
      console.log('Sending question to backend', { question, url: 'http://localhost:8080/api/ask' });
      const backendResponse = await fetch('http://localhost:8080/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({ question })
      });

      console.log('Backend response status', backendResponse.status);
      const backendData = await backendResponse.json().catch((error) => {
        console.error('Failed to parse backend response JSON', error);
        throw new Error('Invalid backend JSON response');
      });

      console.log('Backend response body', backendData);
      if (!backendResponse.ok) {
        throw new Error(`Backend responded with ${backendResponse.status}`);
      }

      if (backendData.answer) {
        setAnswer(backendData.answer);
        return;
      }

      throw new Error('No response from backend');
    } catch (backendError) {
      console.warn('Backend request failed, trying AI service fallback.', backendError);

      try {
        console.log('Sending question to AI service', { question, url: 'http://localhost:8001/ask' });
        const aiResponse = await fetch('http://localhost:8001/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question })
        });

        console.log('AI service response status', aiResponse.status);
        const aiData = await aiResponse.json().catch((error) => {
          console.error('Failed to parse AI service response JSON', error);
          throw new Error('Invalid AI service JSON response');
        });

        console.log('AI service response body', aiData);
        if (!aiResponse.ok) {
          throw new Error(`AI service responded with ${aiResponse.status}`);
        }

        setAnswer(aiData.answer || 'No response');
      } catch (aiError) {
        console.error('AI service request failed', aiError);
        setAnswer('Unable to reach the backend or AI service right now.');
      }
    }
  };

  return (
    <div className="app-shell">
      {view === 'login' && !currentUser && (
        <LoginPage
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          error={error}
          onLogin={handleLogin}
          onCreateUser={() => {
            setError('');
            setMessage('');
            setView('create-user');
          }}
        />
      )}

      {view === 'create-user' && !currentUser && (
        <CreateUserPage
          newUserEmail={newUserEmail}
          newUserPassword={newUserPassword}
          confirmPassword={confirmPassword}
          setNewUserEmail={setNewUserEmail}
          setNewUserPassword={setNewUserPassword}
          setConfirmPassword={setConfirmPassword}
          error={error}
          message={message}
          onCreateUser={handleCreateUser}
          onBack={() => {
            setError('');
            setMessage('');
            setView('login');
          }}
        />
      )}

      {view === 'dashboard' && currentUser && (
        <DashboardPage
          users={users}
          currentUser={currentUser}
          question={question}
          setQuestion={setQuestion}
          answer={answer}
          onLogout={handleLogout}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export default App;
