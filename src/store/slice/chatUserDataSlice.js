import { createSlice } from "@reduxjs/toolkit";

export const chatUserDataSlice = createSlice({
  // slice名
  name: "chatUserData",
  // 内部で保持するデータ(キー:mess, 初期値:メッセージ)
  initialState: {
    chatStaffId: "",
    chatStaffName: "",
    chatCustomerId:'',
    chatCustomerName:'',
    chatRoomId:'',
  },
  // 内部のデータにアクセスするための処理(処理名:sayhello)
  reducers: {
    changeChatUserData: (state, action) => {
      state.chatCustomerId = action.payload.customerId;
      state.chatCustomerName = action.payload.customerName;
      state.chatStaffId = action.payload.staffId;
      state.chatStaffName = action.payload.staffName;
      state.chatRoomId = action.payload.roomId;
    },
  },
});

// 外からインポートするためにactionとreducerをエクスポートする
export const { changeChatUserData } = chatUserDataSlice.actions;
export default chatUserDataSlice.reducer;