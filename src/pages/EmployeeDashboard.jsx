import React, { useState, useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import MobileHeader from '../components/MobileHeader';
import BottomNavigation from '../components/BottomNavigation';
import MobileCard from '../components/MobileCard';
import MobileButton from '../components/MobileButton';
import NavigationScreen from '../components/NavigationScreen';
import ChatSystem from '../components/ChatSystem';
import { 
  Car, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  MessageCircle, 
  Navigation, 
  Route, 
  CheckCircle, 
  Calendar, 
  Mail,
  Star,
  Bell
} from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNavigationScreen, setShowNavigationScreen] = useState(false);
  const [showChatSystem, setShowChatSystem] = useState(false);
  const [selectedTripForChat, setSelectedTripForChat] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchEmployeeTrips();
    
    const socket = socketService.connect(user.id);
    
    socket.on('tripStarted', (data) => {
      if (data.employees?.some(emp => emp.employeeId === user.id)) {
        toast.success('Your trip has started!');
        fetchEmployeeTrips();
      }
    });

    socket.on('driverLocationUpdate', (data) => {
      if (currentTrip && data.tripId === currentTrip._id) {
        setDriverLocation(data.location);
        setCurrentTrip(prev => ({
          ...prev,
          currentLocation: data.location
        }));
      }
    });

    socket.on('employeePickedUp', (data) => {
      if (data.employeeId === user.id) {
        toast.success('You have been picked up!');
        fetchEmployeeTrips();
      }
    });

    socket.on('employeeDropped', (data) => {
      if (data.employeeId === user.id) {
        toast.success('Trip completed successfully!');
        fetchEmployeeTrips();
      }
    });

    socket.on('tripStatusUpdate', (data) => {
      fetchEmployeeTrips();
    });

    return () => {
      socketService.disconnect();
    };
  }, [user.id, currentTrip]);

  const fetchEmployeeTrips = async () => {
    try {
      const response = await api.get(`/trips/employee/${user.id}`);
      setTrips(response.data);
      
      const activeTrip = response.data.find(trip => 
        trip.status === 'Started' || trip.status === 'In Progress'
      );
      setCurrentTrip(activeTrip);
    } catch (error) {
      toast.error('Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeStatus = (trip) => {
    const employee = trip.employees.find(emp => emp.employeeId._id === user.id);
    return employee ? employee.status : 'Unknown';
  };

  const getEmployeeDetails = (trip) => {
    return trip.employees.find(emp => emp.employeeId._id === user.id);
  };

  const todayTrips = trips.filter(trip => {
    const today = new Date().toDateString();
    return new Date(trip.scheduledDate).toDateString() === today;
  });

  const upcomingTrips = trips.filter(trip => 
    trip.status === 'Scheduled' && new Date(trip.scheduledDate) > new Date()
  );

  const completedTrips = trips.filter(trip => trip.status === 'Completed');

  const stats = {
    totalTrips: trips.length,
    todayTrips: todayTrips.length,
    upcomingTrips: upcomingTrips.length,
    completedTrips: completedTrips.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your trips...</p>
        </div>
      </div>
    );
  }

  if (showLoading) {
    return <LoadingScreen message="Loading your trip details..." />;
  }

  if (showNavigationScreen && currentTrip) {
    return (
      <NavigationScreen
        trip={currentTrip}
        currentLocation={currentTrip.currentLocation}
        userRole="employee"
        onClose={() => setShowNavigationScreen(false)}
      />
    );
  }

  if (showChatSystem && selectedTripForChat) {
    return (
      <ChatSystem
        trip={selectedTripForChat}
        onClose={() => {
          setShowChatSystem(false);
          setSelectedTripForChat(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="My Trips" />
      
      <div className="p-4 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MobileCard className="text-center" hover>
                <Route className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
                <p className="text-sm text-gray-600">Total Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.todayTrips}</p>
                <p className="text-sm text-gray-600">Today's Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingTrips}</p>
                <p className="text-sm text-gray-600">Upcoming</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.completedTrips}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </MobileCard>
            </div>

            {/* Current Trip Card */}
            {currentTrip && (
              <MobileCard hover>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-6 h-6 text-green-600 mr-2" />
                    Current Trip
                  </h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
                    {getEmployeeStatus(currentTrip)}
                  </span>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <h4 className="font-semibold text-xl text-gray-900 mb-3">{currentTrip.tripName}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600">Date</p>
                      <p className="font-medium text-gray-900">{new Date(currentTrip.scheduledDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Time</p>
                      <p className="font-medium text-gray-900">{currentTrip.scheduledStartTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Driver</p>
                      <p className="font-medium text-gray-900">{currentTrip.driverId?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Vehicle</p>
                      <p className="font-medium text-gray-900">{currentTrip.vehicleId?.numberPlate}</p>
                    </div>
                  </div>

                  {/* Employee's pickup and drop locations */}
                  {(() => {
                    const empDetails = getEmployeeDetails(currentTrip);
                    return empDetails && (
                      <div className="grid grid-cols-1 gap-3 mb-4">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                          <p className="text-green-800 font-medium text-sm mb-1">Your Pickup</p>
                          <p className="text-green-700 text-xs">{empDetails.pickupLocation?.address}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <p className="text-red-800 font-medium text-sm mb-1">Your Drop</p>
                          <p className="text-red-700 text-xs">{empDetails.dropLocation?.address}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <MobileButton
                    onClick={() => setShowNavigationScreen(true)}
                    variant="success"
                    icon={Navigation}
                    className="flex-1"
                  >
                    Track Live
                  </MobileButton>
                  
                  <MobileButton
                    onClick={() => {
                      setSelectedTripForChat(currentTrip);
                      setShowChatSystem(true);
                    }}
                    size="md"
                    variant="secondary"
                    icon={MessageCircle}
                    className="flex-1"
                  >
                    Chat
                  </MobileButton>
                </div>
              </MobileCard>
            )}

            {/* No Current Trip */}
            {!currentTrip && (
              <MobileCard className="text-center py-8" hover>
                <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Trip</h3>
                <p className="text-gray-600 mb-4">You don't have any active trips at the moment.</p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-blue-800 text-sm">Your next trip will appear here when scheduled by the Travel Admin.</p>
                </div>
              </MobileCard>
            )}

            {/* Today's Trips */}
            <MobileCard hover>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Trips</h3>
              <div className="space-y-3">
                {todayTrips.length > 0 ? (
                  todayTrips.slice(0, 3).map((trip) => (
                    <div key={trip._id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{trip.tripName}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          getEmployeeStatus(trip) === 'Dropped' ? 'bg-green-100 text-green-800 border-green-200' :
                          getEmployeeStatus(trip) === 'Picked' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {getEmployeeStatus(trip)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{trip.scheduledStartTime} - {trip.scheduledEndTime} • Driver: {trip.driverId?.name}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No trips scheduled for today</p>
                  </div>
                )}
              </div>
            </MobileCard>
          </div>
        )}

        {/* Current Trip Tab */}
        {activeTab === 'current-trip' && (
          <div className="space-y-6">
            {currentTrip ? (
              <>
                {/* Current Trip Header */}
                <MobileCard>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{currentTrip.tripName}</h2>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
                      {getEmployeeStatus(currentTrip)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-gray-600 text-sm">Date</p>
                      <p className="font-semibold text-gray-900">{new Date(currentTrip.scheduledDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Time</p>
                      <p className="font-semibold text-gray-900">{currentTrip.scheduledStartTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Status</p>
                      <p className="font-semibold text-gray-900">{currentTrip.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Distance</p>
                      <p className="font-semibold text-gray-900">{currentTrip.totalDistance || 0} km</p>
                    </div>
                  </div>
                </MobileCard>

                {/* Live Tracking Button */}
                <MobileButton
                  onClick={() => setShowNavigationScreen(true)}
                  size="xl"
                  variant="success"
                  icon={MapPin}
                  className="w-full"
                >
                  Track Live Location
                </MobileButton>

                {/* Driver Information */}
                <MobileCard hover>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Driver Information
                  </h3>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xl text-gray-900">{currentTrip.driverId?.name}</h4>
                        <p className="text-gray-600 flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {currentTrip.driverId?.email}
                        </p>
                        <div className="flex items-center mt-1">
                          <Star className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-600 ml-1">4.8 Rating</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MobileButton
                        size="sm"
                        variant="success"
                        icon={Phone}
                      >
                        Call
                      </MobileButton>
                      <MobileButton
                        size="sm"
                        variant="secondary"
                        icon={MessageCircle}
                        onClick={() => {
                          setSelectedTripForChat(currentTrip);
                          setShowChatSystem(true);
                        }}
                      >
                        Chat
                      </MobileButton>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                    <h5 className="font-medium text-gray-900 mb-3">Vehicle Details</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Vehicle:</span>
                        <span className="font-medium ml-2 text-gray-900">{currentTrip.vehicleId?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Number:</span>
                        <span className="font-medium ml-2 text-gray-900">{currentTrip.vehicleId?.numberPlate}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <span className="font-medium ml-2 text-gray-900">{currentTrip.vehicleId?.capacity} seats</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium ml-2 text-gray-900">{currentTrip.vehicleId?.status}</span>
                      </div>
                    </div>
                  </div>
                </MobileCard>

                {/* Your Trip Details */}
                {(() => {
                  const empDetails = getEmployeeDetails(currentTrip);
                  return empDetails && (
                    <MobileCard hover>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Trip Details</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                            <MapPin className="w-5 h-5 mr-2" />
                            Pickup Location
                          </h4>
                          <p className="text-green-700 text-sm">{empDetails.pickupLocation?.address}</p>
                          {empDetails.pickupTime && (
                            <p className="text-sm text-green-600 mt-2">
                              Picked up at: {new Date(empDetails.pickupTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                          <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                            <MapPin className="w-5 h-5 mr-2" />
                            Drop Location
                          </h4>
                          <p className="text-red-700 text-sm">{empDetails.dropLocation?.address}</p>
                          {empDetails.dropTime && (
                            <p className="text-sm text-red-600 mt-2">
                              Dropped at: {new Date(empDetails.dropTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-6 text-center">
                        <span className={`px-6 py-3 rounded-full text-lg font-semibold border-2 ${
                          empDetails.status === 'Dropped' ? 'bg-green-100 text-green-800 border-green-200' :
                          empDetails.status === 'Picked' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          Status: {empDetails.status}
                        </span>
                      </div>
                    </MobileCard>
                  );
                })()}
              </>
            ) : (
              <MobileCard className="text-center py-8">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Trip</h3>
                <p className="text-gray-600">You don't have any active trips at the moment.</p>
              </MobileCard>
            )}
          </div>
        )}

        {/* Trip History Tab */}
        {activeTab === 'trip-history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Trip History</h2>
            </div>

            <div className="space-y-4">
              {trips.length > 0 ? (
                trips.map((trip) => {
                  const empDetails = getEmployeeDetails(trip);
                  return (
                    <MobileCard key={trip._id} hover>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg text-gray-900">{trip.tripName}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            getEmployeeStatus(trip) === 'Dropped' ? 'bg-green-100 text-green-800 border-green-200' :
                            getEmployeeStatus(trip) === 'Picked' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            trip.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {getEmployeeStatus(trip)}
                          </span>
                          {trip.status === 'Completed' && (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-gray-600 ml-1">4.8</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-600">Date</p>
                          <p className="font-medium text-gray-900">{new Date(trip.scheduledDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Time</p>
                          <p className="font-medium text-gray-900">{trip.scheduledStartTime} - {trip.scheduledEndTime}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Driver</p>
                          <p className="font-medium text-gray-900">{trip.driverId?.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Vehicle</p>
                          <p className="font-medium text-gray-900">{trip.totalDistance || 0} km</p>
                        </div>
                      </div>

                      {empDetails && (
                        <div className="grid grid-cols-1 gap-3">
                          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                            <p className="text-green-800 font-medium text-xs">Pickup: {empDetails.pickupLocation?.address}</p>
                          </div>
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <p className="text-red-800 font-medium text-xs">Drop: {empDetails.dropLocation?.address}</p>
                          </div>
                        </div>
                      )}
                    </MobileCard>
                  );
                })
              ) : (
                <MobileCard className="text-center py-8">
                  <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No trip history available</p>
                </MobileCard>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <MobileCard hover>
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500 mt-1">Employee</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalTrips}</p>
                  <p className="text-sm text-blue-800">Total Trips</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{stats.completedTrips}</p>
                  <p className="text-sm text-green-800">Completed</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{stats.todayTrips}</p>
                  <p className="text-sm text-blue-800">Today</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{stats.upcomingTrips}</p>
                  <p className="text-sm text-green-800">Upcoming</p>
                </div>
              </div>
            </MobileCard>

            {/* Preferences */}
            <MobileCard hover>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-900">Trip Notifications</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-900">SMS Updates</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-900">Email Notifications</span>
                  <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </div>
                </div>
              </div>
            </MobileCard>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole="employee" 
      />
    </div>
  );
}

export default EmployeeDashboard;