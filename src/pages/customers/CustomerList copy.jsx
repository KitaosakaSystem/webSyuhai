import { useNavigate } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import chatStore from '../../store/chatStore';
import { useDispatch, useSelector } from 'react-redux';
import { changeText } from '../../store/slice/headerTextSlice';
import { changeChatUserData } from '../../store/slice/chatUserDataSlice';
import { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, onSnapshot, query, where, doc } from 'firebase/firestore';
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
    const unsubscribes = [];

    // 初期データの設定
    const initialCustomers = parsedRooms.map((room) => ({
      customer_code: room.room_id,
      customer: room,
      selectedAction: null
    }));
    setCustomers(initialCustomers);

    // 各ルームのmessageドキュメントを監視
    parsedRooms.forEach((room, index) => {
      const unsubscribe = onSnapshot(
        doc(db, 'messages', room.room_id),
        (doc) => {
          console.log("room.room_id",room.room_id)
          if (doc.exists()) {
            const selectedAction = doc.data().selectedAction;
            console.log("チェーーーーーーーーン時", selectedAction);
            setCustomers(prevCustomers => {
              const newCustomers = [...prevCustomers];
              // 該当するルームのselectedActionを更新
              const customerIndex = newCustomers.findIndex(
                customer => customer.customer_code === room.room_id
              );
              if (customerIndex !== -1) {
                newCustomers[customerIndex] = {
                  ...newCustomers[customerIndex],
                  selectedAction: selectedAction
                };
              }
              return newCustomers;
            });
          }
        },
        (error) => {
          console.error(`Error listening to message doc for room ${room.room_id}:`, error);
        }
        
      );

      unsubscribes.push(unsubscribe);
    });

    // クリーンアップ関数
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [loginUserType, storedRooms]);

  //顧客ログイン時、担当者表示
  useEffect(() => {
    if (loginUserType === 'staff') {
      return;
    }
    
    try {
      const today = new Date();
      const targetDate = today.toISOString().split('T')[0];
      
      const q = query(
        collection(db, 'chat_rooms'),
        where('customer_id', '==', loginUserId),
        where('date', '==', targetDate)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            setCustomers(prev => prev.filter(doc => doc.id !== change.doc.id));
          } else if (change.type === 'added' || change.type === 'modified') {
            const doc = {
              customer: {
                id: change.doc.id,
                room_id: change.doc.data().room_id,
                customer_id: change.doc.data().isRePickup ? '1' : '0',
                customer_name: '(メディック)' + change.doc.data().staff_name,
                staff_id: loginUserId,
                address: '',
                phone: '',
              }
            };
            
            setCustomers(prev => {
              const index = prev.findIndex(item => item.id === doc.id);
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = doc;
                return updated;
              }
              return [...prev, doc];
            });
          }
        });
      });

      return () => unsubscribe();
    } catch (err) {
      console.log(err);
    }
  }, []);

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
                <h2 className="text-lg font-medium">
                  {customer.customer.customer_id + ' ' + customer.customer.customer_name}
                </h2>
                <span 
                  className={`px-2 py-1 rounded-full text-xs ${
                    customer.status === 'online' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {customer.status === 'online' ? 'オンライン' : 'オフライン'}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerList;