import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux';
import { changeText } from '../../store/slice/headerTextSlice';
import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, updateDoc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useNavigate} from 'react-router-dom';
import { changeLoginUserData } from '../../store/slice/loginUserDataSlice';
import { useAuth } from '../../authservice/AuthContext';

const Login = ({ onLoginSuccess }) => {

    const navigate = useNavigate();

      // actionを操作するための関数取得
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(changeText('ログイン'))
    })

    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginDisabled, setLoginDisabled] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const { login } = useAuth();

    // ブルートフォース対策のための定数
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_TIME = 30; // 秒単位

    useEffect(() => {
        // カウントダウンタイマーの処理
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => {
                setCountdown(countdown - 1);
                if (countdown === 1) {
                    setLoginDisabled(false);
                }
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    // ログイン試行履歴を取得する関数
    const getLoginAttempts = async (userId) => {
        try {
            // loginAttemptsコレクションのドキュメントを参照
            const loginAttemptsRef = doc(db, 'loginAttempts', userId);
            const docSnap = await getDoc(loginAttemptsRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                // ユーザーのログイン試行履歴がない場合、初期値でドキュメントを作成
                const initialData = {
                    attempts: 0,
                    lastAttempt: serverTimestamp(),
                    locked: false,
                    lockUntil: null
                };
                
                // ドキュメントを作成
                await setDoc(loginAttemptsRef, initialData);
                
                return initialData;
            }
        } catch (error) {
            console.error('ログイン試行履歴の取得エラー:', error);
            return {
                attempts: 0,
                lastAttempt: null,
                locked: false,
                lockUntil: null
            };
        }
    };

    // ログイン試行履歴を更新する関数
    const updateLoginAttempts = async (userId, isSuccess) => {
        try {
            const loginAttemptsRef = doc(db, 'loginAttempts', userId);
            const currentAttempts = await getLoginAttempts(userId);
            
            if (isSuccess) {
                // ログイン成功時はカウンターをリセット
                await updateDoc(loginAttemptsRef, {
                    attempts: 0,
                    lastAttempt: serverTimestamp(),
                    locked: false,
                    lockUntil: null
                });
            } else {
                // ログイン失敗時は試行回数を増やす
                const newAttempts = currentAttempts.attempts + 1;
                const locked = newAttempts >= MAX_LOGIN_ATTEMPTS;
                const lockUntil = locked ? new Date(Date.now() + LOCKOUT_TIME * 1000) : null;
                
                await updateDoc(loginAttemptsRef, {
                    attempts: newAttempts,
                    lastAttempt: serverTimestamp(),
                    locked: locked,
                    lockUntil: lockUntil
                });
                
                if (locked) {
                    setLoginDisabled(true);
                    setCountdown(LOCKOUT_TIME);
                    setError(`ログイン試行回数が上限を超えました。${LOCKOUT_TIME}秒後に再試行できます。`);
                }
            }
        } catch (error) {
            console.error('ログイン試行履歴の更新エラー:', error);
        }
    };

    const validateUser = async (userId, password, collectionName) => {
        const usersRef = collection(db, collectionName);
        const q = query(usersRef, where('userid', '==', userId));
        const querySnapshot = await getDocs(q);
    
        if (querySnapshot.empty) {
          throw new Error('ユーザーIDが見つかりません');
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        // console.log(userDoc.data().name)
        // const bufLoginName = docSnap.data().name;
    
        // パスワードの検証
        // 注: 実際の実装では、パスワードはハッシュ化して保存・比較する必要があります
        // if (userData.password !== password) {
        //   throw new Error('パスワードが正しくありません');
        // }
    
        return userData;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (loginDisabled) {
            setError(`ログインが一時的にロックされています。${countdown}秒後に再試行できます。`);
            return;
        }
        
        // ログイン試行履歴をチェック
        const loginAttempts = await getLoginAttempts(userId);
        if (loginAttempts.locked) {
            const now = new Date();
            const lockUntil = loginAttempts.lockUntil?.toDate();
            
            if (lockUntil && now < lockUntil) {
                const remainingTime = Math.ceil((lockUntil - now) / 1000);
                setLoginDisabled(true);
                setCountdown(remainingTime);
                setError(`ログインが一時的にロックされています。${remainingTime}秒後に再試行できます。`);
                return;
            }
        }
        
        // ログイン処理をここに実装
        setError('');
        setLoading(true);
        
        try {
            //Firebase Autentication　ログイン
            await login(userId, password);
            
            // Firestoreからユーザーを検索
            let userData;
            let userType;
        
            // ユーザーIDの桁数に応じてテーブルを切り替え
            if (userId.length === 4) {
                // 4桁の場合はCustomerテーブルを参照
                userData = await validateUser(userId, password, 'customer');
            } else if (userId.length === 7) {
                // 7桁の場合はstaffテーブルを参照
                userData = await validateUser(userId, password, 'staff');
            } else {
                setError('無効なユーザーIDです。4桁または7桁で入力してください。');
                await updateLoginAttempts(userId, false);
                setLoading(false);
                return;
            }
    
            // ログイン成功時の処理
            await updateLoginAttempts(userId, true);
            
            localStorage.setItem('userId', userId);
            localStorage.setItem('userName', userData.name);
            localStorage.setItem('userType', userId.length === 4 ? 'customer' : 'staff');
            localStorage.setItem('kyotenId', userData.kyoten_id);
            localStorage.setItem('todayRoute', '');
            localStorage.setItem('selectRouteIds', '');
            localStorage.setItem('chatRooms', '');
            localStorage.setItem('bottomNaviMerge', 'false');
            localStorage.setItem('isAuthenticated', 'true');
            
            dispatch(changeLoginUserData({userId:userId,
                                            userName:userData.name, 
                                            userType:userId.length === 4 ? 'customer' : 'staff',
                                            kyotenId:userData.kyoten_id,
                                            todayRouteId:''
                                        }));   
            
            setLoading(false);
            onLoginSuccess();
            console.log("推移");    
        } catch (error) {
            console.error('ログインエラー:', error);
            await updateLoginAttempts(userId, false);
            setError(error.message || 'ログイン処理中にエラーが発生しました');
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-4 space-y-4">
                {/* ログインコンテンツを中央に配置 */}
                <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6">
                    {/* ロゴ部分 */}
                    <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800">
                        メディック集配連絡システム
                    </h1>
                    <p className="text-sm text-gray-600 mt-2">
                        ログインしてください
                    </p>
                    </div>

                    {/* ログインフォーム */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ユーザーID入力 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="userId">
                        ユーザーID
                        </label>
                        <div className="relative">
                        <input
                            id="userId"
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="例: 7998"
                            required
                            disabled={loginDisabled}
                        />
                        </div>
                    </div>

                    {/* パスワード入力 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                        パスワード
                        </label>
                        <div className="relative">
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="パスワードを入力"
                            required
                            disabled={loginDisabled}
                        />
                        </div>
                    </div>

                    {/* ログインボタン */}
                    <div className="pt-2">
                        <button
                        type="submit"
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loginDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'}`}
                        disabled={loginDisabled}
                        >
                        {loginDisabled ? `再試行まで ${countdown}秒` : 'ログイン'}
                        </button>
                    </div>

                    {error && (
                        <div className="whitespace-pre-wrap bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    </form>
                </div>
                </div>
            </div>
        </div>
    )
}

export default Login