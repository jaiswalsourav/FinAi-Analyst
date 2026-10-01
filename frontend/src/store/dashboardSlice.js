import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    question: '',
    symbol: '',
    answer: '',
  },
  reducers: {
    setDashboardField(state, action) {
      const { field, value } = action.payload;
      state[field] = value;
    },
    resetDashboard(state) {
      state.question = '';
      state.symbol = '';
      state.answer = '';
    },
  },
});

export const { setDashboardField, resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
