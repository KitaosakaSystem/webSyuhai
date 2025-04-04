// pages/chat/Chat.jsx
import  {  useEffect, useRef, useState } from 'react';
import ChatMessage from '../../components/chat/ChatMessage';
import ActionButtons from '../../components/chat/ActionButtons';

import { useDispatch } from 'react-redux';
import { changeText } from '../../store/slice/headerTextSlice';
import { useSelector } from 'react-redux';
import { addDoc, collection, doc, limit, limitToLast, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';

const MAX_HOURLY_MESSAGES = 5;
const STORAGE_KEY = 'roomMessageCounts';

const Chat = () => {

  const chatCustomerId =  useSelector(state => state.chatUserData.chatCustomerId);
  const chatCustomerName =  useSelector(state => state.chatUserData.chatCustomerName);
  const chatStaffId =  useSelector(state => state.chatUserData.chatStaffId);
  const chatStaffName =  useSelector(state => state.chatUserData.chatStaffName);
  const chatRoomId =  useSelector(state => state.chatUserData.chatRoomId);
  const loginUserId = useSelector(state => state.loginUserData.loginUserId);
  const loginUserType = useSelector(state => state.loginUserData.loginUserType);

  // actionを操作するための関数取得
  const dispatch = useDispatch();
  useEffect(() => {
    console.log("Chat CustomerId",chatCustomerId)
    console.log("ROOOOOOOOOM ID", chatRoomId);
    const chatPartnerId = loginUserType === 'customer' ? chatStaffId : chatCustomerId;
    const chatPartnerName = loginUserType === 'customer' ? chatStaffName : chatCustomerName;
    dispatch(changeText('(' + chatPartnerId + ')' + chatPartnerName))
  })

  // const [messages, setMessages] = useState([
  //   { id: 1, text: '集配予定を確認いたします', time: '14:20', isCustomer: false },
  //   { id: 2, text: '検体あり', time: '14:21', isCustomer: true },
  //   { id: 3, text: '承知いたしました。回収に向かいます。', time: '14:22', isCustomer: false }
  // ]);

  //--------------------------------------------------------------------------------------------------------
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // messagesコレクションへの参照を作成
    const messagesRef = collection(db, 'messages');
    
    // クエリの作成
    // room_idが一致し、送信時刻でソート
    const q = query(
      messagesRef,
      where('room_id', '==', chatRoomId)
      // orderBy('time', 'asc'),
      // limitToLast(20)
    );

    // リアルタイムリスナーの設定
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 変更があったドキュメントのみを処理
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          // 新しく追加されたメッセージのデータ
          const newMessage = {
            id: change.doc.id,
            ...change.doc.data()
          };
          
          // stateを更新（新しいメッセージを配列の末尾に追加）
          setMessages(prevMessages => [...prevMessages, newMessage]);
          console.log('メッセージ追加イベント',change.doc.id)

        } else if (change.type === 'modified') {
          // 更新されたドキュメントの新しいデータ
          const updatedMessage = {
            id: change.doc.id,
            ...change.doc.data()
          };

          // 既存のメッセージ配列から該当のメッセージを更新
          setMessages([]);
          setMessages(prevMessages => [...prevMessages, updatedMessage]);
          // setMessages(prevMessages => 
          //   prevMessages.map(message => 
          //     message.id === updatedMessage.id ? updatedMessage : message
          //   )
          // );
        }

        if(change.doc.data().read_at !== ''){
          console.log("読んだのかい?",change.doc.data().read_at);
          let returnText;

          console.log("ACTION>",change.doc.data().selectedAction);

          const messageText = {
            'collect': 'ありがとうございます。検体の回収にむかいます。',
            'no-collect': 'かしこまりました。\nまた次回、よろしくお願いいたします。',
            'recollect': 'ありがとうございます。再回収に伺います。'
          }[change.doc.data().selectedAction];

          const newMessage = {
            id: messages.length + 1,
            text: messageText,
            time: change.doc.data().read_at,
            isCustomer: false
          };
          setMessages(prevMessages => [...prevMessages, newMessage]);
        }
        

      });
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    //console.log("メッセージ", messages);
    // コンポーネントのクリーンアップ時にリスナーを解除
    return () => unsubscribe();
  }, [chatRoomId]); // roomIdが変更されたときにリスナーを再設定
  //--------------------------------------------------------------------------------------------------------

  // roomMessageCount--------------------------------------------------------------------------------------------------------------------------------------------------
  const [messageCount, setMessageCount] = useState(0);
  const [remainingMessages, setRemainingMessages] = useState(MAX_HOURLY_MESSAGES);

  // 現在の時間帯のキーを取得（YYYY-MM-DD-HH形式）
  const getCurrentHourKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
  };

  // 現在の時間のカウントを取得
  const getCurrentCount = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;

    const data = JSON.parse(stored);
    const currentHourKey = getCurrentHourKey();
    return (data[chatRoomId]?.[currentHourKey] || 0);
  };

  useEffect(() => {
    const currentCount = getCurrentCount();
    setMessageCount(currentCount);
    setRemainingMessages(MAX_HOURLY_MESSAGES - currentCount);
  }, [chatRoomId]);

  const updateMessageCount = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    const currentHourKey = getCurrentHourKey();

    // 現在のルームのデータを更新
    const roomData = data[chatRoomId] || {};
    roomData[currentHourKey] = (roomData[currentHourKey] || 0) + 1;

    const updatedData = {
      ...data,
      [chatRoomId]: roomData
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    
    const newCount = roomData[currentHourKey];
    setMessageCount(newCount);
    setRemainingMessages(MAX_HOURLY_MESSAGES - newCount);
  };
  // roomMessageCount--------------------------------------------------------------------------------------------------------------------------------------------------

  const [selectedAction, setSelectedAction] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleActionSelect = (action) => {
    setSelectedAction(action === selectedAction ? null : action);
  };



  const handleSend = async () => {
    if (!selectedAction) return;

    //スタッフメッセージ処理------------------------------------------------------
    if (selectedAction == 'staff-replay'){
      console.log("スタッフーーーーーーーーーーメッセージ");
      setSelectedAction(null);
      if (!messages || messages.length === 0) {
        console.log('messagesが存在しないか、空です');
      }else{
        const message = messages[0];
        console.log('ID:', message.id);
        console.log('顧客フラグ:', message.isCustomer);
        console.log('スタッフ既読:', message.is_staff_read);
        console.log('既読時刻:', message.read_at);
        console.log('ルームID:', message.room_id);
        console.log('選択アクション:', message.selectedAction);
        console.log('送信者ID:', message.sender_id);
        console.log('テキスト:', message.text);
        console.log('時刻:', message.time);

        try {
          const messagesRefStaff = collection(db, 'messages');
          
          // room_idをドキュメントIDとして指定 > メッセージは固定やし、ドキュメント１個でいいんじゃね？FireStoreの読み込み回数の節約も考慮して
          const messageDocStaff = doc(messagesRefStaff, message.room_id);
          // まずドキュメントをサーバータイムスタンプで追加
          const docRefStaff = await setDoc(messageDocStaff, {
            room_id: message.room_id,
            sender_id: message.sender_id,
            isCustomer: message.isCustomer, // loginUserTypeが'customer'の場合、trueを設定,
            text: message.text,
            selectedAction:message.selectedAction,
            time: message.time,
            is_staff_read: true,
            read_at: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            pickup_at:'',
          });
          console.log('メッセージをスタッフが既読したフラグを追加しました:', chatRoomId);
    
          updateMessageCount();
          //return docRef.id;
        } catch (error) {
          console.error('エラーが発生しました:', error);
          throw error;
        }

      }    
      return;
    }

    //顧客メッセージ処理------------------------------------------------------

    // 現在のルームのメッセージ数をチェック
    const currentCount = getCurrentCount();
    if (currentCount >= MAX_HOURLY_MESSAGES) {
      alert('この時間帯のメッセージ送信上限に達しました。次の時間にお試しください。');
      return;
    }

    const messageText = {
      'collect': '〇検体あり',
      'no-collect': 'X検体なし',
      'recollect': '▼再集配'
    }[selectedAction];

    if (messageText) {
      setSelectedAction(null);
    }

    try {
      const messagesRef = collection(db, 'messages');
      
      // room_idをドキュメントIDとして指定 > メッセージは固定やし、ドキュメント１個でいいんじゃね？FireStoreの読み込み回数の節約も考慮して
      const messageDoc = doc(messagesRef, chatRoomId);
      // まずドキュメントをサーバータイムスタンプで追加
      const docRef = await setDoc(messageDoc, {
        room_id: chatRoomId,
        sender_id: loginUserId,
        isCustomer: loginUserType === 'customer', // loginUserTypeが'customer'の場合、trueを設定,
        text: messageText,
        selectedAction:selectedAction,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        is_staff_read: false,
        read_at: '',
        pickup_at:'',
      });
      console.log('メッセージを追加しました:', chatRoomId);

      updateMessageCount();
      //return docRef.id;
    } catch (error) {
      console.error('エラーが発生しました:', error);
      throw error;
    }
    
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto  bg-gray-50">

      {/* メッセージ */}
      <div className="flex-1  p-4 " >
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
      </div>

      <div className="text-sm text-gray-600">
        残り送信可能回数: {remainingMessages} / {MAX_HOURLY_MESSAGES}
      </div>

      {chatCustomerId &&(
        <div className="bg-white border-t p-4">
          <ActionButtons 
            selectedAction={selectedAction}
            onActionSelect={handleActionSelect}
            onSend={handleSend}
          />
        </div>
      )} 
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Chat;