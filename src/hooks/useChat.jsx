import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';

const useChat = (facilityId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  // メッセージを監視
  useEffect(() => {
    if (!facilityId) return;

    try {
      const q = query(
        collection(db, `facilities/${facilityId}/messages`),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          time: doc.data().createdAt?.toDate().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          }) || ''
        }));
        setMessages(newMessages);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching messages:', error);
        setError('メッセージの取得に失敗しました');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setError('メッセージの監視設定に失敗しました');
      setLoading(false);
    }
  }, [facilityId]);

  // アクション選択の処理
  const handleActionSelect = (action) => {
    setSelectedAction(action === selectedAction ? null : action);
  };

  // メッセージ送信の処理
  const handleSend = async () => {
    if (!selectedAction || !facilityId) return;

    const messageText = {
      'collect': '検体あり',
      'no-collect': '検体なし',
      'recollect': '再集配'
    }[selectedAction];

    if (!messageText) return;

    try {
      await addDoc(collection(db, `facilities/${facilityId}/messages`), {
        text: messageText,
        isUser: true,
        createdAt: serverTimestamp(),
        status: 'sent'
      });

      // アクション選択をリセット
      setSelectedAction(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('メッセージの送信に失敗しました');
    }
  };

  // システムメッセージ送信の処理（内部使用）
  const sendSystemMessage = async (text) => {
    if (!facilityId) return;

    try {
      await addDoc(collection(db, `facilities/${facilityId}/messages`), {
        text,
        isUser: false,
        createdAt: serverTimestamp(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Error sending system message:', error);
      setError('システムメッセージの送信に失敗しました');
    }
  };

  // エラー状態のリセット
  const resetError = () => {
    setError(null);
  };

  return {
    messages,
    loading,
    error,
    selectedAction,
    handleActionSelect,
    handleSend,
    sendSystemMessage,
    resetError
  };
};

export default useChat;