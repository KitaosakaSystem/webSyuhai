// CustomerRegisterForm.jsx - 顧客登録フォームコンポーネント
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './authservice/AuthContext';

const CustomerRegisterForm = () => {
  // フォーム入力用の状態
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [kyotenId, setKyotenId] = useState('');
  
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
  
  // 単一顧客登録の処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      // 入力検証
      if (!customerId || !name || !password || !kyotenId) {
        throw new Error('すべての必須フィールドを入力してください');
      }
      
      // Firestore用の顧客データを作成
      const customerData = {
        userId: customerId,
        name: name,
        password: password,
        address: address,
        phone: phone,
        kyoten_id: kyotenId
      };
      
      // ドキュメントの存在確認
      const docRef = doc(db, "customer", customerId);
      const docSnap = await getDoc(docRef);
      const isUpdate = docSnap.exists();
      
      // Firestoreに保存（ドキュメントIDとしてcustomerIdを使用）
      await setDoc(docRef, customerData);
      
      // Firebase Authenticationにもユーザーを登録 (既存の場合はスキップ)
      if (!isUpdate) {
        try {
          await signup(customerId, password);
        } catch (authError) {
          // 認証エラーは無視して続行（すでに存在する場合など）
          console.warn("Auth registration skipped:", authError.message);
        }
      }
      
      // 成功状態の設定
      setSuccess(true);
      setRegisteredId(customerId);
      setIsUpdate(isUpdate); // 上書きモードかどうかを保存
      
      // フォームのリセット
      setCustomerId('');
      setName('');
      setPassword('');
      setAddress('');
      setPhone('');
      setKyotenId('');
      
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || '顧客登録に失敗しました');
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
      
      // Shift-JISをデコードするための処理
      const decoder = new TextDecoder('shift-jis');
      const text = decoder.decode(buffer);
      
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
            setError('一度に登録できる顧客は最大100人までです');
            setCsvProcessing(false);
            return;
          }
          
          // ヘッダーチェック
          const firstRow = data[0];
          const requiredFields = ['customerId', 'name', 'password', 'kyoten_id'];
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
          
          // すべての顧客を登録
          for (const row of data) {
            const customerId = row.customerId && row.customerId.trim();
            const name = row.name && row.name.trim();
            const password = row.password && row.password.trim();
            const address = row.address && row.address.trim();
            const phone = row.phone && row.phone.trim();
            const kyotenId = row.kyoten_id && row.kyoten_id.trim();
            
            if (!customerId || !name || !password || !kyotenId) {
              logs.push({ 
                customerId: customerId || '(空)', 
                status: '失敗', 
                message: '必須フィールド(customerId, name, password, kyoten_id)が不足しています' 
              });
              failedCount++;
              continue;
            }
            
            try {
              // ドキュメントの存在確認
              const docRef = doc(db, "customer", customerId);
              const docSnap = await getDoc(docRef);
              const isUpdate = docSnap.exists();
            
              // Firestoreに顧客データを保存
              await setDoc(docRef, {
                userId: customerId,
                name,
                password,
                address: address || '',
                phone: phone || '',
                kyoten_id: kyotenId
              });
              
              // Firebase Authenticationにもユーザーを登録（上書きでない場合のみ）
              if (!isUpdate) {
                try {
                  await signup(customerId, password);
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
                customerId, 
                status: isUpdate ? '上書き' : '成功', 
                message: isUpdate ? '既存データを更新しました' : '新規登録しました' 
              });
            } catch (error) {
              logs.push({ customerId, status: '失敗', message: error.message || 'エラーが発生しました' });
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
            顧客登録
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
            <span className="block sm:inline"> 「{registeredId}」の顧客を{isUpdate ? '上書き' : '新規登録'}しました。</span>
          </div>
        )}
        
        {/* 顧客登録フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                顧客ID (必須)
              </label>
              <input
                id="customerId"
                name="customerId"
                type="text"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: 7998"
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                顧客名 (必須)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: メディック"
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
                placeholder="例: 1234"
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                住所
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: 滋賀県大津市におの浜4-7-5"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                電話番号
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="例: 077-527-3333"
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
                placeholder="例: 21"
              />
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
              {loading ? '処理中...' : '顧客を登録'}
            </button>
          </div>
          
          {success && (
            <div className="text-sm text-center mt-4">
              <button 
                onClick={() => setSuccess(false)} 
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                別の顧客を登録する
              </button>
            </div>
          )}
        </form>
        
        {/* CSV一括登録セクション */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">CSV一括登録</h3>
          <p className="text-sm text-gray-600 mb-4">
            顧客情報のCSVファイルをアップロードして、最大100人まで一括登録できます。
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
                必須カラム: customerId, name, password, kyoten_id
              </p>
              <p className="mt-1 text-xs text-gray-500">
                オプションカラム: address, phone
              </p>
              <p className="mt-1 text-xs text-gray-700 font-medium">
                注意: CSVファイルはShift-JISエンコードで保存してください
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
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客ID</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">結果</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メッセージ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvLogs.map((log, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs">{log.customerId}</td>
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

export default CustomerRegisterForm;