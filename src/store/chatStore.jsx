import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// チャットストアの型定義
const initialState = {
  messages: [],
  currentFacility: null,
  isLoading: false,
  error: null,
  unreadCount: 0
};

const chatStore = create(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // メッセージの追加
        addMessage: (message) => {
          set((state) => ({
            messages: [...state.messages, message],
            unreadCount: state.unreadCount + (message.isUser ? 0 : 1)
          }));
        },

        // 施設の設定
        setCurrentFacility: (facility) => {
          set({ currentFacility: facility });
        },

        // メッセージの一括設定
        setMessages: (messages) => {
          set({ messages });
        },

        // ローディング状態の設定
        setLoading: (isLoading) => {
          set({ isLoading });
        },

        // エラー状態の設定
        setError: (error) => {
          set({ error });
        },

        // 未読カウントのリセット
        resetUnreadCount: () => {
          set({ unreadCount: 0 });
        },

        // メッセージの既読設定
        markMessageAsRead: (messageId) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, isRead: true } : msg
            )
          }));
        },

        // すべてのメッセージを既読に
        markAllMessagesAsRead: () => {
          set((state) => ({
            messages: state.messages.map((msg) => ({ ...msg, isRead: true })),
            unreadCount: 0
          }));
        },

        // ストアのリセット
        resetStore: () => {
          set(initialState);
        },

        // 特定の施設のメッセージを取得
        getMessagesByFacility: (facilityId) => {
          return get().messages.filter(
            (message) => message.facilityId === facilityId
          );
        }
      }),
      {
        name: 'chat-storage',
        getStorage: () => localStorage,
      }
    )
  )
);

export default chatStore;