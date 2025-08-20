import React from 'react';

function MobileButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'lg', 
  disabled = false,
  className = '',
  icon: Icon
}) {
  const baseClasses = 'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50 active:bg-blue-100',
    success: 'bg-green-600 text-white border-green-600 hover:bg-green-700 active:bg-green-800',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 active:bg-red-800',
    outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? disabledClasses : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{children}</span>
    </button>
  );
}

export default MobileButton;