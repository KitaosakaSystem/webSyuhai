import { createSlice } from "@reduxjs/toolkit";

export const loginUserDataSlice = createSlice({
  // slice名
  name: "loginUserData",
  // 内部で保持するデータ(キー:mess, 初期値:メッセージ)
  initialState: {
    loginUserId: "",
    loginUserName: "",
    loginUserType:"",
    loginKyotenId:"",
    loginTodayRouteId:"",
  },
  // 内部のデータにアクセスするための処理(処理名:sayhello)
  reducers: {
    changeLoginUserData: (state, action) => {
      state.loginUserId = action.payload.userId;
      state.loginUserName = action.payload.userName;
      state.loginUserType = action.payload.userType;
      state.loginKyotenId = action.payload.kyotenId;
      state.loginTodayRouteId = action.payload.todayRouteId;
    },
  },
});

// 外からインポートするためにactionとreducerをエクスポートする
export const { changeLoginUserData } = loginUserDataSlice.actions;
export default loginUserDataSlice.reducer;
