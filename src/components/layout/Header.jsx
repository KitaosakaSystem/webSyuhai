// src/components/layout/Header.jsx
import { ChevronLeft } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBackButton = location.pathname !== '/';

  const handleBack = () => {
    navigate(-1);
  };

  // store内の値を取得
  const headerText = useSelector(state => state.header.mess);

  return (
    <div className="bg-blue-600 shadow-sm">
      <div className="py-2 px-4">  {/* padding を調整 */}
        <div className="flex items-center">
          {showBackButton && (
            <button 
              onClick={handleBack}
              className="mr-3 text-white hover:bg-blue-500 rounded-full p-1"
            >
              <ChevronLeft size={20} />  {/* アイコンサイズを小さく */}
            </button>
          )}
          <h1 className="text-base text-white font-medium">
            medic.web集配連絡システム ver0.1.0
          </h1>
        </div>
      </div>
      <div className="bg-teal-600 shadow-sm">
        <div className="p-4">
         <h1 className="text-lg font-medium text-white">{headerText} </h1>
       </div>
      </div>
    </div>

  );
};

export default Header;