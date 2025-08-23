import React from 'react';

function MobileButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'lg', 
  disabled = false,
  className = '',
  icon: Icon,
  fullWidth = false
}) {
  const baseClasses = 'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border-2 shadow-sm active:scale-95';
  
  const variants = {
    primary: 'bg-yellow-400 text-gray-900 border-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 shadow-yellow-200',
    secondary: 'bg-white text-yellow-600 border-yellow-400 hover:bg-yellow-50 active:bg-yellow-100 shadow-yellow-100',
    success: 'bg-green-500 text-white border-green-500 hover:bg-green-600 active:bg-green-700 shadow-green-200',
    danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600 active:bg-red-700 shadow-red-200',
    outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100 shadow-gray-100',
    dark: 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800 active:bg-gray-700 shadow-gray-300'
  };

  const sizes = {
    xs: 'px-3 py-2 text-xs min-h-[32px]',
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[52px]',
    xl: 'px-10 py-5 text-xl min-h-[60px]'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed transform-none';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? disabledClasses : ''}
        ${widthClass}
        ${className}
      `}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

export default MobileButton;