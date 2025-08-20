import React, { useState, useEffect } from 'react';
import MobileHeader from '../components/MobileHeader';
import BottomNavigation from '../components/BottomNavigation';
import MobileCard from '../components/MobileCard';
import MobileButton from '../components/MobileButton';
import NavigationScreen from '../components/NavigationScreen';
import TripReportGenerator from '../components/TripReportGenerator';
import { Route, MapPin, Clock, Navigation, Download, FileText, Eye, BarChart3, Car, Users } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

function CompanyAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [trips, setTrips] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNavigationScreen, setShowNavigationScreen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTripForReport, setSelectedTripForReport] = useState(null);
  const [driverLocations, setDriverLocations] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    fetchLiveTrips();
    
    const socket = socketService.connect(user.id);
    
    socket.on('driverLocationUpdate', (data) => {
      setDriverLocations(prev => ({
        ...prev,
        [data.driverId]: data.location
      }));
      
      setLiveTrips(prev => prev.map(trip => 
        trip.driverId._id === data.driverId 
          ? { ...trip, currentLocation: data.location, totalDistance: data.totalDistance || trip.totalDistance }
          : trip
      ));
    });

    socket.on('tripStatusUpdate', (data) => {
      setTrips(prev => prev.map(trip => 
        trip._id === data.tripId ? { ...trip, status: data.status } : trip
      ));
      fetchLiveTrips();
    });

    const liveTripsInterval = setInterval(fetchLiveTrips, 5000);

    return () => {
      socketService.disconnect();
      clearInterval(liveTripsInterval);
    };
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      const tripsRes = await api.get('/trips');
      setTrips(tripsRes.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveTrips = async () => {
    try {
      const response = await api.get('/trips/live');
      setLiveTrips(response.data);
    } catch (error) {
      console.error('Failed to fetch live trips:', error);
    }
  };

  const handleExportTrips = async (format = 'json') => {
    try {
      const response = await api.get(`/trips/export?format=${format}`);
      toast.success(`Export prepared with ${response.data.count} trips`);
      
      const dataStr = JSON.stringify(response.data.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `trips_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      toast.error('Failed to export trips');
    }
  };

  const stats = {
    totalTrips: trips.length,
    liveTrips: liveTrips.length,
    completedTrips: trips.filter(t => t.status === 'Completed').length,
    inProgressTrips: trips.filter(t => t.status === 'In Progress').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (showNavigationScreen && selectedTrip) {
    return (
      <NavigationScreen
        trip={selectedTrip}
        currentLocation={selectedTrip.currentLocation}
        userRole="company-admin"
        onClose={() => {
          setShowNavigationScreen(false);
          setSelectedTrip(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Company Admin" />
      
      <div className="p-4 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MobileCard className="text-center">
                <Route className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
                <p className="text-sm text-gray-600">Total Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <div className="relative">
                  <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  {stats.liveTrips > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.liveTrips}</p>
                <p className="text-sm text-gray-600">Live Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.completedTrips}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.inProgressTrips}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </MobileCard>
            </div>

            {/* Live Trips Section */}
            <MobileCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Live Trips</h3>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">{liveTrips.length} Active</span>
                </div>
              </div>
              
              {liveTrips.length > 0 ? (
                <div className="space-y-3">
                  {liveTrips.map((trip) => (
                    <div key={trip._id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{trip.tripName}</h4>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">LIVE</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Driver:</span>
                          <span className="font-medium ml-2 text-gray-900">{trip.driverId?.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Distance:</span>
                          <span className="font-medium ml-2 text-gray-900">{trip.totalDistance || 0} km</span>
                        </div>
                      </div>
                      
                      <MobileButton
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowNavigationScreen(true);
                        }}
                        icon={Navigation}
                        className="w-full"
                      >
                        Track Live
                      </MobileButton>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No live trips at the moment</p>
                </div>
              )}
            </MobileCard>

            {/* Quick Actions */}
            <MobileCard>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <MobileButton
                  onClick={() => setActiveTab('trips')}
                  icon={Route}
                  className="w-full"
                >
                  View All Trips
                </MobileButton>
                <MobileButton
                  onClick={() => setActiveTab('live-tracking')}
                  variant="secondary"
                  icon={MapPin}
                  className="w-full"
                >
                  Live Tracking
                </MobileButton>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">All Trips</h2>
              <MobileButton
                onClick={() => handleExportTrips('json')}
                size="md"
                icon={Download}
              >
                Export
              </MobileButton>
            </div>

            <div className="space-y-4">
              {trips.map((trip) => (
                <MobileCard key={trip._id}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-gray-900">{trip.tripName}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      trip.status === 'Completed' 
                        ? 'bg-green-50 text-green-800 border-green-200' 
                        : trip.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : trip.status === 'Started'
                        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                        : 'bg-gray-50 text-gray-800 border-gray-200'
                    }`}>
                      {trip.status}
                    </span>
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
                      <p className="text-gray-600">Driver</p>
                      <p className="font-medium text-gray-900">{trip.driverId?.name || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Distance</p>
                      <p className="font-medium text-gray-900">{trip.totalDistance || 0} km</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {(trip.status === 'Started' || trip.status === 'In Progress') && (
                      <MobileButton
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowNavigationScreen(true);
                        }}
                        size="md"
                        icon={Navigation}
                        className="flex-1"
                      >
                        Track Live
                      </MobileButton>
                    )}
                    {trip.status === 'Completed' && (
                      <MobileButton
                        onClick={() => {
                          setSelectedTripForReport(trip);
                          setShowReportModal(true);
                        }}
                        variant="secondary"
                        size="md"
                        icon={Download}
                        className="flex-1"
                      >
                        Download Report
                      </MobileButton>
                    )}
                    <MobileButton
                      onClick={() => {
                        setSelectedTrip(trip);
                        // Show trip details
                      }}
                      variant="outline"
                      size="md"
                      icon={Eye}
                      className="flex-1"
                    >
                      View Details
                    </MobileButton>
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}

        {/* Live Tracking Tab */}
        {activeTab === 'live-tracking' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Live Trip Tracking</h2>
              <div className="flex items-center space-x-2 bg-green-50 text-green-800 px-3 py-1 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{liveTrips.length} Live Trips</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {liveTrips.map((trip) => (
                <MobileCard key={trip._id}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{trip.tripName}</h4>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">LIVE</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <span className="font-medium ml-2 text-gray-900">{trip.driverId?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium ml-2 text-gray-900">{trip.vehicleId?.numberPlate}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Passengers:</span>
                      <span className="font-medium ml-2 text-gray-900">{trip.employees.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium ml-2 text-gray-900">{trip.totalDistance || 0} km</span>
                    </div>
                  </div>
                  
                  {trip.currentLocation && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3 border border-blue-200">
                      <p className="text-blue-800 font-medium text-sm">Current Location:</p>
                      <p className="text-blue-700 text-xs">
                        {trip.currentLocation.lat?.toFixed(6)}, {trip.currentLocation.lng?.toFixed(6)}
                      </p>
                    </div>
                  )}
                  
                  <MobileButton
                    onClick={() => {
                      setSelectedTrip(trip);
                      setShowNavigationScreen(true);
                    }}
                    icon={Navigation}
                    className="w-full"
                  >
                    Track Live
                  </MobileButton>
                </MobileCard>
              ))}
            </div>
            
            {liveTrips.length === 0 && (
              <MobileCard className="text-center py-8">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Live Trips</h3>
                <p className="text-gray-600">No trips are currently active.</p>
              </MobileCard>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
              <MobileButton
                onClick={() => handleExportTrips('json')}
                size="md"
                icon={Download}
              >
                Export All
              </MobileButton>
            </div>

            {/* Export Options */}
            <MobileCard>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
              <div className="space-y-3">
                <MobileButton
                  onClick={() => handleExportTrips('json')}
                  icon={Download}
                  className="w-full"
                >
                  Download All Trips (JSON)
                </MobileButton>
                <MobileButton
                  onClick={() => handleExportTrips('csv')}
                  variant="secondary"
                  icon={FileText}
                  className="w-full"
                >
                  Download All Trips (CSV)
                </MobileButton>
              </div>
            </MobileCard>

            {/* Completed Trips for Report Generation */}
            <MobileCard>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Completed Trips - Generate Reports</h3>
              <div className="space-y-3">
                {trips.filter(trip => trip.status === 'Completed').slice(0, 10).map((trip) => (
                  <div key={trip._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{trip.tripName}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(trip.scheduledDate).toLocaleDateString()} • 
                        Driver: {trip.driverId?.name} • 
                        {trip.employees.length} passengers
                      </p>
                    </div>
                    <MobileButton
                      onClick={() => {
                        setSelectedTripForReport(trip);
                        setShowReportModal(true);
                      }}
                      size="sm"
                      icon={Download}
                    >
                      Download
                    </MobileButton>
                  </div>
                ))}
              </div>
            </MobileCard>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole="company-admin" 
      />

      {/* Trip Report Modal */}
      {showReportModal && selectedTripForReport && (
        <TripReportGenerator
          trip={selectedTripForReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedTripForReport(null);
          }}
        />
      )}
    </div>
  );
}

export default CompanyAdminDashboard;