// AuthContext.js - 認証状態を管理するコンテキスト
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getCurrentUserInfo, registerUser, loginUser, signOut } from "./authService";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [customUserInfo, setCustomUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);  // 管理者状態の追跡

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // ユーザーのカスタム情報を取得
        try {
          const userInfo = await getCurrentUserInfo(user.uid);
          setCustomUserInfo(userInfo);
          setIsAdmin(userInfo?.isAdmin === true);  // 管理者状態を設定
        } catch (error) {
          console.error("ユーザー情報取得エラー:", error);
          setIsAdmin(false);
        }
      } else {
        setCustomUserInfo(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);
  
  // カスタムIDでサインアップ
  const signup = async (customId, password) => {
    return registerUser(customId, password);
  };

  // カスタムIDでログイン
  const login = async (customId, password) => {
    return loginUser(customId, password);
  };

  // ログアウト
  const logout = async () => {
    return signOut();
  };

  const value = {
    currentUser,
    customUserInfo,
    isAdmin,  // 管理者状態をコンテキストに追加
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};