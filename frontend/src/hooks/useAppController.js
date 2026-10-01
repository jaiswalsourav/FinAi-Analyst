import { useDispatch, useSelector } from 'react-redux';
import { parseAnswer } from '../analysis/followUps';

// API helpers for the backend and the AI-service fallback
import { askAiQuestion, askFinancialQuestion } from '../services/apiClient';
import {
  fetchCurrentUser,
  fetchUsers,
  login,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from '../services/authService';
// Reducer actions from authSlice.js and dashboardSlice.js
import { clearSession, setAuthField } from '../store/authSlice';
import { addMessages, clearMessages, resetDashboard, setDashboardField, updateMessage } from '../store/dashboardSlice';

export function useAppController() {
  const dispatch = useDispatch();

  // auth and dashboard are the state objects of their Redux slices
  const auth = useSelector((state) => state.auth);
  const dashboard = useSelector((state) => state.dashboard);

  // Set a single field of a slice; `field` must be a key of that slice's initialState
  const setAuthValue = (field, value) => dispatch(setAuthField({ field, value }));
  const setDashboardValue = (field, value) => dispatch(setDashboardField({ field, value }));
  // Shortcuts for the auth slice's error and message fields
  const setError = (value) => setAuthValue('error', value);
  const setMessage = (value) => setAuthValue('message', value);

  const loadUsers = async (token) => {
    try {
      const { response, data } = await fetchUsers(token);
      if (!response.ok) throw new Error('Unable to load users');
      setAuthValue('users', data);
    } catch (error) {
      console.error('Failed to fetch users', error);
      setAuthValue('users', []);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!auth.email || !auth.password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const { response, data } = await login(auth.email.trim().toLowerCase(), auth.password);
      if (!response.ok || !data.token) {
        setError(response.ok ? 'Invalid login response.' : 'Invalid credentials.');
        return;
      }

      const userResult = await fetchCurrentUser(data.token);
      if (!userResult.response.ok) {
        setError('Invalid credentials.');
        return;
      }

      setAuthValue('token', data.token);
      setAuthValue('currentUser', userResult.data);
      setError('');
      setMessage('');
      setAuthValue('view', 'dashboard');
      if (userResult.data.role === 'ADMIN') await loadUsers(data.token);
    } catch (error) {
      console.error('Login failed', error);
      setError('Unable to authenticate.');
    }
  };

  // Handle user creation   
  const handleCreateUser = async (event) => {
    event.preventDefault();
    const userName = auth.newUserName.trim();
    const email = auth.newUserEmail.trim().toLowerCase();

    const password = auth.newUserPassword.trim();
    const confirmPassword = auth.confirmPassword.trim();

    if (!userName || !email || !password || !confirmPassword) {
      setError('Please provide all required fields for the new user.');
      return;
    }
    if (password !== confirmPassword) {
      console.log('Passwords do not match:');
      setError('Passwords do not match.');
      return;
    }

    try {

      const { response, data } = await registerUser(userName, email, password);
      console.log('Create user response:',  response?.status);
      console.log('Create user data:', data);

         if (!response.ok) {
      // Safely extract backend validation or exception messages
      const serverMessage =
        data?.message ||
        data?.error ||
        (typeof data === 'string' && data.length > 0 ? data : null) ||
        `Failed to create user (HTTP ${response.status})`;
        console.log(response.status, serverMessage);

      setError(serverMessage);
      return;
    }
      setAuthValue('newUserName', '');
      setAuthValue('newUserEmail', '');
      setAuthValue('newUserPassword', '');
      setAuthValue('confirmPassword', '');
      setError('');
      setMessage(`User ${userName} was created successfully. Please sign in.`);
      setAuthValue('view', 'login');
    } catch (error) {
      console.error('Create user failed', error);
      setError('Unable to create user.');
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    const email = auth.resetEmail.trim().toLowerCase();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      const { response, data } = await requestPasswordReset(email);
      if (!response.ok) {
        setError(data.message || 'Unable to request password reset.');
        return;
      }
      setError('');
      setMessage('Password reset token created. Use the token below to reset your password.');
      setAuthValue('resetToken', data.token || '');
      setAuthValue('view', 'reset-password');
    } catch (error) {
      console.error('Forgot password failed', error);
      setError('Unable to request password reset.');
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    const password = auth.resetNewPassword.trim();
    if (!auth.resetToken.trim() || !password || !auth.resetConfirmPassword) {
      setError('Token, new password, and confirmation are required.');
      return;
    }
    if (password !== auth.resetConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const { response, data } = await resetPassword(auth.resetToken.trim(), password);
      if (!response.ok) {
        setError(data.message || 'Unable to reset password.');
        return;
      }
      ['resetToken', 'resetNewPassword', 'resetConfirmPassword', 'resetEmail'].forEach((field) => setAuthValue(field, ''));
      setError('');
      setMessage('Your password has been reset. Please sign in with your new password.');
      setAuthValue('view', 'login');
    } catch (error) {
      console.error('Reset password failed', error);
      setError('Unable to reset password.');
    }
  };

  const handleLogout = () => {
    dispatch(clearSession());
    dispatch(resetDashboard());
  };

  const isBusy = dashboard.messages.some((message) => message.role === 'ai' && message.text === 'Thinking...');

  // Ask the backend (AI service as fallback) and fill the answer into an existing AI message
  const runQuestion = async (question, symbol, answerId) => {
    const setAnswer = (fields) => dispatch(updateMessage({ id: answerId, ...fields }));
    try {
      const data = await askFinancialQuestion(question, symbol, auth.token);
      if (!data.answer) throw new Error('No response from backend');
      const { text, followUps } = parseAnswer(data.answer);
      setAnswer({ text, followUps, error: false });
    } catch (error) {
      console.warn('Backend request failed, trying AI service fallback.', error);
      try {
        const data = await askAiQuestion(question);
        const { text, followUps } = parseAnswer(data.answer || 'No response');
        setAnswer({ text, followUps, error: false });
      } catch (aiError) {
        console.error('AI service request failed', aiError);
        setAnswer({ text: 'Unable to reach the backend or AI service right now.', followUps: [], error: true });
      }
    }
  };

  // Chat flow: the question becomes a message, the answer fills in below it
  const handleAsk = (rawQuestion, symbol = '') => {
    const question = String(rawQuestion || '').trim();
    if (!question || isBusy) return;

    const stamp = Date.now();
    const answerId = `ai-${stamp}`;
    dispatch(addMessages([
      { id: `user-${stamp}`, role: 'user', text: question, symbol },
      { id: answerId, role: 'ai', text: 'Thinking...', prompt: question, symbol, followUps: [], error: false },
    ]));
    runQuestion(question, symbol, answerId);
  };

  // Composer submit: send the typed question and clear the box
  const handleAnalysis = (event) => {
    event.preventDefault();
    if (!dashboard.question.trim() || isBusy) return;
    handleAsk(dashboard.question, dashboard.symbol);
    setDashboardValue('question', '');
  };

  // Re-run the question behind an answer (used for Regenerate and Retry)
  const handleRegenerate = (answerId) => {
    const message = dashboard.messages.find((item) => item.id === answerId);
    if (!message?.prompt || isBusy) return;
    dispatch(updateMessage({ id: answerId, text: 'Thinking...', followUps: [], error: false }));
    runQuestion(message.prompt, message.symbol || '', answerId);
  };

  const handleClearChat = () => dispatch(clearMessages());

  const openView = (view) => {
    setError('');
    setMessage('');
    setAuthValue('view', view);
  };

  return {
    auth,
    dashboard,
    actions: {
      handleLogin,
      handleCreateUser,
      handleForgotPassword,
      handleResetPassword,
      handleLogout,
      handleAnalysis,
      handleAsk,
      handleRegenerate,
      handleClearChat,
      openView,
      setAuthValue,
      setDashboardValue,
    },
  };
}


/*initialState = {
  users: [],
  currentUser: null,
  token: '',
  view: 'login',
  email: '',
  password: '',
  newUserName: '',
  newUserEmail: '',
  newUserPassword: '',
  confirmPassword: '',
  resetEmail: '',
  resetToken: '',
  resetNewPassword: '',
  resetConfirmPassword: '',
  error: '',
  message: '',
};*/