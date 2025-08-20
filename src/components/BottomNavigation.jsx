import React from 'react';
import { Home, MapPin, Clock, User, Car, Route, Users, BarChart3, Settings } from 'lucide-react';

function BottomNavigation({ activeTab, setActiveTab, userRole }) {
  const getNavigationItems = () => {
    switch (userRole) {
      case 'driver':
        return [
          { id: 'overview', label: 'Home', icon: Home },
          { id: 'current-trip', label: 'Trip', icon: MapPin },
          { id: 'trip-history', label: 'History', icon: Clock },
          { id: 'profile', label: 'Profile', icon: User }
        ];
      case 'employee':
        return [
          { id: 'overview', label: 'Home', icon: Home },
          { id: 'current-trip', label: 'My Trip', icon: Car },
          { id: 'trip-history', label: 'History', icon: Clock },
          { id: 'profile', label: 'Profile', icon: User }
        ];
      case 'travel-admin':
        return [
          { id: 'overview', label: 'Home', icon: Home },
          { id: 'trips', label: 'Trips', icon: Route },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'vehicles', label: 'Fleet', icon: Car },
          { id: 'live-tracking', label: 'Live', icon: MapPin }
        ];
      case 'company-admin':
        return [
          { id: 'overview', label: 'Home', icon: Home },
          { id: 'trips', label: 'Trips', icon: Route },
          { id: 'live-tracking', label: 'Live', icon: MapPin },
          { id: 'reports', label: 'Reports', icon: BarChart3 }
        ];
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
      <div className="grid grid-cols-4 h-16" style={{ gridTemplateColumns: `repeat(${navigationItems.length}, 1fr)` }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BottomNavigation;