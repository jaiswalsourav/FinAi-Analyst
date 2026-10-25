import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';

// Redux state lives only in memory, so a page reload used to wipe the login and the chat.
// To avoid that we copy the login and chat into sessionStorage after every change (see
// store.subscribe at the bottom) and read them back here when the app starts.
// sessionStorage (not localStorage) means closing the tab still ends the session.
const STORAGE_KEY = 'finai-session';

// Runs once at startup. Returns the saved state, or undefined to start fresh (logged out).
function loadSession() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    if (!saved?.auth?.token) return undefined; // nothing saved, or not logged in

    const { token, currentUser, view } = saved.auth;
    // An answer that was still loading when the page reloaded will never arrive; offer a retry instead
    const messages = (saved.messages || []).map((message) =>
      message.role === 'ai' && message.text === 'Thinking...'
        ? { ...message, text: 'The page reloaded before this answer arrived. Press Retry to ask again.', error: true }
        : message,
    );
    // Start from each slice's default state, then fill in only the parts we saved
    // (we never save the typed email/password fields).
    return {
      auth: { ...authReducer(undefined, { type: '@@init' }), token, currentUser, view },
      dashboard: { ...dashboardReducer(undefined, { type: '@@init' }), messages },
    };
  } catch {
    return undefined;
  }
}

// The password reset email links to the app with ?resetToken=... ; open the reset page with
// that token filled in, and drop it from the address bar so it doesn't stay in the history.
function readResetLink(state) {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('resetToken');
    if (!token) return state;
    url.searchParams.delete('resetToken');
    window.history.replaceState(null, '', url.toString());
    if (state?.auth?.currentUser) return state; // already signed in; the reset page is for signed-out users

    return {
      ...state,
      auth: { ...authReducer(undefined, { type: '@@init' }), view: 'reset-password', resetToken: token },
    };
  } catch {
    return state;
  }
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
  },
  preloadedState: readResetLink(loadSession()), // undefined = use the normal empty initial state
});

// Runs after every state change: save the login + chat, or erase them when logged out.
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
