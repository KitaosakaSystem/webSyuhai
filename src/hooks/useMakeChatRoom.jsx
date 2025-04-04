import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const ChatRoomCreator = () => {

    const createChatRoom = async () => {
        try {
            const chatData = {
                room_id: "ch789",
                customer_id: "c111",
                staff_id: "s789",
                assignment_id: "a456789",
                date: "2025-01-20",
                status: "active",
                created_at: "2025-01-20T08:30:00Z",
                last_message: {
                message_id: "m123",
                content: "10分後に到着予定です",
                sent_at: "2025-01-20T08:55:00Z"
                }
            };

            console.log("chat_Data",chatData);
            const docRef = await addDoc(collection(db, 'chat_rooms'), chatData);
            console.log('チャットルームが作成されました:', docRef.id);

        } catch (error) {
            console.error('エラーが発生しました:', error);
        }

    };

};

export default ChatRoomCreator;