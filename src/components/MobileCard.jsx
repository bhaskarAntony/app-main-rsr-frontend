import React from 'react';

function MobileCard({ children, className = '', padding = 'p-4', onClick, hover = false }) {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200';
  const hoverClasses = hover ? 'hover:shadow-md hover:border-yellow-300 active:scale-98' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${padding} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default MobileCard;