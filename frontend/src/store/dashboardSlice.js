import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    question: '',
    answer: '',
  },
  reducers: {
    setDashboardField(state, action) {
      const { field, value } = action.payload;
      state[field] = value;
    },
    resetDashboard(state) {
      state.question = '';
      state.answer = '';
    },
  },
});

export const { setDashboardField, resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
