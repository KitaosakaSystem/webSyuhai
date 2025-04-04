import React, { useState , useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { changeText } from '../../store/slice/headerTextSlice';
import { changeChatUserData } from '../../store/slice/chatUserDataSlice';
import { db } from '../../firebase';
import { addDoc, collection, doc, getDoc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import ToggleSwitch from '../../components/ToggleSwitch';
import { changeLoginUserData } from '../../store/slice/loginUserDataSlice';
import { getTodayDate } from '../../utils/dateUtils'
import { useAuth } from '../../authservice/AuthContext';
import { signOut } from '../../authservice/authService';


const Settings = () => {

  // ヘッダー書き換え
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(changeText('設定'))   
  })

  // store内の値を取得
  // todo:いらんやろし消す
  const loginUserId = useSelector(state => state.loginUserData.loginUserId);
  const loginUserName = useSelector(state => state.loginUserData.loginUserName);
  const loginUserType = useSelector(state => state.loginUserData.loginUserType);
  const loginTodayRouteId = useSelector(state => state.loginUserData.loginTodayRouteId);
 
  //社員に設定されたコースの検索--------------------------------------------
  const [todayRoute,setTodayRoute] = useState("");
  const [routeNames, setRouteNames] = useState([]);
  const [loading, setLoading] = useState(true);

  const [chatRooms, setChatRooms] = useState([]);
  // 選択されたコースをテキストボックスに表示するための状態
  const [routeTextInput, setRouteTextInput] = useState("");

  useEffect(() => {

    //社員の定型ルートIdセットを読み込む----------------------------
    const data = localStorage.getItem('selectRouteIds');
    if (data) {
      const selectRouteIds = JSON.parse(data);
      // console.log(selectRouteIds);
      const mappedArray = selectRouteIds.map(item => ({
        id:item.id,
        name: item.name,
      }));
      setRouteNames(mappedArray);
      console.log("ローカルから読んだので、FireStoreから読み込む必要ないので（節約!!!)")
      setLoading(false);
      return; //ローカルから読んだので、FireStoreから読み込む必要ないので（節約!!!)
    }

    const fetchData = async () => {
      try {
        let docRef
        if(loginUserId.length === 4){
          //docRef = doc(db, 'customer', loginUserId);
          return; //スタッフ以外は下記コース設定は不要なので抜ける
        }else{
          docRef = doc(db, 'staff', loginUserId);
        }
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {

          const arrayField = docSnap.data().routes; // 配列フィールド名
          //console.log("配列",arrayField);
          const mappedArray = arrayField.map(item => ({
            id:item,
            name: item,
          }));
          setRouteNames(mappedArray);
          localStorage.setItem('selectRouteIds', JSON.stringify(mappedArray));
          //console.log("コース",mappedArray)
        } else {
          console.log("ねーよ何も");
        }
      } catch (error) {
        console.error('Error fetching document:', error);
      }  finally {
        setLoading(false);
      }
    };
    fetchData();
  },[])


  //console.log("loginName",loginName);

  //ルートマスター割り当て
  const updateOrCreateStaffData = async (documentId, fieldName, staffData) => {
    try {
      const docRef = doc(db, 'routes', String(documentId));
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        // ドキュメントが存在する場合、既存のデータを保持しながら更新
        const existingData = docSnap.data();
        await setDoc(docRef, {
          ...existingData,
          [fieldName]: staffData
        });
      } else {
        // ドキュメントが存在しない場合、新規作成
        await setDoc(docRef, {
          [fieldName]: staffData
        });
      }
      console.log('Document successfully updated/created');
    } catch (error) {
      console.error('Error:', error);
    }
  };

   // チャットルーム作成
  const createChatRoom = async (routeId,schedule,chatRooms) => {
    try {
        const chatRoomData = {
            room_id: loginUserId + '_' + schedule.customer_id,
            customer_id: schedule.customer_id,
            customer_name: schedule.name,
            staff_id: loginUserId,
            staff_name: loginUserName,
            pickup_status: "1",
            isRePickup:schedule.isRePickup ,
            address:schedule.address,
            phone:schedule.phone,
            date: new Date().toISOString().split('T')[0],
            created_at: serverTimestamp(),
        };

        chatRooms.push(chatRoomData) //ローカルストレージ保管用に足していく
        // console.log("chat_Data",chatRoomData);
        const docRef = doc(db, 'chat_rooms', loginUserId + '_' + schedule.customer_id);
        await setDoc(docRef, chatRoomData);
        console.log('チャットルームが作成されました:', docRef.id);

    } catch (error) {
        console.error('エラーが発生しました:', error);
    }
  };

  //　当日割り当てコースマスター取得
  const getCustomerSchedule = async (documentId) => {
    try {
      const docRef = doc(db, 'pickup_routes', documentId);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        // console.log("Doc.Data()やでー",data)
        const mondaySchedule = data.schedule.monday;
        const chatRooms = [];

        mondaySchedule.forEach((schedule, index) => {
          console.log(`For Each Schedule ${index + 1}:`, schedule.customer_id + schedule.name  + " " + schedule.order);
          createChatRoom(documentId,schedule,chatRooms)          
        });

        //ローカルストレージに保管しておく
        // console.log("ChaaaaatRoooooooooooms",chatRooms);
        localStorage.setItem('chatRooms', JSON.stringify(chatRooms));

        //コースマスター登録
        const newStaffData = {
          staff_id: loginUserId,
          staff_name: loginUserName,
          login_date: new Date().toISOString().split('T')[0]
        };
        updateOrCreateStaffData(data.kyoten_id,documentId,newStaffData);

        return mondaySchedule;
      } else {
        console.log('Document not found');
        return null;
      }
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  // 設定の状態管理---------------------------------------------------------------------
  const [customers,setCustomers] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');

  const handleBottomMarginChange = (enabled) => {
    //console.log('ボトムメニューマージン:', enabled ? '有効' : '無効');
  };

  // ドロップダウンの選択変更時の処理
  const handleCourseChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedCourse(selectedValue);
    setRouteTextInput(selectedValue);
  };

  const handleSubmit = () => {
    if (!selectedCourse && !routeTextInput){
      console.log('なんも選んでへんさかいな、それはあかんわ');
      return;
    }

    if (routeTextInput === loginTodayRouteId){
      console.log('同じ選んでるさかいな、あかんで');
      alert('登録中のコースと同じコースを選択しています\n不具合がある場合は、再ログインしてからコースを設定してください。')
      return;
    }
   
    const newData = {
      date: getTodayDate(), // YYYY-MM-DD形式
      todayRoute: routeTextInput
    };
    localStorage.setItem('todayRoute', JSON.stringify(newData));

    dispatch(changeLoginUserData({userId:loginUserId,
      userName:loginUserName,
      userType:loginUserType,
      todayRouteId:routeTextInput}))

    localStorage.setItem('chatRooms', '');

    //曜日ごとのコース一覧を読んでチャットルーム立てる
    getCustomerSchedule(routeTextInput);

  };

  const handleLogout = () => {
    console.log('ログアウト処理');
    localStorage.setItem('userId', "");
    localStorage.setItem('userName', "");
    localStorage.setItem('userType', "");
    localStorage.setItem('todayRoute', '');
    localStorage.setItem('chatRooms', '');
    localStorage.setItem('selectRouteIds','')
    localStorage.setItem('isAuthenticated', 'false');
    signOut();
    window.location.reload();   
  };

  if (loading) return <div>Loading...</div>;

  return (
    // <div className="min-h-screen bg-blue-50 p-8">
    <div className="flex flex-col h-screen overflow-y-auto  bg-gray-50">
      {/* <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg "> */}
      <div className="flex-1 overflow-y-auto p-4">

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700">ユーザーID：</label>
            <label className="text-base font-medium text-gray-700">{loginUserId}</label>
          </div>
          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700">ユーザー名：</label>
            <label className="text-base font-medium text-gray-700">{loginUserName}</label>
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700">本日の担当コース：</label>
            <label className="text-base font-medium text-gray-700">{loginTodayRouteId}</label>
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700">担当コース</label>
            <select
              value={selectedCourse}
              onChange={handleCourseChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">コースを選択</option>
              {routeNames.map((route) => (
                <option key={route.id} value={route.name}>
                  {route.id}
                </option>
              ))}
            </select>
          </div>

          {/* テキストボックスを追加 */}
          <div className="space-y-2">
            <label className="text-base font-medium text-gray-700">選択したコース</label>
            <input
              type="text"
              value={routeTextInput}
              onChange={(e) => setRouteTextInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="選択したコースが表示されます"
            />
          </div>

          <div className="pt-4 space-y-4">
            <button
              onClick={handleSubmit}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              設定を保存
            </button>

            <div className="pt-12 border-t mt-8">
              <ToggleSwitch
                label="ボトムメニューマージン有効"
                onChange={handleBottomMarginChange}
              />
            </div>

            
            <div className="pt-12 border-t mt-8">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;