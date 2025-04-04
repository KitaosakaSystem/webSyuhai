import { Check, X, RotateCcw, Send } from 'lucide-react';
import { useSelector } from 'react-redux';

const ActionButtons = ({ selectedAction, onActionSelect, onSend }) => {

  const loginUserType = useSelector(state => state.loginUserData.loginUserType);

  let actions

  if(loginUserType === 'customer'){
    actions = [
      { id: 'collect', icon: Check, label: '検体あり', size: 32 },
      { id: 'no-collect', icon: X, label: '検体なし', size: 32 },
      { id: 'recollect', icon: RotateCcw, label: '再集配', size: 32 },
      { id: 'send', icon: Send, label: '送信', size: 18 }
    ];
  }else{
    actions = [
      { id: 'staff-replay', icon: Check, label: '定型文を返信', size: 32 },
      { id: 'send', icon: Send, label: '送信', size: 18 }
    ];
    console.log("staff actions",actions)
  }


  return (
    <div className="bg-white border-t border-teal-100 p-4">
      <div className="flex justify-between items-center space-x-4">
        {actions.map(({ id, icon: Icon, label, size }) => {
          const isSendButton = id === 'send';
          const isSelected = selectedAction === id && !isSendButton;
          
          return (
            <button
              key={id}
              onClick={() => isSendButton ? onSend() : onActionSelect(id)}
              disabled={isSendButton && !selectedAction}
              className={`
                flex-1 flex flex-col items-center p-3 rounded-lg 
                transition-colors duration-200
                ${isSendButton && !selectedAction ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-50'}
                ${isSelected ? 'bg-teal-100 text-teal-700' : 'text-teal-600'}
              `}
            >
              <Icon 
                size={size} 
                className={`${isSelected ? 'text-teal-700' : 'text-teal-600'}`} 
              />
              <span className={`text-xs mt-1 ${isSelected ? 'text-teal-700' : 'text-teal-600'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ActionButtons;