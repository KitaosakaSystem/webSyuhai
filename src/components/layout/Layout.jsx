// src/components/layout/Layout.jsx
import Header from './Header';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full md:max-w-2xl lg:max-w-3xl h-screen md:h-[800px] md:my-8 bg-sky-50 
                      flex flex-col md:rounded-lg md:shadow-lg overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto  flex flex-col">
          {children}
        </div>
        <BottomNav />
      </div>
    </div>
  );
};

export default Layout;
