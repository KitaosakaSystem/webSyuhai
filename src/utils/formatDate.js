/**
 * 日付をフォーマットする関数群
 */

/**
 * 日付を時刻表示用にフォーマット（HH:mm形式）
 * @param {Date|string|number} date - フォーマットする日付
 * @returns {string} フォーマットされた時刻
 */
export const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * 日付を完全な形式でフォーマット（YYYY年MM月DD日 HH:mm形式）
   * @param {Date|string|number} date - フォーマットする日付
   * @returns {string} フォーマットされた日付
   */
  export const formatFullDateTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * 日付のみをフォーマット（YYYY年MM月DD日形式）
   * @param {Date|string|number} date - フォーマットする日付
   * @returns {string} フォーマットされた日付
   */
  export const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  /**
   * 相対的な時間表示を返す（〇分前、〇時間前など）
   * @param {Date|string|number} date - 対象の日付
   * @returns {string} 相対的な時間表示
   */
  export const formatRelativeTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
  
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
    if (minutes < 1) {
      return 'たった今';
    } else if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return formatDate(date);
    }
  };
  
  /**
   * 日付が今日かどうかを判定
   * @param {Date|string|number} date - 判定する日付
   * @returns {boolean} 今日の日付の場合はtrue
   */
  export const isToday = (date) => {
    const d = new Date(date);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };
  
  /**
   * 曜日を取得（日本語）
   * @param {Date|string|number} date - 対象の日付
   * @returns {string} 曜日（日本語）
   */
  export const getWeekday = (date) => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const d = new Date(date);
    return weekdays[d.getDay()];
  };
  
  /**
   * 時間範囲の文字列を生成（HH:mm-HH:mm形式）
   * @param {Date|string|number} start - 開始時刻
   * @param {Date|string|number} end - 終了時刻
   * @returns {string} 時間範囲の文字列
   */
  export const formatTimeRange = (start, end) => {
    return `${formatTime(start)}-${formatTime(end)}`;
  };