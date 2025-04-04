// utils/dateUtils.js

/**
 * 今日の日付を YYYY-MM-DD 形式で取得（日本時間）
 * @returns {string} YYYY-MM-DD形式の文字列
 */
export const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  /**
   * 日付文字列が今日の日付と一致するかチェック
   * @param {string} dateString - YYYY-MM-DD形式の日付文字列
   * @returns {boolean} 今日の日付と一致する場合はtrue
   */
  export const isToday = (dateString) => {
    return dateString === getTodayDate();
  };
  
  /**
   * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換
   * @param {Date} date - Date オブジェクト
   * @returns {string} YYYY-MM-DD形式の文字列
   */
  export const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };