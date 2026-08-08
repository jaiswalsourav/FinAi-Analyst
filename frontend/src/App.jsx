import { useEffect, useState } from 'react';
import './App.css';
import LoginPage from './Login';
import CreateUserPage from './CreateUser';
import DashboardPage from './Dashboard';
import ProfilePage from './Profile';

function App() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserPassword, setCurrentUserPassword] = useState('');
  const [view, setView] = useState('login');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const buildAuthHeaders = (emailValue, passwordValue) => {
    if (!emailValue || !passwordValue) {
      return {};
    }

    return {
      Authorization: `Basic ${btoa(`${emailValue}:${passwordValue}`)}`
    };
  };

  const fetchUsers = async (authHeaders) => {
    try {
      const response = await fetch('http://localhost:8080/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      if (!response.ok) {
        throw new Error('Unable to load users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (fetchError) {
      console.error('Failed to fetch users', fetchError);
      setUsers([]);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const authHeaders = buildAuthHeaders(trimmedEmail, password);

    try {
      const response = await fetch('http://localhost:8080/api/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      if (!response.ok) {
        setError('Invalid credentials.');
        return;
      }

      const userData = await response.json();
      setCurrentUser(userData);
      setCurrentUserPassword(password);
      setError('');
      setMessage('');
      setView('dashboard');

      if (userData.role === 'ADMIN') {
        await fetchUsers(authHeaders);
      }
    } catch (loginError) {
      console.error('Login failed', loginError);
      setError('Unable to authenticate.');
    }
  };

  const handleCreateUser = async (e) => {
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

    try {
      const response = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setError(errorData?.message || 'Failed to create user.');
        return;
      }

      setNewUserEmail('');
      setNewUserPassword('');
      setConfirmPassword('');
      setError('');
      setMessage(`User ${trimmedEmail} was created successfully. Please sign in.`);
      setView('login');
    } catch (createError) {
      console.error('Create user failed', createError);
      setError('Unable to create user.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserPassword('');
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
      if (!currentUser || !currentUserPassword) {
        return {};
      }

      return {
        Authorization: `Basic ${btoa(`${currentUser.email}:${currentUserPassword}`)}`
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
          onOpenProfile={() => setView('profile')}
        />
      )}

      {view === 'profile' && currentUser && (
        <ProfilePage
          currentUser={currentUser}
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  );
}

export default App;
