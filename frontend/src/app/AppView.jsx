import CreateUserPage from '../auth/CreateUserPage';
import ForgotPasswordPage from '../auth/ForgotPasswordPage';
import LoginPage from '../auth/LoginPage';
import ResetPasswordPage from '../auth/ResetPasswordPage';
import AnalysisPage from '../analysis/AnalysisPage';
import DashboardPage from '../dashboard/DashboardPage';
import ProfilePage from '../profile/ProfilePage';

export default function AppView({ auth, dashboard, actions }) {
  //helper functions to set auth and dashboard values in the store
  const setAuth = (field) => (value) => actions.setAuthValue(field, value);
  const setDashboard = (field) => (value) => actions.setDashboardValue(field, value); 
  const clearMessages = () => {
    actions.setAuthValue('error', '');
    actions.setAuthValue('message', '');
  };

  if (auth.view === 'login' && !auth.currentUser) {
    return <LoginPage email={auth.email} 
    password={auth.password} 
    setEmail={setAuth('email')} 
    setPassword={setAuth('password')} 
    error={auth.error} 
    onLogin={actions.handleLogin} 
    onCreateUser={() => { clearMessages(); actions.openView('create-user'); }} onForgotPassword={() => { clearMessages(); setAuth('resetEmail')(''); setAuth('resetToken')(''); setAuth('resetNewPassword')(''); setAuth('resetConfirmPassword')(''); actions.openView('forgot-password'); }} />;
  }

  if (auth.view === 'create-user' && !auth.currentUser) {
    return <CreateUserPage newUserName={auth.newUserName} newUserEmail={auth.newUserEmail}
     newUserPassword={auth.newUserPassword} 
     confirmPassword={auth.confirmPassword} setNewUserName={setAuth('newUserName')} setNewUserEmail={setAuth('newUserEmail')} setNewUserPassword={setAuth('newUserPassword')} setConfirmPassword={setAuth('confirmPassword')} error={auth.error} message={auth.message} onCreateUser={actions.handleCreateUser} onBack={() => { clearMessages(); actions.openView('login'); }} />;
  }

  if (auth.view === 'forgot-password' && !auth.currentUser) {
    return <ForgotPasswordPage resetEmail={auth.resetEmail} setResetEmail={setAuth('resetEmail')} error={auth.error} message={auth.message} onRequestReset={actions.handleForgotPassword} onBack={() => { clearMessages(); actions.openView('login'); }} />;
  }

  if (auth.view === 'reset-password' && !auth.currentUser) {
    return <ResetPasswordPage resetToken={auth.resetToken} setResetToken={setAuth('resetToken')} resetNewPassword={auth.resetNewPassword} resetConfirmPassword={auth.resetConfirmPassword} setResetNewPassword={setAuth('resetNewPassword')} setResetConfirmPassword={setAuth('resetConfirmPassword')} error={auth.error} message={auth.message} onResetPassword={actions.handleResetPassword} onBack={() => { clearMessages(); actions.openView('login'); }} />;
  }

  if (auth.view === 'dashboard' && auth.currentUser) {
    return <DashboardPage 
    users={auth.users} 
    currentUser={auth.currentUser} 
    token={auth.token} 
    onLogout={actions.handleLogout} 
    onOpenAnalysis={() => actions.openView('analysis')} 
    onOpenProfile={() => actions.openView('profile')} />;
  }

  if (auth.view === 'analysis' && auth.currentUser) {
    return <AnalysisPage
      question={dashboard.question}
      setQuestion={setDashboard('question')}
      symbol={dashboard.symbol}
      setSymbol={setDashboard('symbol')}
      messages={dashboard.messages}
      token={auth.token}
      onSubmit={actions.handleAnalysis}
      onClear={actions.handleClearChat}
      onAsk={actions.handleAsk}
      onRegenerate={actions.handleRegenerate}
      onEdit={(text, symbol) => { setDashboard('question')(text); setDashboard('symbol')(symbol || ''); }}
      onBack={() => actions.openView('dashboard')} />;
  }

  if (auth.view === 'profile' && auth.currentUser) {
    return <ProfilePage currentUser={auth.currentUser} onBack={() => actions.openView('dashboard')} />;
  }

  return null;
}
