import React, { useEffect, useState } from 'react';
import { Bell, X, MapPin, Clock, User, Car } from 'lucide-react';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

function NotificationSystem({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Listen for real-time notifications
    const socket = socketService.connect(user.id);

    socket.on('tripAssigned', (data) => {
      if (user.role === 'driver' && data.driverId === user.id) {
        addNotification({
          id: Date.now(),
          type: 'trip_assigned',
          title: 'New Trip Assigned',
          message: `You have been assigned to trip: ${data.tripName}`,
          timestamp: new Date(),
          data: data
        });
        toast.success('New trip assigned to you!');
      }
    });

    socket.on('tripStarted', (data) => {
      // Notify employees when their trip starts
      if (user.role === 'employee' && data.employees?.some(emp => emp.employeeId === user.id)) {
        addNotification({
          id: Date.now(),
          type: 'trip_started',
          title: 'Trip Started',
          message: `Your trip "${data.tripName}" has started. Driver is on the way!`,
          timestamp: new Date(),
          data: data
        });
        toast.success('Your trip has started!');
      }
    });

    socket.on('driverLocationUpdate', (data) => {
      // Update location for employees in active trips
      if (user.role === 'employee') {
        // This will be handled by the trip tracking component
      }
    });

    socket.on('employeePickedUp', (data) => {
      if (data.employeeId === user.id) {
        addNotification({
          id: Date.now(),
          type: 'picked_up',
          title: 'Picked Up',
          message: 'You have been picked up successfully!',
          timestamp: new Date(),
          data: data
        });
        toast.success('You have been picked up!');
      }
    });

    socket.on('employeeDropped', (data) => {
      if (data.employeeId === user.id) {
        addNotification({
          id: Date.now(),
          type: 'dropped',
          title: 'Trip Completed',
          message: 'You have been dropped at your destination!',
          timestamp: new Date(),
          data: data
        });
        toast.success('Trip completed successfully!');
      }
    });

    return () => {
      socket.off('tripAssigned');
      socket.off('tripStarted');
      socket.off('driverLocationUpdate');
      socket.off('employeePickedUp');
      socket.off('employeeDropped');
    };
  }, [user]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 notifications
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'trip_assigned':
        return <Car className="w-5 h-5 text-blue-600" />;
      case 'trip_started':
        return <MapPin className="w-5 h-5 text-green-600" />;
      case 'picked_up':
        return <User className="w-5 h-5 text-orange-600" />;
      case 'dropped':
        return <Clock className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => setNotifications([])}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationSystem;