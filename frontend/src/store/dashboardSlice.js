import { createSlice } from '@reduxjs/toolkit';

// messages: chat thread on the AI Analysis page, [{ id, role: 'user' | 'ai', text, symbol? }]
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    question: '',
    symbol: '',
    answer: '',
    messages: [],
  },
  reducers: {
    setDashboardField(state, action) {
      const { field, value } = action.payload;
      state[field] = value;
    },
    addMessages(state, action) {
      state.messages.push(...action.payload);
    },
    updateMessage(state, action) {
      const { id, ...fields } = action.payload;
      const message = state.messages.find((item) => item.id === id);
      if (message) Object.assign(message, fields);
    },
    clearMessages(state) {
      state.messages = [];
    },
    resetDashboard(state) {
      state.question = '';
      state.symbol = '';
      state.answer = '';
      state.messages = [];
    },
  },
});

export const { setDashboardField, addMessages, updateMessage, clearMessages, resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
