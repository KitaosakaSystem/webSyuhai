import { Routes, Route } from 'react-router-dom';
import CustomerList from '../pages/customers/CustomerList';
import Chat from '../pages/chat/Chat';
import CourseList from '../pages/course/CourseList';
import Settings from '../pages/settings/Settings';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/course" element={<CourseList />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};

export default AppRoutes