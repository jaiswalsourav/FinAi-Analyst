import './App.css';
import AppView from './app/AppView';
import { useAppController } from './hooks/useAppController';

function App() {
  const { auth, dashboard, actions } = useAppController();

  return (
    <div className="app-shell">
      <AppView auth={auth} dashboard={dashboard} actions={actions} />
    </div>
  );
}

export default App;
