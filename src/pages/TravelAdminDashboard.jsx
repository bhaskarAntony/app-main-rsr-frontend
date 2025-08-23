import React, { useState, useEffect } from 'react';
import MobileHeader from '../components/MobileHeader';
import BottomNavigation from '../components/BottomNavigation';
import MobileCard from '../components/MobileCard';
import MobileButton from '../components/MobileButton';
import Modal from '../components/Modal';
import LocationInput from '../components/LocationInput';
import MapPreview from '../components/MapPreview';
import NavigationScreen from '../components/NavigationScreen';
import { 
  Plus, 
  Route, 
  Users, 
  Car, 
  MapPin, 
  Clock, 
  Edit, 
  Trash2, 
  Eye, 
  Download,
  Navigation,
  Phone,
  MessageCircle,
  Calendar,
  User,
  Mail,
  Shield,
  Settings,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function TravelAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showTripModal, setShowTripModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Navigation
  const [showNavigationScreen, setShowNavigationScreen] = useState(false);
  
  // Form states
  const [tripForm, setTripForm] = useState({
    tripName: '',
    scheduledDate: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    driverId: '',
    vehicleId: '',
    employees: [],
    startLocation: null,
    endLocation: null,
    notes: ''
  });
  
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    assignedVehicle: ''
  });
  
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    numberPlate: '',
    capacity: '',
    driverId: '',
    status: 'active',
    specifications: {
      make: '',
      model: '',
      year: '',
      fuelType: 'petrol',
      mileage: ''
    }
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    fetchLiveTrips();
    
    const socket = socketService.connect(user.id);
    
    socket.on('driverLocationUpdate', (data) => {
      setLiveTrips(prev => prev.map(trip => 
        trip.driverId._id === data.driverId 
          ? { ...trip, currentLocation: data.location, totalDistance: data.totalDistance || trip.totalDistance }
          : trip
      ));
    });

    socket.on('tripStatusUpdate', () => {
      fetchDashboardData();
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
      const [tripsRes, usersRes, vehiclesRes] = await Promise.all([
        api.get('/trips'),
        api.get('/users'),
        api.get('/vehicles')
      ]);
      
      setTrips(tripsRes.data);
      setUsers(usersRes.data);
      setVehicles(vehiclesRes.data);
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

  const handleCreateTrip = async () => {
    try {
      if (!tripForm.startLocation || !tripForm.endLocation) {
        toast.error('Please select pickup and drop locations');
        return;
      }

      const tripData = {
        ...tripForm,
        employees: tripForm.employees.map(emp => ({
          employeeId: emp.employeeId,
          pickupLocation: tripForm.startLocation,
          dropLocation: tripForm.endLocation,
          status: 'Pending'
        }))
      };

      if (editMode && selectedTrip) {
        await api.put(`/trips/${selectedTrip._id}`, tripData);
        toast.success('Trip updated successfully');
      } else {
        await api.post('/trips', tripData);
        toast.success('Trip created successfully');
      }
      
      setShowTripModal(false);
      resetTripForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to save trip');
    }
  };

  const handleCreateUser = async () => {
    try {
      if (editMode && selectedUser) {
        const updateData = { ...userForm };
        if (!updateData.password) delete updateData.password;
        await api.put(`/users/${selectedUser._id}`, updateData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', userForm);
        toast.success('User created successfully');
      }
      
      setShowUserModal(false);
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to save user');
    }
  };

  const handleCreateVehicle = async () => {
    try {
      if (editMode && selectedVehicle) {
        await api.put(`/vehicles/${selectedVehicle._id}`, vehicleForm);
        toast.success('Vehicle updated successfully');
      } else {
        await api.post('/vehicles', vehicleForm);
        toast.success('Vehicle created successfully');
      }
      
      setShowVehicleModal(false);
      resetVehicleForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to save vehicle');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await api.delete(`/trips/${tripId}`);
        toast.success('Trip deleted successfully');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete trip');
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/users/${userId}`);
        toast.success('User deleted successfully');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await api.delete(`/vehicles/${vehicleId}`);
        toast.success('Vehicle deleted successfully');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete vehicle');
      }
    }
  };

  const resetTripForm = () => {
    setTripForm({
      tripName: '',
      scheduledDate: '',
      scheduledStartTime: '',
      scheduledEndTime: '',
      driverId: '',
      vehicleId: '',
      employees: [],
      startLocation: null,
      endLocation: null,
      notes: ''
    });
    setEditMode(false);
    setSelectedTrip(null);
  };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      assignedVehicle: ''
    });
    setEditMode(false);
    setSelectedUser(null);
  };

  const resetVehicleForm = () => {
    setVehicleForm({
      name: '',
      numberPlate: '',
      capacity: '',
      driverId: '',
      status: 'active',
      specifications: {
        make: '',
        model: '',
        year: '',
        fuelType: 'petrol',
        mileage: ''
      }
    });
    setEditMode(false);
    setSelectedVehicle(null);
  };

  const openEditTrip = (trip) => {
    setSelectedTrip(trip);
    setTripForm({
      tripName: trip.tripName,
      scheduledDate: trip.scheduledDate.split('T')[0],
      scheduledStartTime: trip.scheduledStartTime,
      scheduledEndTime: trip.scheduledEndTime,
      driverId: trip.driverId?._id || '',
      vehicleId: trip.vehicleId?._id || '',
      employees: trip.employees || [],
      startLocation: trip.startLocation,
      endLocation: trip.endLocation,
      notes: trip.notes || ''
    });
    setEditMode(true);
    setShowTripModal(true);
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      assignedVehicle: user.assignedVehicle?._id || ''
    });
    setEditMode(true);
    setShowUserModal(true);
  };

  const openEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleForm({
      name: vehicle.name,
      numberPlate: vehicle.numberPlate,
      capacity: vehicle.capacity,
      driverId: vehicle.driverId?._id || '',
      status: vehicle.status,
      specifications: vehicle.specifications || {
        make: '',
        model: '',
        year: '',
        fuelType: 'petrol',
        mileage: ''
      }
    });
    setEditMode(true);
    setShowVehicleModal(true);
  };

  const stats = {
    totalTrips: trips.length,
    liveTrips: liveTrips.length,
    totalUsers: users.length,
    totalVehicles: vehicles.length,
    completedTrips: trips.filter(t => t.status === 'Completed').length,
    scheduledTrips: trips.filter(t => t.status === 'Scheduled').length
  };

  // Chart data
  const tripStatusData = {
    labels: ['Completed', 'In Progress', 'Scheduled', 'Cancelled'],
    datasets: [{
      data: [
        trips.filter(t => t.status === 'Completed').length,
        trips.filter(t => t.status === 'In Progress').length,
        trips.filter(t => t.status === 'Scheduled').length,
        trips.filter(t => t.status === 'Cancelled').length
      ],
      backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
      borderWidth: 0
    }]
  };

  const monthlyTripsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Trips',
      data: [12, 19, 8, 15, 22, 18],
      backgroundColor: '#FCD34D',
      borderColor: '#F59E0B',
      borderWidth: 2
    }]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
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
        userRole="travel-admin"
        onClose={() => {
          setShowNavigationScreen(false);
          setSelectedTrip(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Travel Admin" />
      
      <div className="p-4 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <MobileCard className="text-center">
                <Route className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
                <p className="text-sm text-gray-600">Total Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <div className="relative">
                  <MapPin className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  {stats.liveTrips > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.liveTrips}</p>
                <p className="text-sm text-gray-600">Live Trips</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Users className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Car className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalVehicles}</p>
                <p className="text-sm text-gray-600">Vehicles</p>
              </MobileCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MobileCard>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Status</h3>
                <div className="h-48">
                  <Pie data={tripStatusData} options={{ maintainAspectRatio: false }} />
                </div>
              </MobileCard>
              
              <MobileCard>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
                <div className="h-48">
                  <Bar data={monthlyTripsData} options={{ maintainAspectRatio: false }} />
                </div>
              </MobileCard>
            </div>

            {/* Live Trips */}
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
                  {liveTrips.slice(0, 3).map((trip) => (
                    <div key={trip._id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
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
                        size="sm"
                        fullWidth
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
                  onClick={() => setShowTripModal(true)}
                  icon={Plus}
                  fullWidth
                >
                  New Trip
                </MobileButton>
                <MobileButton
                  onClick={() => setShowUserModal(true)}
                  variant="secondary"
                  icon={Plus}
                  fullWidth
                >
                  Add User
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
                onClick={() => setShowTripModal(true)}
                size="md"
                icon={Plus}
              >
                New Trip
              </MobileButton>
            </div>

            <div className="space-y-4">
              {trips.map((trip) => (
                <MobileCard key={trip._id} hover>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-gray-900">{trip.tripName}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      trip.status === 'Completed' 
                        ? 'bg-green-50 text-green-800 border-green-200' 
                        : trip.status === 'In Progress'
                        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                        : trip.status === 'Started'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
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
                  
                  <div className="flex flex-wrap gap-2">
                    <MobileButton
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowTripDetails(true);
                      }}
                      size="xs"
                      variant="outline"
                      icon={Eye}
                    >
                      View
                    </MobileButton>
                    
                    <MobileButton
                      onClick={() => openEditTrip(trip)}
                      size="xs"
                      variant="secondary"
                      icon={Edit}
                    >
                      Edit
                    </MobileButton>
                    
                    {(trip.status === 'Started' || trip.status === 'In Progress') && (
                      <MobileButton
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowNavigationScreen(true);
                        }}
                        size="xs"
                        icon={Navigation}
                      >
                        Track
                      </MobileButton>
                    )}
                    
                    <MobileButton
                      onClick={() => handleDeleteTrip(trip._id)}
                      size="xs"
                      variant="danger"
                      icon={Trash2}
                    >
                      Delete
                    </MobileButton>
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
              <MobileButton
                onClick={() => setShowUserModal(true)}
                size="md"
                icon={Plus}
              >
                Add User
              </MobileButton>
            </div>

            <div className="space-y-4">
              {users.map((user) => (
                <MobileCard key={user._id} hover>
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{user.name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                        user.role === 'driver' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'travel-admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'company-admin' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <MobileButton
                      onClick={() => openEditUser(user)}
                      size="xs"
                      variant="secondary"
                      icon={Edit}
                    >
                      Edit
                    </MobileButton>
                    
                    <MobileButton
                      onClick={() => handleDeleteUser(user._id)}
                      size="xs"
                      variant="danger"
                      icon={Trash2}
                    >
                      Delete
                    </MobileButton>
                  </div>
                </MobileCard>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Fleet Management</h2>
              <MobileButton
                onClick={() => setShowVehicleModal(true)}
                size="md"
                icon={Plus}
              >
                Add Vehicle
              </MobileButton>
            </div>

            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <MobileCard key={vehicle._id} hover>
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Car className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{vehicle.name}</h4>
                      <p className="text-sm text-gray-600">{vehicle.numberPlate}</p>
                      <p className="text-xs text-gray-500">{vehicle.capacity} seats</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      vehicle.status === 'active' ? 'bg-green-50 text-green-800 border-green-200' : 
                      'bg-yellow-50 text-yellow-800 border-yellow-200'
                    }`}>
                      {vehicle.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <span className="font-medium ml-2 text-gray-900">{vehicle.driverId?.name || 'Not assigned'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fuel:</span>
                      <span className="font-medium ml-2 text-gray-900">{vehicle.specifications?.fuelType || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <MobileButton
                      onClick={() => openEditVehicle(vehicle)}
                      size="xs"
                      variant="secondary"
                      icon={Edit}
                    >
                      Edit
                    </MobileButton>
                    
                    <MobileButton
                      onClick={() => handleDeleteVehicle(vehicle._id)}
                      size="xs"
                      variant="danger"
                      icon={Trash2}
                    >
                      Delete
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
                <span className="text-sm font-medium">{liveTrips.length} Live</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {liveTrips.map((trip) => (
                <MobileCard key={trip._id} hover>
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
                  
                  <div className="flex flex-wrap gap-2">
                    <MobileButton
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowNavigationScreen(true);
                      }}
                      icon={Navigation}
                      size="sm"
                      fullWidth
                    >
                      Track Live
                    </MobileButton>
                  </div>
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
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole="travel-admin" 
      />

      {/* Trip Modal */}
      <Modal
        isOpen={showTripModal}
        onClose={() => {
          setShowTripModal(false);
          resetTripForm();
        }}
        title={editMode ? "Edit Trip" : "Create New Trip"}
        size="full"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trip Name</label>
            <input
              type="text"
              value={tripForm.tripName}
              onChange={(e) => setTripForm({...tripForm, tripName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Enter trip name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={tripForm.scheduledDate}
                onChange={(e) => setTripForm({...tripForm, scheduledDate: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={tripForm.scheduledStartTime}
                onChange={(e) => setTripForm({...tripForm, scheduledStartTime: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={tripForm.scheduledEndTime}
              onChange={(e) => setTripForm({...tripForm, scheduledEndTime: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
              <select
                value={tripForm.driverId}
                onChange={(e) => setTripForm({...tripForm, driverId: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="">Select Driver</option>
                {users.filter(u => u.role === 'driver').map(driver => (
                  <option key={driver._id} value={driver._id}>{driver.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
              <select
                value={tripForm.vehicleId}
                onChange={(e) => setTripForm({...tripForm, vehicleId: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle._id} value={vehicle._id}>{vehicle.name} ({vehicle.numberPlate})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
            <LocationInput
              onLocationSelect={(location) => setTripForm({...tripForm, startLocation: location})}
              placeholder="Search pickup location"
              value={tripForm.startLocation?.address || ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Drop Location</label>
            <LocationInput
              onLocationSelect={(location) => setTripForm({...tripForm, endLocation: location})}
              placeholder="Search drop location"
              value={tripForm.endLocation?.address || ''}
            />
          </div>

          {tripForm.startLocation && tripForm.endLocation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Route Preview</label>
              <MapPreview
                pickupLocation={tripForm.startLocation}
                dropLocation={tripForm.endLocation}
                height="200px"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employees</label>
            <select
              multiple
              value={tripForm.employees.map(emp => emp.employeeId)}
              onChange={(e) => {
                const selectedEmployees = Array.from(e.target.selectedOptions).map(option => ({
                  employeeId: option.value
                }));
                setTripForm({...tripForm, employees: selectedEmployees});
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent min-h-[120px]"
            >
              {users.filter(u => u.role === 'employee').map(employee => (
                <option key={employee._id} value={employee._id}>{employee.name}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple employees</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={tripForm.notes}
              onChange={(e) => setTripForm({...tripForm, notes: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <MobileButton
              onClick={() => {
                setShowTripModal(false);
                resetTripForm();
              }}
              variant="outline"
              fullWidth
            >
              Cancel
            </MobileButton>
            <MobileButton
              onClick={handleCreateTrip}
              fullWidth
            >
              {editMode ? 'Update Trip' : 'Create Trip'}
            </MobileButton>
          </div>
        </div>
      </Modal>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          resetUserForm();
        }}
        title={editMode ? "Edit User" : "Add New User"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={userForm.name}
              onChange={(e) => setUserForm({...userForm, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({...userForm, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password {editMode && "(Leave blank to keep current)"}
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({...userForm, password: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder={editMode ? "Enter new password" : "Enter password"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({...userForm, role: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="employee">Employee</option>
              <option value="driver">Driver</option>
              <option value="travel-admin">Travel Admin</option>
              <option value="company-admin">Company Admin</option>
            </select>
          </div>

          {userForm.role === 'driver' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Vehicle</label>
              <select
                value={userForm.assignedVehicle}
                onChange={(e) => setUserForm({...userForm, assignedVehicle: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle._id} value={vehicle._id}>{vehicle.name} ({vehicle.numberPlate})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <MobileButton
              onClick={() => {
                setShowUserModal(false);
                resetUserForm();
              }}
              variant="outline"
              fullWidth
            >
              Cancel
            </MobileButton>
            <MobileButton
              onClick={handleCreateUser}
              fullWidth
            >
              {editMode ? 'Update User' : 'Add User'}
            </MobileButton>
          </div>
        </div>
      </Modal>

      {/* Vehicle Modal */}
      <Modal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          resetVehicleForm();
        }}
        title={editMode ? "Edit Vehicle" : "Add New Vehicle"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Name</label>
            <input
              type="text"
              value={vehicleForm.name}
              onChange={(e) => setVehicleForm({...vehicleForm, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="e.g., Toyota Innova"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number Plate</label>
              <input
                type="text"
                value={vehicleForm.numberPlate}
                onChange={(e) => setVehicleForm({...vehicleForm, numberPlate: e.target.value.toUpperCase()})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="KA05MN1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
              <input
                type="number"
                value={vehicleForm.capacity}
                onChange={(e) => setVehicleForm({...vehicleForm, capacity: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="7"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
              <select
                value={vehicleForm.driverId}
                onChange={(e) => setVehicleForm({...vehicleForm, driverId: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="">Select Driver</option>
                {users.filter(u => u.role === 'driver').map(driver => (
                  <option key={driver._id} value={driver._id}>{driver.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={vehicleForm.status}
                onChange={(e) => setVehicleForm({...vehicleForm, status: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
              <input
                type="text"
                value={vehicleForm.specifications.make}
                onChange={(e) => setVehicleForm({
                  ...vehicleForm, 
                  specifications: {...vehicleForm.specifications, make: e.target.value}
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Toyota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <input
                type="text"
                value={vehicleForm.specifications.model}
                onChange={(e) => setVehicleForm({
                  ...vehicleForm, 
                  specifications: {...vehicleForm.specifications, model: e.target.value}
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Innova"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <input
                type="number"
                value={vehicleForm.specifications.year}
                onChange={(e) => setVehicleForm({
                  ...vehicleForm, 
                  specifications: {...vehicleForm.specifications, year: e.target.value}
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="2022"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
              <select
                value={vehicleForm.specifications.fuelType}
                onChange={(e) => setVehicleForm({
                  ...vehicleForm, 
                  specifications: {...vehicleForm.specifications, fuelType: e.target.value}
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mileage</label>
              <input
                type="number"
                value={vehicleForm.specifications.mileage}
                onChange={(e) => setVehicleForm({
                  ...vehicleForm, 
                  specifications: {...vehicleForm.specifications, mileage: e.target.value}
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="15"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <MobileButton
              onClick={() => {
                setShowVehicleModal(false);
                resetVehicleForm();
              }}
              variant="outline"
              fullWidth
            >
              Cancel
            </MobileButton>
            <MobileButton
              onClick={handleCreateVehicle}
              fullWidth
            >
              {editMode ? 'Update Vehicle' : 'Add Vehicle'}
            </MobileButton>
          </div>
        </div>
      </Modal>

      {/* Trip Details Modal */}
      <Modal
        isOpen={showTripDetails}
        onClose={() => {
          setShowTripDetails(false);
          setSelectedTrip(null);
        }}
        title="Trip Details"
        size="full"
      >
        {selectedTrip && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedTrip.tripName}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium ml-2">{new Date(selectedTrip.scheduledDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium ml-2">{selectedTrip.scheduledStartTime} - {selectedTrip.scheduledEndTime}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTrip.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    selectedTrip.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedTrip.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium ml-2">{selectedTrip.totalDistance || 0} km</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Driver & Vehicle</h4>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Driver</p>
                    <p className="font-medium">{selectedTrip.driverId?.name || 'Not assigned'}</p>
                    <p className="text-sm text-gray-500">{selectedTrip.driverId?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehicle</p>
                    <p className="font-medium">{selectedTrip.vehicleId?.name || 'Not assigned'}</p>
                    <p className="text-sm text-gray-500">{selectedTrip.vehicleId?.numberPlate}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Employees ({selectedTrip.employees?.length || 0})</h4>
              <div className="space-y-3">
                {selectedTrip.employees?.map((emp, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{emp.employeeId?.name}</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === 'Dropped' ? 'bg-green-100 text-green-800' :
                        emp.status === 'Picked' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {emp.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Pickup:</span>
                        <span className="ml-2">{emp.pickupLocation?.address || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Drop:</span>
                        <span className="ml-2">{emp.dropLocation?.address || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTrip.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700">{selectedTrip.notes}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <MobileButton
                onClick={() => openEditTrip(selectedTrip)}
                variant="secondary"
                icon={Edit}
                fullWidth
              >
                Edit Trip
              </MobileButton>
              {(selectedTrip.status === 'Started' || selectedTrip.status === 'In Progress') && (
                <MobileButton
                  onClick={() => {
                    setShowTripDetails(false);
                    setShowNavigationScreen(true);
                  }}
                  icon={Navigation}
                  fullWidth
                >
                  Track Live
                </MobileButton>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TravelAdminDashboard;