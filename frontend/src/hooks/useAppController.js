import { useDispatch, useSelector } from 'react-redux';
import { askAiQuestion, askFinancialQuestion } from '../services/apiClient';
import {
  fetchCurrentUser,
  fetchUsers,
  login,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from '../services/authService';
import { clearSession, setAuthField } from '../store/authSlice';
import { resetDashboard, setDashboardField } from '../store/dashboardSlice';

export function useAppController() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const dashboard = useSelector((state) => state.dashboard);

  const setAuthValue = (field, value) => dispatch(setAuthField({ field, value }));
  const setDashboardValue = (field, value) => dispatch(setDashboardField({ field, value }));
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

  const handleAnalysis = async (event) => {
    event.preventDefault();
    setDashboardValue('answer', 'Thinking...');
    try {
      const data = await askFinancialQuestion(dashboard.question, auth.token);
      if (!data.answer) throw new Error('No response from backend');
      setDashboardValue('answer', data.answer);
    } catch (error) {
      console.warn('Backend request failed, trying AI service fallback.', error);
      try {
        const data = await askAiQuestion(dashboard.question);
        setDashboardValue('answer', data.answer || 'No response');
      } catch (aiError) {
        console.error('AI service request failed', aiError);
        setDashboardValue('answer', 'Unable to reach the backend or AI service right now.');
      }
    }
  };

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
      openView,
      setAuthValue,
      setDashboardValue,
    },
  };
}
