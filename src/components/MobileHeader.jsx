import React, { useState } from 'react';
import { ArrowLeft, Bell, Menu, MapPin, User, X, Info, Settings, LogOut, Car, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function MobileHeader({ title, onBack, showNotifications = true, showLocation = false, currentLocation }) {
  const { user, logout } = useAuth();
  const [showSidebar, setShowSidebar] = useState(false);

  const handleMenuClick = () => {
    setShowSidebar(true);
  };

  return (
    <>
      <div className="bg-white shadow-sm border-b-2 border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {showLocation && currentLocation && (
              <p className="text-xs text-gray-600 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {currentLocation.length > 40 ? currentLocation.substring(0, 40) + '...' : currentLocation}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showNotifications && (
            <button className="p-2 hover:bg-gray-100 rounded-full relative">
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </button>
          )}
          
          <button
            onClick={handleMenuClick}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowSidebar(false)} />
          <div className="relative bg-white w-80 h-full shadow-xl">
            <div className="p-6 border-b-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{user?.role?.replace('-', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <button className="w-full flex items-center space-x-3 p-4 hover:bg-gray-100 rounded-xl text-left">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 font-medium">Settings</span>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-4 hover:bg-gray-100 rounded-xl text-left">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 font-medium">Help & Support</span>
              </button>
              
              <div className="border-t-2 border-gray-100 pt-4 mt-4">
                <button
                  onClick={() => {
                    setShowSidebar(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-3 p-4 hover:bg-red-50 rounded-xl text-left text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-blue-600 mr-2" />
                  <p className="text-sm font-semibold text-blue-900">RSR Tours & Travels</p>
                </div>
                <p className="text-xs text-blue-700">Version 1.0.0</p>
                <p className="text-xs text-blue-600 mt-1">Professional Cab Management</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileHeader;