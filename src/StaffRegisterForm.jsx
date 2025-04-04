// StaffRegisterForm.jsx - スタッフ登録フォームコンポーネント
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './authservice/AuthContext';
import { auth } from './firebase';

const StaffRegisterForm = () => {
  // フォーム入力用の状態
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [kyotenId, setKyotenId] = useState('');
  const [routes, setRoutes] = useState(['']);
  
  // 処理状態管理用の状態
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [registeredId, setRegisteredId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // CSV一括登録のための状態
  const [csvFile, setCsvFile] = useState(null);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvResults, setCsvResults] = useState({ success: 0, updated: 0, failed: 0, total: 0 });
  const [csvLogs, setCsvLogs] = useState([]);
  const fileInputRef = useRef(null);
  
  // Firebase Firestoreの参照
  const db = getFirestore();
  const { signup } = useAuth();
  const navigate = useNavigate();
  
  // ルートフィールドの追加
  const addRouteField = () => {
    setRoutes([...routes, '']);
  };
  
  // ルートフィールドの削除
  const removeRouteField = (index) => {
    const updatedRoutes = routes.filter((_, i) => i !== index);
    setRoutes(updatedRoutes);
  };
  
  // ルート値の更新
  const updateRoute = (index, value) => {
    const updatedRoutes = [...routes];
    updatedRoutes[index] = value;
    setRoutes(updatedRoutes);
  };
  
  // 単一スタッフ登録の処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("UID>",auth.userId)

    try {
      setError('');
      setLoading(true);
      
      // 入力検証
      if (!userId || !name || !password || !kyotenId) {
        throw new Error('すべての必須フィールドを入力してください');
      }
      
      // 空でないルートだけをフィルタリング
      const filteredRoutes = routes.filter(route => route.trim() !== '');
      
      // Firestore用のスタッフデータを作成
      const staffData = {
        userid: userId,
        name: name,
        kyoten_id: kyotenId,
        routes: filteredRoutes // 配列としてそのまま保存
      };
      
      // ドキュメントの存在確認
      const docRef = doc(db, "staff", userId);
      const docSnap = await getDoc(docRef);
      const isUpdate = docSnap.exists();
      
      // Firestoreに保存（ドキュメントIDとしてuserIdを使用）
      await setDoc(docRef, staffData);
      
      // Firebase Authenticationにもユーザーを登録 (既存の場合はスキップ)
      if (!isUpdate) {
        try {
          await signup(userId, password);
        } catch (authError) {
          // 認証エラーは無視して続行（すでに存在する場合など）
          console.warn("Auth registration skipped:", authError.message);
        }
      }
      
      // 成功状態の設定
      setSuccess(true);
      setRegisteredId(userId);
      setIsUpdate(isUpdate); // 上書きモードかどうかを保存
      
      // フォームのリセット
      setUserId('');
      setName('');
      setPassword('');
      setKyotenId('');
      setRoutes(['']);
      
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message + 'スタッフ登録に失敗しました' || 'スタッフ登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // CSVファイル選択の処理
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
    }
  };
  
  // CSVファイルを読み込んでバイナリとして返す（Shift-JIS対応のため）
  const readFileAsBinary = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };
  
  // CSV一括登録の処理
  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('CSVファイルを選択してください');
      return;
    }
    
    setCsvProcessing(true);
    setError('');
    setCsvLogs([]);
    setCsvResults({ success: 0, updated: 0, failed: 0, total: 0 });
    
    try {
      const buffer = await readFileAsBinary(csvFile);
      
      // エンコーディング検出とデコード
      let text = '';
      try {
        // まずShift-JISでデコード試行
        const shiftJisDecoder = new TextDecoder('shift-jis');
        text = shiftJisDecoder.decode(buffer);
      } catch (encodingError) {
        try {
          // Shift-JIS失敗の場合はISO-8859-1でデコード試行
          const isoDecoder = new TextDecoder('iso-8859-1');
          text = isoDecoder.decode(buffer);
        } catch (isoError) {
          // どちらも失敗した場合はUTF-8でデコード
          const utf8Decoder = new TextDecoder('utf-8');
          text = utf8Decoder.decode(buffer);
        }
      }
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data } = results;
          
          if (!data || data.length === 0) {
            setError('CSVファイルにデータがありません');
            setCsvProcessing(false);
            return;
          }
          
          if (data.length > 100) {
            setError('一度に登録できるスタッフは最大100人までです');
            setCsvProcessing(false);
            return;
          }
          
          // ヘッダーチェック
          const firstRow = data[0];
          const requiredFields = ['userId', 'name', 'password', 'kyoten_id'];
          const missingFields = requiredFields.filter(field => !firstRow.hasOwnProperty(field));
          
          if (missingFields.length > 0) {
            setError(`CSVファイルに必要なカラムがありません: ${missingFields.join(', ')}`);
            setCsvProcessing(false);
            return;
          }
          
          let successCount = 0;
          let updatedCount = 0;
          let failedCount = 0;
          const logs = [];
          
          // すべてのスタッフを登録
          for (const row of data) {
            const userId = row.userId && row.userId.trim();
            const name = row.name && row.name.trim();
            const password = row.password && row.password.trim();
            const kyotenId = row.kyoten_id && row.kyoten_id.trim();
            
            if (!userId || !name || !password || !kyotenId) {
              logs.push({ 
                userId: userId || '(空)', 
                status: '失敗', 
                message: '必須フィールド(userId, name, password, kyoten_id)が不足しています' 
              });
              failedCount++;
              continue;
            }
            
            try {
              // routes_0, routes_1, routes_2, ... などのカラムからルート情報を抽出
              const routesArray = [];
              
              // routesの列を探して配列に追加
              for (let i = 0; i < 10; i++) { // 最大10個のルートをサポート
                const routeKey = `routes_${i}`;
                if (row[routeKey] && row[routeKey].trim() !== '') {
                  routesArray.push(row[routeKey].trim());
                }
              }
              
              // ドキュメントの存在確認
              const docRef = doc(db, "staff", userId);
              const docSnap = await getDoc(docRef);
              const isUpdate = docSnap.exists();
            
              // Firestoreにスタッフデータを保存
              await setDoc(docRef, {
                userid: userId,
                name,
                kyoten_id: kyotenId,
                routes: routesArray // 配列として保存
              });
              
              // Firebase Authenticationにもユーザーを登録（上書きでない場合のみ）
              if (!isUpdate) {
                try {
                  await signup(userId, password);
                } catch (authError) {
                  // 認証エラーは無視して続行（すでに存在する場合など）
                  console.warn("Auth registration skipped for CSV import:", authError.message);
                }
              }
              
              if (isUpdate) {
                updatedCount++;
              } else {
                successCount++;
              }
              
              logs.push({ 
                userId, 
                status: isUpdate ? '上書き' : '成功', 
                message: isUpdate ? '既存データを更新しました' : '新規登録しました' 
              });
            } catch (error) {
              logs.push({ userId, status: '失敗', message: error.message || 'エラーが発生しました' });
              failedCount++;
            }
          }
          
          setCsvResults({
            success: successCount,
            updated: updatedCount,
            failed: failedCount,
            total: data.length
          });
          setCsvLogs(logs);
          
          // ファイル選択をリセット
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setCsvFile(null);
        },
        error: (error) => {
          setError(`CSVファイルの解析に失敗しました: ${error.message}`);
        }
      });
    } catch (error) {
      setError(`ファイルの読み込みに失敗しました: ${error.message}`);
    } finally {
      setCsvProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            スタッフ登録
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="font-medium">{isUpdate ? '更新完了!' : '登録完了!'}</span>
            <span className="block sm:inline"> 「{registeredId}」のスタッフを{isUpdate ? '上書き' : '新規登録'}しました。</span>
          </div>
        )}
        
        {/* スタッフ登録フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                ユーザーID (必須)
              </label>
              <input
                id="userId"
                name="userId"
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: 0002580"
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                名前 (必須)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: シズ：福井一真"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード (必須)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: 59078769"
              />
            </div>
            
            <div>
              <label htmlFor="kyotenId" className="block text-sm font-medium text-gray-700 mb-1">
                拠点ID (必須)
              </label>
              <input
                id="kyotenId"
                name="kyotenId"
                type="text"
                required
                value={kyotenId}
                onChange={(e) => setKyotenId(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: 21北大阪"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  担当ルート
                </label>
                <button
                  type="button"
                  onClick={addRouteField}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  追加
                </button>
              </div>
              
              {routes.map((route, index) => (
                <div key={index} className="flex items-center space-x-2 mt-2">
                  <input
                    type="text"
                    value={route}
                    onChange={(e) => updateRoute(index, e.target.value)}
                    placeholder={`例: ${index === 0 ? 'N61' : index === 1 ? 'N62' : 'N62B'}`}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  />
                  {routes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRouteField(index)}
                      className="inline-flex items-center p-1 border border-transparent rounded-full text-red-500 hover:bg-red-100 focus:outline-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? '処理中...' : 'スタッフを登録'}
            </button>
          </div>
          
          {success && (
            <div className="text-sm text-center mt-4">
              <button 
                onClick={() => setSuccess(false)} 
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                別のスタッフを登録する
              </button>
            </div>
          )}
        </form>
        
        {/* CSV一括登録セクション */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">CSV一括登録</h3>
          <p className="text-sm text-gray-600 mb-4">
            スタッフ情報のCSVファイルをアップロードして、最大100人まで一括登録できます。
          </p>
          
          <div className="flex flex-col space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSVファイルを選択
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                必須カラム: userId, name, password, kyoten_id
              </p>
              <p className="mt-1 text-xs text-gray-500">
                オプションカラム: routes_0, routes_1, routes_2, ...
              </p>
              <p className="mt-1 text-xs text-gray-700 font-medium">
                注意: CSVファイルはShift-JISまたはISO-8859-1エンコードで保存してください
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleCsvUpload}
              disabled={csvProcessing || !csvFile}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                csvProcessing || !csvFile ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              {csvProcessing ? '処理中...' : 'CSVから一括登録'}
            </button>
          </div>
          
          {/* CSV処理結果 */}
          {csvResults.total > 0 && (
            <div className="mt-4">
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">処理結果</h4>
                <div className="flex space-x-4 mb-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-500">合計:</span> {csvResults.total}人
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-green-500">成功:</span> {csvResults.success}人
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-blue-500">上書き:</span> {csvResults.updated || 0}人
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-red-500">失敗:</span> {csvResults.failed}人
                  </div>
                </div>
                
                {csvLogs.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザーID</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">結果</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メッセージ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvLogs.map((log, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">{log.userId}</td>
                            <td className={`px-3 py-2 whitespace-nowrap text-xs ${
                              log.status === '成功' ? 'text-green-500' : 
                              log.status === '上書き' ? 'text-blue-500' : 'text-red-500'
                            }`}>
                              {log.status}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{log.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffRegisterForm;