import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Car, User } from 'lucide-react';
import NotificationSystem from './NotificationSystem';

function Navbar() {
  const { user, logout } = useAuth();

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'company-admin':
        return 'Company Admin';
      case 'travel-admin':
        return 'Travel Admin';
      case 'driver':
        return 'Driver';
      case 'employee':
        return 'Employee';
      default:
        return 'User';
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Car className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-bold text-gray-900">CabManager</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationSystem user={user} />
            
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-600" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-gray-600">{getRoleDisplay(user?.role)}</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;