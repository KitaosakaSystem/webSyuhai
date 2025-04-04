import React from 'react';

const ChatMessage = ({ message }) => {
  const { isCustomer, text, time } = message;

  return (
    <div>
      <div
        className={`mb-4 ${isCustomer ? 'flex justify-end' : 'flex justify-start'}`}
      >
        {isCustomer  &&(
          <p className={`text-sm mt-1 text-gray-500 flex items-end `}>{time}</p>
        )}
        <div className={`max-w-xs p-3 rounded-lg shadow-sm ${
            isCustomer
              ? 'bg-teal-500 text-white'
              : 'bg-white text-gray-800'
          }`}
        >
          <p className="text-lg whitespace-pre-line">{text}</p>
        </div>

        {!isCustomer  &&(
          <p className={`text-sm mt-1 text-gray-500 flex items-end `}>{time}</p>
        )}        
      </div>
    </div>
  );
};

export default ChatMessage;