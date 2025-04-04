import  { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Route, MessageCircle, Settings, ChevronUp, ChevronDown } from 'lucide-react';

const BottomNav = () => {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleNav = () => {
    setIsNavVisible(!isNavVisible);
  };

  const [bottomNaviMerge, setBottomNaviMerge] = useState(false);
 
  useEffect(() => {
    const bufBottomNaviMerge = localStorage.getItem('bottomNaviMerge')
    // console.log("bufBottomNaviMerge",bufBottomNaviMerge)
    if (bufBottomNaviMerge == 'true'){
      setBottomNaviMerge(true);
    }else{
      setBottomNaviMerge(false);
    }
    
  },[])

  const navigationItems = [
    { path: '/', icon: Users, label: '顧客一覧' },
    { path: '/chat', icon: MessageCircle, label: 'チャット' },
    { path: '/course', icon: Route, label: 'コース担当' },
    { path: '/settings', icon: Settings, label: '設定' }
  ];

  const isActive = (path) => {
    // ルートパスの場合は完全一致、それ以外はパスの開始が一致するか確認
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={toggleNav}
        className="w-full bg-white p-2 border-t border-teal-100 flex justify-center items-center space-x-2 hover:bg-teal-50 transition-colors"
      >
        <span className="text-sm text-teal-700">メニュー</span>
        {isNavVisible ? 
          <ChevronDown size={20} className="text-teal-700" /> : 
          <ChevronUp size={20} className="text-teal-700 mb-12 " />
        }
      </button>

      {/* Bottom Navigation */}
      {isNavVisible && (
        <div className={`bg-white border-t border-teal-100 md:rounded-b-lg ${bottomNaviMerge ? "mb-8" : ""}`}>
          <div className="grid grid-cols-4 py-2">
            {navigationItems.map(({ path, icon: Icon, label }) => (
              <button 
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center justify-center space-y-1 hover:bg-teal-50 p-2 rounded-lg transition-colors"
              >
                <Icon 
                  size={24} 
                  className={isActive(path) ? "text-teal-600" : "text-gray-500"} 
                />
                <span 
                  className={`text-xs ${
                    isActive(path) ? "text-teal-600" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNav;