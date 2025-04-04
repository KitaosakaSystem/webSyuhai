import { useNavigate } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import chatStore from '../../store/chatStore';
import { useDispatch, useSelector } from 'react-redux';
import { changeText } from '../../store/slice/headerTextSlice';
import { changeChatUserData } from '../../store/slice/chatUserDataSlice';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, collectionGroup, getDocs } from 'firebase/firestore';
import { changeLoginUserData } from '../../store/slice/loginUserDataSlice';

const CustomerList = () => {
  const navigate = useNavigate();
  const setCurrentFacility = chatStore(state => state.setCurrentFacility);

  // store内の値を取得
  const loginUserId = useSelector(state => state.loginUserData.loginUserId);
  const loginUserName = useSelector(state => state.loginUserData.loginUserName);
  const loginUserType = useSelector(state => state.loginUserData.loginUserType);
  const loginTodayRouteId = useSelector(state => state.loginUserData.loginTodayRouteId);

  const dispatch = useDispatch();
  useEffect(() => { 
    dispatch(changeText(loginTodayRouteId + 'コース　顧客一覧'))
  }, [])

  const [customers, setCustomers] = useState([]);
  const storedRooms = localStorage.getItem('chatRooms');

  // ローカルストレージより、設定画面で作成したチャットルームを読み込む
  useEffect(() => {
    if (loginUserType === 'customer' || !storedRooms) {
      return;
    }

    const parsedRooms = JSON.parse(storedRooms);
    
    // 初期データの設定
    const initialCustomers = parsedRooms.map((room) => ({
      customer_code: room.room_id,
      customer: room,
      selectedAction: null
    }));
    setCustomers(initialCustomers);

    // messageコレクションの変更を監視
    const q = query(collection(db, 'messages'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const messageDoc = change.doc;
          const room_id = messageDoc.id;
          
          // parsedRoomsに存在するroom_idのみを処理
          const matchingRoom = parsedRooms.find(room => room.room_id === room_id);
          if (matchingRoom) {
            const selectedAction = messageDoc.data().selectedAction;
            const read_at = messageDoc.data().read_at

            console.log("selectedAction",selectedAction)
            console.log("read_at",read_at)

            setCustomers(prevCustomers => {
              const newCustomers = [...prevCustomers];
              const customerIndex = newCustomers.findIndex(
                customer => customer.customer_code === room_id
              );
              
              if (customerIndex !== -1) {
                newCustomers[customerIndex] = {
                  ...newCustomers[customerIndex],
                  customer: {
                    ...newCustomers[customerIndex].customer,
                    selectedAction: selectedAction,
                    read_at: read_at
                  }
                }
              }
              console.log("newCustomers",newCustomers)
              return newCustomers;
            });
          }
        }
      });
    }, (error) => {
      console.error('Error listening to message collection:', error);
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, [loginUserType, storedRooms]);

  //顧客ログイン時、担当者表示
  // データを更新する関数
  const updateCustomers = async () => {
    try {
      const today = new Date();
      const targetDate = today.toISOString().split('T')[0];
      
      // chat_roomsの取得
      const chatRoomsQuery = query(
        collection(db, 'chat_rooms'),
        where('customer_id', '==', loginUserId),
        where('date', '==', targetDate)
      );
      const chatRoomsSnapshot = await getDocs(chatRoomsQuery);
      
      // messagesの取得
      const messagesSnapshot = await getDocs(collection(db, 'messages'),where('customer_id', '==', loginUserId));
      
      // messagesデータをroom_idでマップ化
      const messagesMap = {};
      messagesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.room_id) {
          messagesMap[data.room_id] = {
            read_at: data.read_at,
            selectedAction: data.selectedAction,
          };
        }
      });

      // 顧客リストの作成
      const updatedCustomers = chatRoomsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customer: {
            id: doc.id,
            room_id: data.room_id,
            customer_id: data.isRePickup ? '1' : '0',
            customer_name: '(メディック)' + data.staff_name,
            staff_id: loginUserId,
            address: '',
            phone: '',
            read_at: messagesMap[data.room_id]?.read_at || null,
            selectedAction:  messagesMap[data.room_id]?.selectedAction || null
          }
        };
      });
      console.log("updateCustomers",updatedCustomers)

      setCustomers(updatedCustomers);
    } catch (err) {
      console.log('Error updating customers:', err);
    }
  };

  // chat_roomsコレクションの監視
  useEffect(() => {
    if (loginUserType === 'staff') {
      return;
    }

    try {
      const today = new Date();
      const targetDate = today.toISOString().split('T')[0];
      
      const chatRoomsQuery = query(
        collection(db, 'chat_rooms'),
        where('customer_id', '==', loginUserId),
        where('date', '==', targetDate)
      );

      const unsubscribe = onSnapshot(chatRoomsQuery, () => {
        updateCustomers();
      });

      return () => unsubscribe();
    } catch (err) {
      console.log('Error in chat rooms effect:', err);
    }
  }, [loginUserType, loginUserId]);

  // messagesコレクションの監視
  useEffect(() => {
    if (loginUserType === 'staff') {
      return;
    }

    try {
      const messagesQuery = query(collection(db, 'messages'));

      const unsubscribe = onSnapshot(messagesQuery, () => {
        updateCustomers();
      });

      return () => unsubscribe();
    } catch (err) {
      console.log('Error in messages effect:', err);
    }
  }, [loginUserType, loginUserId]);

  const handleCustomerSelect = (customer) => {
    setCurrentFacility(customer);
    dispatch(changeChatUserData({
      customerId: loginUserType === 'customer' ? loginUserId : customer.customer.customer_id,
      customerName: loginUserType === 'customer' ? loginUserName : customer.customer.customer_name,
      staffId: loginUserType === 'customer' ? customer.customer.customer_id : loginUserId,
      staffName: loginUserType === 'customer' ? customer.customer.customer_name : loginUserName,
      roomId: customer.customer.room_id,
    }));
    navigate('/chat');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-4">
        {!loginTodayRouteId && loginUserType === 'staff' && (
          <p className="text-amber-800 text-xl">
            今日の担当コースを選択してください
          </p>
        )}
        {customers.map(customer => (
          <div 
            key={customer.customer.customer_id}
            onClick={() => handleCustomerSelect(customer)}
            className="bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-base font-medium">
                  {customer.customer.customer_id + ' ' + customer.customer.customer_name}
                </h2>
                <span 
                  className={`px-2 py-1 rounded-full text-xs ${
                    customer.customer.selectedAction === 'collect'
                      ? 'bg-green-100 text-green-800'
                      : customer.customer.selectedAction === 'recollect'
                      ? 'bg-yellow-100 text-yellow-800'
                      : customer.customer.selectedAction === 'no-collect'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {customer.customer.selectedAction === 'collect'
                    ? '検体あり'
                    : customer.customer.selectedAction === 'recollect'
                    ? '再集配あり'
                    : customer.customer.selectedAction === 'no-collect'
                    ? '検体なし'
                    : '未選択'}
                </span>
              </div>

              {loginUserType === 'staff' && (
                <>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin size={16} className="mr-2" />
                    <span className="text-sm">{customer.customer.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600 mb-2">
                    <Phone size={16} className="mr-2" />
                    <span className="text-sm">{customer.customer.phone}</span>
                  </div>
                </>
              )}

                <span 
                  className={`px-2 py-1 rounded-full text-xs flex justify-end  ${
                    customer.read_at ? 'bg-green-100 text-green-800': customer.selectedAction ? 'bg-yellow-100 text-yellow-800' : ''}`}
                >
                  {customer.read_at ? '返信済み' : customer.selectedAction ? '未読': ''}
                </span>



            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerList;