import { createSlice } from "@reduxjs/toolkit";

export const authSlice = createSlice({
  // slice名
  name: "auth",
  // 内部で保持するデータ(キー:mess, 初期値:メッセージ)
  initialState: {
    auth: "false",
  },
  // 内部のデータにアクセスするための処理(処理名:sayhello)
  reducers: {
    changeAuth: (state, action) => {
      state.auth = action.payload;
    },
  },
});

// 外からインポートするためにactionとreducerをエクスポートする
export const { changeAuth } = authSlice.actions;
export default authSlice.reducer;
