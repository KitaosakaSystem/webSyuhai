import { useEffect, useState } from 'react';
import { MapPin, Clock, Building2, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { changeText } from '../../store/slice/headerTextSlice';
import { doc, getDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';

const CourseList = () => {
  const loginUserType = localStorage.getItem('userType');
  const [kyotenId, setKyotenId] = useState(localStorage.getItem('kyotenId') || '21');
  const dispatch = useDispatch();
  
  // 拠点IDの選択肢
  const kyotenOptions = ['21:北大阪', '22:兵庫', '23:東大阪'];
  
  useEffect(() => {
    dispatch(changeText('コース担当一覧'))
  })

  const [routes, setRoutes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    if (!kyotenId) {
      setRoutes([]);
      return;
    }
    setRoutes([]);

    const kyotenPrefix = kyotenId.substring(0, 2);

    const routeRef = doc(db, 'routes', kyotenPrefix);
    const unsubscribe = onSnapshot(routeRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        const today = new Date().toISOString().split('T')[0];
        
        const newRoutes = Object.entries(data)
          .filter(([key, value]) => key !== 'date')
          .sort(([keyA], [keyB]) => {
            const numA = parseInt(keyA.slice(1));
            const numB = parseInt(keyB.slice(1));
            return numA - numB;
          })
          .map(([key, value]) => ({
            id: key.toUpperCase(),
            name: value.login_date === today ? value.staff_name : '',
            status: value.login_date === today ? 'online' : 'offline'
          }));

        setRoutes(prevRoutes => {
          const uniqueRoutes = [...prevRoutes, ...newRoutes].reduce((acc, route) => {
            acc[route.id] = route;
            return acc;
          }, {});
          return Object.values(uniqueRoutes);
        });
      }
    }, (error) => {
      console.error("Error fetching document:", error);
    });

    return () => unsubscribe();
  }, [kyotenId]);

  // 拠点ID選択ハンドラー
  const handleKyotenIdChange = (e) => {
    const newKyotenId = e.target.value;
    setKyotenId(newKyotenId);
    localStorage.setItem('kyotenId', newKyotenId);
  };

  return (
    <>
      {loginUserType === 'customer' ? (
        <div>社員専用画面</div>
      ) : (
        <div className="flex-1 flex flex-col bg-sky-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* 拠点ID選択コンボボックス */}
            <div className="space-y-2 rounded-lg mb-4 overflow-hidden">
              <label className="text-base font-medium text-gray-700">拠点コード</label>
              <select
                value={kyotenId}
                onChange={handleKyotenIdChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
              >
                {kyotenOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* ルート一覧 */}
            {routes.map(route => (
              <div 
                key={route.id}
                className="bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="p-2">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-medium">
                      {route.id + '>' + route.name}
                    </h2>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs ${
                        route.status === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {route.status === 'online' ? 'オンライン' : 'オフライン'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default CourseList;