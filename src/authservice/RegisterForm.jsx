// RegisterForm.js - 登録フォームコンポーネント
import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

const RegisterForm = () => {
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredId, setRegisteredId] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  
  // CSV一括登録のための状態
  const [csvFile, setCsvFile] = useState(null);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvResults, setCsvResults] = useState({ success: 0, failed: 0, total: 0 });
  const [csvLogs, setCsvLogs] = useState([]);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await signup(customId, password);
      setSuccess(true);
      //setRegisteredId(customId);
      setCustomId('');
      setPassword('');
    } catch (error) {
      setError(error.message || 'アカウント作成に失敗しました');
    }
    
    setLoading(false);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
    }
  };
  
  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('CSVファイルを選択してください');
      return;
    }
    
    setCsvProcessing(true);
    setError('');
    setCsvLogs([]);
    setCsvResults({ success: 0, failed: 0, total: 0 });
    
    try {
      const text = await readFileAsText(csvFile);
      
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
            setError('一度に登録できるユーザーは最大100人までです');
            setCsvProcessing(false);
            return;
          }
          
          // ヘッダーチェック
          const firstRow = data[0];
          if (!firstRow.hasOwnProperty('userID') || !firstRow.hasOwnProperty('password')) {
            setError('CSVファイルには「userID」と「password」のカラムが必要です');
            setCsvProcessing(false);
            return;
          }
          
          let successCount = 0;
          let failedCount = 0;
          const logs = [];
          
          // すべてのユーザーを登録
          for (const row of data) {
            const userId = row.userID && row.userID.trim();
            const userPassword = row.password && row.password.trim();
            
            if (!userId || !userPassword) {
              logs.push({ userId: userId || '(空)', status: '失敗', message: 'IDまたはパスワードが空です' });
              failedCount++;
              continue;
            }
            
            try {
              await signup(userId, userPassword);
              logs.push({ userId, status: '成功', message: '登録完了' });
              successCount++;
            } catch (error) {
              logs.push({ userId, status: '失敗', message: error.message || 'エラーが発生しました' });
              failedCount++;
            }
          }
          
          setCsvResults({
            success: successCount,
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
  
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
          Firebase Authentication 登録
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="font-medium">登録完了!</span>
            <span className="block sm:inline"> 「{registeredId}」の登録が完了しました。</span>
          </div>
        )}
        
        {/* 通常の登録フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="customId" className="block text-sm font-medium text-gray-700 mb-1">
                ユーザーID
              </label>
              <input
                id="customId"
                name="customId"
                type="text"
                required
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="ユーザーIDを入力"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="パスワードを入力"
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
              {loading ? '処理中...' : '登録する'}
            </button>
          </div>
          
          <div className="text-sm text-center mt-4">
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              すでにアカウントをお持ちの方はログイン
            </a>
          </div>
          
          {success && (
            <div className="text-sm text-center mt-4">
              <button 
                onClick={() => setSuccess(false)} 
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                別のアカウントを登録する
              </button>
            </div>
          )}
        </form>
        
        {/* CSV一括登録セクション */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">CSV一括登録</h3>
          <p className="text-sm text-gray-600 mb-4">
            userIDとpasswordの列を含むCSVファイルをアップロードして、最大100ユーザーまで一括登録できます。
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
                形式: CSV (userID,password)
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
                            <td className={`px-3 py-2 whitespace-nowrap text-xs ${log.status === '成功' ? 'text-green-500' : 'text-red-500'}`}>
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

export default RegisterForm;