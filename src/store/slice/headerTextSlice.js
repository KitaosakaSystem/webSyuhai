import { createSlice } from "@reduxjs/toolkit";

export const headerTextSlice = createSlice({
  // slice名
  name: "headerText",
  // 内部で保持するデータ(キー:mess, 初期値:メッセージ)
  initialState: {
    mess: "集配連絡＞テスト病院",
  },
  // 内部のデータにアクセスするための処理(処理名:sayhello)
  reducers: {
    changeText: (state, action) => {
      state.mess = action.payload;
    },
  },
});

// 外からインポートするためにactionとreducerをエクスポートする
export const { changeText } = headerTextSlice.actions;
export default headerTextSlice.reducer;
