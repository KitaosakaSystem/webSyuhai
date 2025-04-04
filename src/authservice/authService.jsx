// authService.js - カスタムユーザーIDとパスワードの認証を管理するサービス
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  limit
} from "firebase/firestore";
import { auth, db } from "../firebase";

// カスタムIDをメールアドレスに変換する関数（Firebase認証用）
const customIdToEmail = (customId) => {
  // カスタムIDをFirebaseの有効なメールアドレスに変換
  // 例: "user123" -> "user123@yourdomain.com"
  return `${customId}@medic.co.jp`;
};

// ユーザー登録 - カスタムIDとパスワードを使用
export const registerUser = async (customId, password) => {
  try {
    // カスタムIDが既に使用されているか確認（ドキュメントが既に存在するか）
    const userDocRef = doc(db, "users", customId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      throw new Error("このユーザーIDは既に使用されています");
    }

    // カスタムIDをメールアドレスに変換
    const email = customIdToEmail(customId);
    
    // Firebase Authでユーザーを作成
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Firestoreにカスタムユーザー情報を保存（customIdをドキュメントIDとして使用）
    await setDoc(doc(db, "users", customId), {
      uid: user.uid,  // Firebase Authの内部UIDも保存
      email,
      customId,
      createdAt: new Date(),
      isAdmin: false  // デフォルトでは管理者権限なし
    });
    
    // UID → customIdのマッピングも保存（逆引き用）
    await setDoc(doc(db, "uid_to_customid", user.uid), {
      customId
    });
    
    return user;
  } catch (error) {
    console.error("登録エラー:", error);
    throw error;
  }
};

// ログイン - カスタムIDとパスワードを使用
export const loginUser = async (customId, password) => {
  try {
    console.log("authService|customId>",customId)
    console.log("authService|password>",password)
    // カスタムIDからユーザー情報を直接取得
    const userDocRef = doc(db, "users", customId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      throw new Error("ユーザーが見つかりません");
    }
    
    // ユーザーのメールアドレスを取得
    const userData = userDocSnap.data();
    const email = userData.email;

    console.log("authService|email>",email)
    
    // Firebase Authでログイン
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("ログインエラー:", error);
    throw error;
  }
};

// ログアウト
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("ログアウトエラー:", error);
    throw error;
  }
};

// 現在ログインしているユーザーのカスタムID情報を取得
// Firebaseのuidからcustomidを検索して、usersコレクションからデータを取得
export const getCurrentUserInfo = async (uid) => {
  try {
    // まずUIDからカスタムIDを取得
    const uidMapDocRef = doc(db, "uid_to_customid", uid);
    const uidMapDocSnap = await getDoc(uidMapDocRef);
    
    if (!uidMapDocSnap.exists()) {
      console.log("UID>",uid)
      console.error("UID→CustomIDマッピングが見つかりません");
      return null;
    }
    
    // カスタムIDを取得
    const { customId } = uidMapDocSnap.data();
    console.log("uid>",uid)
    console.log("customid>",customId)
    
    // カスタムIDを使ってユーザー情報を取得
    const userDocRef = doc(db, "users", customId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }
    
    return null;
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    throw error;
  }
};

// カスタムIDでユーザー情報を直接取得（補助メソッド）
export const getUserInfoByCustomId = async (customId) => {
  try {
    const userDocRef = doc(db, "users", customId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }
    
    return null;
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    throw error;
  }
};