import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';

// The login and chat are kept in sessionStorage so a page reload doesn't log the user out.
// sessionStorage (not localStorage) means closing the tab still ends the session.
const STORAGE_KEY = 'finai-session';

function loadSession() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    if (!saved?.auth?.token) return undefined;

    const { token, currentUser, view } = saved.auth;
    // An answer that was still loading when the page reloaded will never arrive; offer a retry instead
    const messages = (saved.messages || []).map((message) =>
      message.role === 'ai' && message.text === 'Thinking...'
        ? { ...message, text: 'The page reloaded before this answer arrived. Press Retry to ask again.', error: true }
        : message,
    );
    return {
      auth: { ...authReducer(undefined, { type: '@@init' }), token, currentUser, view },
      dashboard: { ...dashboardReducer(undefined, { type: '@@init' }), messages },
    };
  } catch {
    return undefined;
  }
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
  },
  preloadedState: loadSession(),
});

store.subscribe(() => {
  try {
    const { auth, dashboard } = store.getState();
    if (!auth.token) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        auth: { token: auth.token, currentUser: auth.currentUser, view: auth.view },
        messages: dashboard.messages,
      }),
    );
  } catch {
    // Storage can be full or blocked; the app still works, it just won't survive a reload.
  }
});
