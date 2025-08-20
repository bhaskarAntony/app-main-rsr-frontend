import React from 'react';

function MobileCard({ children, className = '', padding = 'p-6' }) {
  return (
    <div className={`bg-white border-2 border-gray-100 rounded-xl shadow-sm ${padding} ${className}`}>
      {children}
    </div>
  );
}

export default MobileCard;