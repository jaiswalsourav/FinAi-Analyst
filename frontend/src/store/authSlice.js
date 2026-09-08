import { createSlice } from '@reduxjs/toolkit';

const initialState = {
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
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthField(state, action) {
      const { field, value } = action.payload;
      state[field] = value;
    },
    clearSession(state) {
      state.currentUser = null;
      state.token = '';
      state.email = '';
      state.password = '';
      state.view = 'login';
      state.error = '';
      state.message = '';
    },
  },
});

export const { setAuthField, clearSession } = authSlice.actions;
export default authSlice.reducer;
