import { useEffect, useState } from 'react'

const ToggleSwitch = ({ label = '', onChange = () => {} }) => {
     // ローカルストレージから初期値を読み込む
  const getInitialState = () => {
    const savedValue = localStorage.getItem('bottomNaviMerge');
    return savedValue ? JSON.parse(savedValue) : false;
  };

  const [isOn, setIsOn] = useState(getInitialState);

  // 状態が変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('bottomNaviMerge', JSON.stringify(isOn));
    onChange(isOn);
  }, [isOn, 'bottomNaviMerge', onChange]);

  const toggleSwitch = () => {
    setIsOn(!isOn);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={toggleSwitch}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isOn ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={isOn}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
            isOn ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch