import React, { useState, useEffect } from 'react';
import MobileHeader from '../components/MobileHeader';
import BottomNavigation from '../components/BottomNavigation';
import MobileCard from '../components/MobileCard';
import MobileButton from '../components/MobileButton';
import LocationInput from '../components/LocationInput';
import MapPreview from '../components/MapPreview';
import NavigationScreen from '../components/NavigationScreen';
import TripReportGenerator from '../components/TripReportGenerator';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Users, 
  Car, 
  Route, 
  Navigation, 
  Edit, 
  Trash2, 
  Eye, 
  Download,
  Calendar,
  User,
  X,
  Save,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function TravelAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showNavigationScreen, setShowNavigationScreen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedTripForReport, setSelectedTripForReport] = useState(null);
  const [driverLocations, setDriverLocations] = useState({});
  const { user } = useAuth();

  const [tripForm, setTripForm] = useState({
    tripName: '',
    scheduledDate: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    driverId: '',
    vehicleId: '',
    employees: [],
    pickupLocation: null,
    dropLocation: null,
    totalDistance: 0
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

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!tripForm.pickupLocation || !tripForm.dropLocation) {
      toast.error('Please select pickup and drop locations');
      return;
    }

    try {
      const tripData = {
        ...tripForm,
        startLocation: tripForm.pickupLocation,
        endLocation: tripForm.dropLocation,
        employees: tripForm.employees.map(empId => ({
          employeeId: empId,
          pickupLocation: tripForm.pickupLocation,
          dropLocation: tripForm.dropLocation,
          status: 'Pending'
        }))
      };

      await api.post('/trips', tripData);
      toast.success('Trip created successfully');
      setShowCreateTrip(false);
      resetTripForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to create trip');
    }
  };

  const handleEditTrip = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/trips/${selectedTrip._id}`, tripForm);
      toast.success('Trip updated successfully');
      setShowEditTrip(false);
      resetTripForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update trip');
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', userForm);
      toast.success('User created successfully');
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...userForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      await api.put(`/users/${selectedUser._id}`, updateData);
      toast.success('User updated successfully');
      setShowEditUser(false);
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update user');
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

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', vehicleForm);
      toast.success('Vehicle created successfully');
      resetVehicleForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to create vehicle');
    }
  };

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/vehicles/${selectedVehicle._id}`, vehicleForm);
      toast.success('Vehicle updated successfully');
      setShowEditVehicle(false);
      resetVehicleForm();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update vehicle');
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
      pickupLocation: null,
      dropLocation: null,
      totalDistance: 0
    });
  };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      assignedVehicle: ''
    });
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
  };

  const openEditTrip = (trip) => {
    setSelectedTrip(trip);
    setTripForm({
      tripName: trip.tripName,
      scheduledDate: trip.scheduledDate.split('T')[0],
      scheduledStartTime: trip.scheduledStartTime,
      scheduledEndTime: trip.scheduledEndTime || '',
      driverId: trip.driverId?._id || '',
      vehicleId: trip.vehicleId?._id || '',
      employees: trip.employees.map(emp => emp.employeeId._id),
      pickupLocation: trip.startLocation,
      dropLocation: trip.endLocation,
      totalDistance: trip.totalDistance || 0
    });
    setShowEditTrip(true);
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
    setShowEditUser(true);
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
    setShowEditVehicle(true);
  };

  const drivers = users.filter(u => u.role === 'driver');
  const employees = users.filter(u => u.role === 'employee');

  const stats = {
    totalTrips: trips.length,
    liveTrips: liveTrips.length,
    totalUsers: users.length,
    totalVehicles: vehicles.length,
    completedTrips: trips.filter(t => t.status === 'Completed').length,
    inProgressTrips: trips.filter(t => t.status === 'In Progress').length
  };

  // Chart data
  const tripStatusData = {
    labels: ['Scheduled', 'Started', 'In Progress', 'Completed', 'Cancelled'],
    datasets: [{
      data: [
        trips.filter(t => t.status === 'Scheduled').length,
        trips.filter(t => t.status === 'Started').length,
        trips.filter(t => t.status === 'In Progress').length,
        trips.filter(t => t.status === 'Completed').length,
        trips.filter(t => t.status === 'Cancelled').length
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#059669', '#EF4444'],
      borderWidth: 0
    }]
  };

  const monthlyTripsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Trips',
      data: [12, 19, 15, 25, 22, 30],
      backgroundColor: '#3B82F6',
      borderRadius: 8
    }]
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
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </MobileCard>
              
              <MobileCard className="text-center">
                <Car className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalVehicles}</p>
                <p className="text-sm text-gray-600">Fleet Size</p>
              </MobileCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4">
              <MobileCard>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Status Distribution</h3>
                <div className="h-64">
                  <Pie data={tripStatusData} options={{ maintainAspectRatio: false }} />
                </div>
              </MobileCard>

              <MobileCard>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trips</h3>
                <div className="h-64">
                  <Bar data={monthlyTripsData} options={{ maintainAspectRatio: false }} />
                </div>
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
                  onClick={() => setShowCreateTrip(true)}
                  icon={Plus}
                  className="w-full"
                >
                  Create Trip
                </MobileButton>
                <MobileButton
                  onClick={() => setActiveTab('users')}
                  variant="secondary"
                  icon={Users}
                  className="w-full"
                >
                  Manage Users
                </MobileButton>
              </div>
            </MobileCard>
          </div>
        )}

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Trip Management</h2>
              <MobileButton
                onClick={() => setShowCreateTrip(true)}
                icon={Plus}
              >
                Create Trip
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
                      <p className="font-medium text-gray-900">{trip.scheduledStartTime} - {trip.scheduledEndTime}</p>
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
                    <MobileButton
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowTripDetails(true);
                      }}
                      size="sm"
                      icon={Eye}
                      className="flex-1"
                    >
                      View Details
                    </MobileButton>
                    <MobileButton
                      onClick={() => openEditTrip(trip)}
                      variant="secondary"
                      size="sm"
                      icon={Edit}
                      className="flex-1"
                    >
                      Edit
                    </MobileButton>
                    {trip.status === 'Completed' && (
                      <MobileButton
                        onClick={() => {
                          setSelectedTripForReport(trip);
                          setShowReportModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        icon={Download}
                        className="flex-1"
                      >
                        Report
                      </MobileButton>
                    )}
                    <MobileButton
                      onClick={() => handleDeleteTrip(trip._id)}
                      variant="danger"
                      size="sm"
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
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            </div>

            {/* Create User Form */}
            <MobileCard>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="driver">Driver</option>
                    <option value="travel-admin">Travel Admin</option>
                  </select>
                </div>
                {userForm.role === 'driver' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Vehicle</label>
                    <select
                      value={userForm.assignedVehicle}
                      onChange={(e) => setUserForm({...userForm, assignedVehicle: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.filter(v => !v.driverId).map(vehicle => (
                        <option key={vehicle._id} value={vehicle._id}>
                          {vehicle.name} ({vehicle.numberPlate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <MobileButton type="submit" icon={Save} className="w-full">
                  Create User
                </MobileButton>
              </form>
            </MobileCard>

            {/* Users List */}
            <div className="space-y-4">
              {users.map((user) => (
                <MobileCard key={user._id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      user.role === 'driver' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      user.role === 'travel-admin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                      'bg-gray-50 text-gray-800 border-gray-200'
                    }`}>
                      {user.role.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <MobileButton
                      onClick={() => openEditUser(user)}
                      size="sm"
                      icon={Edit}
                      className="flex-1"
                    >
                      Edit
                    </MobileButton>
                    <MobileButton
                      onClick={() => handleDeleteUser(user._id)}
                      variant="danger"
                      size="sm"
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
            </div>

            {/* Create Vehicle Form */}
            <MobileCard>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Vehicle</h3>
              <form onSubmit={handleCreateVehicle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Name</label>
                  <input
                    type="text"
                    value={vehicleForm.name}
                    onChange={(e) => setVehicleForm({...vehicleForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number Plate</label>
                  <input
                    type="text"
                    value={vehicleForm.numberPlate}
                    onChange={(e) => setVehicleForm({...vehicleForm, numberPlate: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({...vehicleForm, capacity: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Driver</label>
                  <select
                    value={vehicleForm.driverId}
                    onChange={(e) => setVehicleForm({...vehicleForm, driverId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Driver</option>
                    {drivers.filter(d => !d.assignedVehicle).map(driver => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
                <MobileButton type="submit" icon={Save} className="w-full">
                  Add Vehicle
                </MobileButton>
              </form>
            </MobileCard>

            {/* Vehicles List */}
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <MobileCard key={vehicle._id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Car className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{vehicle.name}</h4>
                        <p className="text-sm text-gray-600">{vehicle.numberPlate}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      vehicle.status === 'active' ? 'bg-green-50 text-green-800 border-green-200' :
                      vehicle.status === 'maintenance' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                      'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {vehicle.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium ml-2 text-gray-900">{vehicle.capacity} seats</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <span className="font-medium ml-2 text-gray-900">{vehicle.driverId?.name || 'Not assigned'}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <MobileButton
                      onClick={() => openEditVehicle(vehicle)}
                      size="sm"
                      icon={Edit}
                      className="flex-1"
                    >
                      Edit
                    </MobileButton>
                    <MobileButton
                      onClick={() => handleDeleteVehicle(vehicle._id)}
                      variant="danger"
                      size="sm"
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
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole="travel-admin" 
      />

      {/* Create Trip Modal */}
      {showCreateTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Trip</h2>
                <button
                  onClick={() => {
                    setShowCreateTrip(false);
                    resetTripForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trip Name</label>
                  <input
                    type="text"
                    value={tripForm.tripName}
                    onChange={(e) => setTripForm({...tripForm, tripName: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={tripForm.scheduledDate}
                      onChange={(e) => setTripForm({...tripForm, scheduledDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={tripForm.scheduledStartTime}
                      onChange={(e) => setTripForm({...tripForm, scheduledStartTime: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={tripForm.scheduledEndTime}
                    onChange={(e) => setTripForm({...tripForm, scheduledEndTime: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
                  <LocationInput
                    onLocationSelect={(location) => setTripForm({...tripForm, pickupLocation: location})}
                    placeholder="Search pickup location..."
                  />
                  {tripForm.pickupLocation && (
                    <p className="text-sm text-green-600 mt-1">✓ {tripForm.pickupLocation.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Drop Location</label>
                  <LocationInput
                    onLocationSelect={(location) => setTripForm({...tripForm, dropLocation: location})}
                    placeholder="Search drop location..."
                  />
                  {tripForm.dropLocation && (
                    <p className="text-sm text-green-600 mt-1">✓ {tripForm.dropLocation.address}</p>
                  )}
                </div>

                {tripForm.pickupLocation && tripForm.dropLocation && (
                  <div>
                    <MapPreview
                      pickupLocation={tripForm.pickupLocation}
                      dropLocation={tripForm.dropLocation}
                      height="200px"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
                  <select
                    value={tripForm.driverId}
                    onChange={(e) => setTripForm({...tripForm, driverId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(driver => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                  <select
                    value={tripForm.vehicleId}
                    onChange={(e) => setTripForm({...tripForm, vehicleId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => v.status === 'active').map(vehicle => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.name} ({vehicle.numberPlate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employees</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {employees.map(employee => (
                      <label key={employee._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={tripForm.employees.includes(employee._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTripForm({...tripForm, employees: [...tripForm.employees, employee._id]});
                            } else {
                              setTripForm({...tripForm, employees: tripForm.employees.filter(id => id !== employee._id)});
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{employee.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTrip(false);
                      resetTripForm();
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <MobileButton type="submit" className="flex-1">
                    Create Trip
                  </MobileButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {showEditTrip && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Trip</h2>
                <button
                  onClick={() => {
                    setShowEditTrip(false);
                    resetTripForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trip Name</label>
                  <input
                    type="text"
                    value={tripForm.tripName}
                    onChange={(e) => setTripForm({...tripForm, tripName: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={tripForm.scheduledDate}
                      onChange={(e) => setTripForm({...tripForm, scheduledDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={tripForm.scheduledStartTime}
                      onChange={(e) => setTripForm({...tripForm, scheduledStartTime: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={tripForm.scheduledEndTime}
                    onChange={(e) => setTripForm({...tripForm, scheduledEndTime: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
                  <select
                    value={tripForm.driverId}
                    onChange={(e) => setTripForm({...tripForm, driverId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(driver => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                  <select
                    value={tripForm.vehicleId}
                    onChange={(e) => setTripForm({...tripForm, vehicleId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.filter(v => v.status === 'active').map(vehicle => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.name} ({vehicle.numberPlate})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTrip(false);
                      resetTripForm();
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <MobileButton type="submit" className="flex-1">
                    Update Trip
                  </MobileButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                <button
                  onClick={() => {
                    setShowEditUser(false);
                    resetUserForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="driver">Driver</option>
                    <option value="travel-admin">Travel Admin</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUser(false);
                      resetUserForm();
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <MobileButton type="submit" className="flex-1">
                    Update User
                  </MobileButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditVehicle && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Vehicle</h2>
                <button
                  onClick={() => {
                    setShowEditVehicle(false);
                    resetVehicleForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditVehicle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Name</label>
                  <input
                    type="text"
                    value={vehicleForm.name}
                    onChange={(e) => setVehicleForm({...vehicleForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number Plate</label>
                  <input
                    type="text"
                    value={vehicleForm.numberPlate}
                    onChange={(e) => setVehicleForm({...vehicleForm, numberPlate: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({...vehicleForm, capacity: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({...vehicleForm, status: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditVehicle(false);
                      resetVehicleForm();
                    }}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <MobileButton type="submit" className="flex-1">
                    Update Vehicle
                  </MobileButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details Modal */}
      {showTripDetails && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
                <button
                  onClick={() => setShowTripDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedTrip.tripName}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    selectedTrip.status === 'Completed' 
                      ? 'bg-green-50 text-green-800 border-green-200' 
                      : selectedTrip.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-gray-50 text-gray-800 border-gray-200'
                  }`}>
                    {selectedTrip.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">{new Date(selectedTrip.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Time</p>
                    <p className="font-medium text-gray-900">{selectedTrip.scheduledStartTime} - {selectedTrip.scheduledEndTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Driver</p>
                    <p className="font-medium text-gray-900">{selectedTrip.driverId?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Vehicle</p>
                    <p className="font-medium text-gray-900">{selectedTrip.vehicleId?.numberPlate}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Employees ({selectedTrip.employees.length})</h4>
                  <div className="space-y-2">
                    {selectedTrip.employees.map((emp, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{emp.employeeId?.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            emp.status === 'Dropped' ? 'bg-green-50 text-green-800 border-green-200' :
                            emp.status === 'Picked' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            'bg-gray-50 text-gray-800 border-gray-200'
                          }`}>
                            {emp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowTripDetails(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {selectedTrip.status === 'Completed' && (
                    <MobileButton
                      onClick={() => {
                        setSelectedTripForReport(selectedTrip);
                        setShowReportModal(true);
                        setShowTripDetails(false);
                      }}
                      icon={Download}
                      className="flex-1"
                    >
                      Download Report
                    </MobileButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default TravelAdminDashboard;