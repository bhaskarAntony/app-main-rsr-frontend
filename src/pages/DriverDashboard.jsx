import React, { useState, useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import MobileHeader from '../components/MobileHeader';
import BottomNavigation from '../components/BottomNavigation';
import MobileCard from '../components/MobileCard';
import MobileButton from '../components/MobileButton';
import NavigationScreen from '../components/NavigationScreen';
import ChatSystem from '../components/ChatSystem';
import TripReportGenerator from '../components/TripReportGenerator';
import Modal from '../components/Modal';
import { 
  Route, 
  Car, 
  Clock, 
  CheckCircle, 
  MapPin, 
  Navigation, 
  Phone, 
  MessageCircle, 
  Play, 
  Users, 
  User, 
  Mail,
  Star,
  Settings,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';


function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [showNavigationScreen, setShowNavigationScreen] = useState(false);
  const [showChatSystem, setShowChatSystem] = useState(false);
  const [selectedTripForChat, setSelectedTripForChat] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTripForReport, setSelectedTripForReport] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchDriverData();
    
    const socket = socketService.connect(user.id);
    
    socket.on('tripAssigned', (tripData) => {
      if (tripData.driverId === user.id) {
        toast.success('New trip assigned to you!');
        fetchDriverData();
      }
    });

    socket.on('tripUpdated', (tripData) => {
      fetchDriverData();
    });

    socket.on('requestLocationUpdate', () => {
      if (locationTracking && currentLocation && currentTrip) {
        updateDriverLocation(currentLocation);
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, [user.id, locationTracking, currentLocation, currentTrip]);

  useEffect(() => {
    let watchId;
    
    if (locationTracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          updateLocationName(location);
          
          if (currentTrip) {
            updateDriverLocation(location);
          }
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Unable to get your location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationTracking, currentTrip]);

  const updateLocationName = async (location) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        setCurrentLocationName(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
  };

  const fetchDriverData = async () => {
    try {
      const [tripsRes, vehicleRes] = await Promise.all([
        api.get(`/trips/driver/${user.id}`),
        api.get(`/vehicles/driver/${user.id}`)
      ]);

      setTrips(tripsRes.data);
      setVehicle(vehicleRes.data);
      
      const activeTrip = tripsRes.data.find(trip => 
        trip.status === 'Started' || trip.status === 'In Progress'
      );
      setCurrentTrip(activeTrip);
      
      if (activeTrip) {
        setLocationTracking(true);
      }
    } catch (error) {
      toast.error('Failed to fetch driver data');
    } finally {
      setLoading(false);
    }
  };

  const updateDriverLocation = async (location) => {
    if (!currentTrip) return;
    
    try {
      await api.put(`/trips/${currentTrip._id}/location`, {
        lat: location.lat,
        lng: location.lng,
        speed: 0
      });
      
      socketService.emit('driverLocationUpdate', {
        driverId: user.id,
        tripId: currentTrip._id,
        location: location
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleStartTrip = async (tripId) => {
    try {
      setShowLoading(true);
      
      await api.put(`/trips/${tripId}/start`);
      toast.success('Trip started successfully');
      setLocationTracking(true);
      fetchDriverData();
      
      socketService.emit('tripStatusUpdate', {
        tripId,
        status: 'Started',
        driverId: user.id
      });
      
      // Auto-navigate to navigation screen
      setTimeout(() => {
        setShowLoading(false);
        setShowNavigationScreen(true);
      }, 2000);
    } catch (error) {
      setShowLoading(false);
      toast.error('Failed to start trip');
    }
  };

  const handlePickupEmployee = async (tripId, employeeId) => {
    try {
      await api.put(`/trips/${tripId}/pickup/${employeeId}`);
      toast.success('Employee picked up successfully');
      fetchDriverData();
      
      socketService.emit('employeePickedUp', {
        tripId,
        employeeId,
        driverId: user.id
      });
    } catch (error) {
      toast.error('Failed to update pickup status');
    }
  };

  const handleDropEmployee = async (tripId, employeeId) => {
    try {
      await api.put(`/trips/${tripId}/drop/${employeeId}`);
      toast.success('Employee dropped successfully');
      fetchDriverData();
      
      socketService.emit('employeeDropped', {
        tripId,
        employeeId,
        driverId: user.id
      });
    } catch (error) {
      toast.error('Failed to update drop status');
    }
  };

  const handleCompleteTrip = async () => {
    if (!currentTrip) return;
    
    try {
      await api.put(`/trips/${currentTrip._id}/complete`);
      toast.success('Trip completed successfully');
      setLocationTracking(false);
      setShowNavigationScreen(false);
      fetchDriverData();
      
      socketService.emit('tripCompleted', {
        tripId: currentTrip._id,
        driverId: user.id
      });
    } catch (error) {
      toast.error('Failed to complete trip');
    }
  };

  const activeTrips = trips.filter(trip => 
    trip.status === 'Started' || trip.status === 'In Progress'
  );
  const completedTrips = trips.filter(trip => trip.status === 'Completed');
  const todayTrips = trips.filter(trip => {
    const today = new Date().toDateString();
    return new Date(trip.scheduledDate).toDateString() === today;
  });

  const upcomingTrips = trips.filter(trip => 
    trip.status === 'Scheduled' && new Date(trip.scheduledDate) > new Date()
  );

  const stats = {
    todayTrips: todayTrips.length,
    upcomingTrips: upcomingTrips.length,
    completedTrips: completedTrips.length,
    totalDistance: trips.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0)
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
    return <LoadingScreen message="Starting your trip..." />;
  }

  if (showNavigationScreen && currentTrip) {
    return (
      <NavigationScreen
        trip={currentTrip}
        currentLocation={currentLocation}
        onClose={() => setShowNavigationScreen(false)}
        userRole="driver"
        onPickupEmployee={handlePickupEmployee}
        onDropEmployee={handleDropEmployee}
        onCompleteTrip={handleCompleteTrip}
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
      <MobileHeader 
        title="Driver Dashboard" 
        showLocation={locationTracking}
        currentLocation={currentLocationName}
      />
      
      <div className="p-4 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MobileCard className="text-center" hover>
                <Route className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{trips.length}</p>
                <p className="text-sm text-gray-600">Total Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{todayTrips.length}</p>
                <p className="text-sm text-gray-600">Today's Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Car className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{activeTrips.length}</p>
                <p className="text-sm text-gray-600">Active Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{completedTrips.length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </MobileCard>
            </div>

            {/* Current Trip Card */}
            {currentTrip && (
              <MobileCard hover>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Car className="w-6 h-6 text-blue-600 mr-2" />
                    Current Active Trip
                  </h3>
                  <span className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-200">
                    Live
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
                      <p className="text-gray-600">Passengers</p>
                      <p className="font-medium text-gray-900">{currentTrip.employees.length} passengers</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Distance</p>
                      <p className="font-medium text-gray-900">{currentTrip.totalDistance || 0} km</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <MobileButton
                    onClick={() => setShowNavigationScreen(true)}
                    icon={MapPin}
                    size="md"
                    className="flex-1"
                  >
                    Navigate
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

            {/* No Active Trip */}
            {!currentTrip && (
              <MobileCard className="text-center py-8" hover>
                <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Trip</h3>
                <p className="text-gray-600 mb-4">You don't have any active trips at the moment.</p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-blue-800 text-sm">Travel Admin will assign trips to you. Check back later or contact your administrator.</p>
                </div>
              </MobileCard>
            )}

            {/* Today's Schedule */}
            <MobileCard hover>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
              <div className="space-y-3">
                {todayTrips.length > 0 ? (
                  todayTrips.slice(0, 3).map((trip) => (
                    <div key={trip._id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{trip.tripName}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          trip.status === 'Completed' ? 'bg-green-50 text-green-800 border-green-200' :
                          trip.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          'bg-gray-50 text-gray-800 border-gray-200'
                        }`}>
                          {trip.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{trip.scheduledStartTime} • {trip.employees.length} passengers</p>
                      
                      {trip.status === 'Scheduled' && (
                        <MobileButton
                          onClick={() => handleStartTrip(trip._id)}
                          variant="success"
                          size="md"
                          icon={Play}
                          className="w-full"
                        >
                          Start Trip
                        </MobileButton>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No trips scheduled for today</p>
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
                    <span className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-200">
                      {currentTrip.status}
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

                {/* Navigation Button */}
                <MobileButton
                  onClick={() => setShowNavigationScreen(true)}
                  size="xl"
                  variant="success"
                  icon={MapPin}
                  className="w-full"
                >
                  Open Navigation
                </MobileButton>

                {/* Employee List */}
                <MobileCard hover>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Passengers ({currentTrip.employees.length})</h3>
                  <div className="space-y-3">
                    {currentTrip.employees.map((emp, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{emp.employeeId?.name}</h4>
                              <p className="text-sm text-gray-600">{emp.status}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MobileButton
                              size="sm"
                              variant="success"
                              icon={Phone}
                            >s
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
                        
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="bg-green-50 border border-green-200 p-2 rounded-lg">
                            <p className="text-green-800 font-medium text-xs">Pickup: {emp.pickupLocation?.address}</p>
                          </div>
                          <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
                            <p className="text-red-800 font-medium text-xs">Drop: {emp.dropLocation?.address}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </MobileCard>
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
              <MobileButton
                onClick={() => {
                  // Export driver trips
                  setShowLoading(true);
                  const driverTrips = trips.map(trip => ({
                    tripName: trip.tripName,
                    date: new Date(trip.scheduledDate).toLocaleDateString(),
                    status: trip.status,
                    distance: trip.totalDistance || 0,
                    passengers: trip.employees.length
                  }));
                  
                  const dataStr = JSON.stringify(driverTrips, null, 2);
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                  const exportFileDefaultName = `driver_trips_${new Date().toISOString().split('T')[0]}.json`;
                  
                  const linkElement = document.createElement('a');
                  linkElement.setAttribute('href', dataUri);
                  linkElement.setAttribute('download', exportFileDefaultName);
                  linkElement.click();
                  
                  toast.success('Trip history exported successfully');
                  setShowLoading(false);
                }}
                size="md"
                icon={Download}
              >
                Export
              </MobileButton>
            </div>

            <div className="space-y-4">
              {trips.length > 0 ? (
                trips.map((trip) => (
                  <MobileCard key={trip._id} hover>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-gray-900">{trip.tripName}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          trip.status === 'Completed' ? 'bg-green-50 text-green-800 border-green-200' :
                          trip.status === 'In Progress' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          'bg-gray-50 text-gray-800 border-gray-200'
                        }`}>
                          {trip.status}
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
                        <p className="font-medium text-gray-900">{trip.scheduledStartTime}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Passengers</p>
                        <p className="font-medium text-gray-900">{trip.employees.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Distance</p>
                        <p className="font-medium text-gray-900">{trip.totalDistance || 0} km</p>
                      </div>
                    </div>

                    {trip.status === 'Completed' && (
                      <MobileButton
                        onClick={() => {
                          setShowLoading(true);
                          setSelectedTripForReport(trip);
                          setShowReportModal(true);
                        }}
                        variant="secondary"
                        size="md"
                        icon={Download}
                        className="w-full"
                      >
                        Download Report
                      </MobileButton>
                    )}
                  </MobileCard>
                ))
              ) : (
                <MobileCard className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No trips found</p>
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
                <div className="flex items-center justify-center mt-2">
                  <Star className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600 ml-1">4.8 Rating</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{trips.length}</p>
                  <p className="text-sm text-blue-800">Total Trips</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{completedTrips.length}</p>
                  <p className="text-sm text-green-800">Completed</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalDistance.toFixed(1)}</p>
                  <p className="text-sm text-blue-800">Total KM</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">98%</p>
                  <p className="text-sm text-green-800">On Time</p>
                </div>
              </div>
            </MobileCard>

            {/* Vehicle Information */}
            {vehicle && (
              <MobileCard hover>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Vehicle</h3>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Car className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{vehicle.name}</h4>
                    <p className="text-gray-600">{vehicle.numberPlate}</p>
                    <p className="text-sm text-gray-500">{vehicle.capacity} seats</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    vehicle.status === 'active' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {vehicle.status.toUpperCase()}
                  </span>
                </div>
              </MobileCard>
            )}

            {/* Settings */}
            <MobileCard hover>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-900">Notifications</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-900">Location Sharing</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-900">Auto Accept Trips</span>
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
        userRole="driver" 
      />

      {/* Trip Report Modal */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Generate Trip Report">
        <TripReportGenerator
          trip={selectedTripForReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedTripForReport(null);
          }}
        />
      </Modal>
    </div>
  );
}

export default DriverDashboard;