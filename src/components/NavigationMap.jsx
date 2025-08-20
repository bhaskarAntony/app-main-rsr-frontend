import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Navigation, Phone, MessageCircle, X, MapPin, Clock, Route as RouteIcon } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE';

function NavigationMap({ 
  trip, 
  currentLocation, 
  onClose, 
  userRole = 'driver',
  onLocationUpdate,
  onStatusUpdate 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routeInfo, setRouteInfo] = useState({
    totalDistance: 0,
    remainingDistance: 0,
    estimatedTime: 0,
    completedDistance: 0
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (map && trip && currentLocation) {
      updateMapWithTrip();
      updateLocationName();
    }
  }, [map, trip, currentLocation]);

  const initializeMap = async () => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    try {
      await loader.load();
      
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: currentLocation || { lat: 12.9716, lng: 77.5946 },
        zoom: 15,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      const directionsServiceInstance = new google.maps.DirectionsService();
      const directionsRendererInstance = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 6,
          strokeOpacity: 0.8
        }
      });

      directionsRendererInstance.setMap(mapInstance);
      
      setMap(mapInstance);
      setDirectionsService(directionsServiceInstance);
      setDirectionsRenderer(directionsRendererInstance);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  };

  const updateLocationName = async () => {
    if (!currentLocation) return;
    
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({
        location: currentLocation
      });
      
      if (result.results[0]) {
        setLocationName(result.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
  };

  const updateMapWithTrip = () => {
    if (!map || !trip || !currentLocation) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers = [];

    // Add driver marker (car icon)
    const driverMarker = new google.maps.Marker({
      position: currentLocation,
      map: map,
      title: 'Driver Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%232563eb"%3E%3Cpath d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/%3E%3C/svg%3E',
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      }
    });
    newMarkers.push(driverMarker);

    // Add pickup markers
    trip.employees.forEach((emp, index) => {
      if (emp.pickupLocation) {
        const isCompleted = emp.status === 'Picked' || emp.status === 'Dropped';
        const marker = new google.maps.Marker({
          position: emp.pickupLocation,
          map: map,
          title: `Pickup: ${emp.employeeId?.name}`,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${isCompleted ? '%2310b981' : '%23f59e0b'}"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        });

        // Add info window for pickup points
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${emp.employeeId?.name}</h3>
              <p class="text-sm text-gray-600">Pickup Point</p>
              <p class="text-xs">${emp.pickupLocation.address}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full ${
                isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }">${emp.status}</span>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }
    });

    // Add drop markers
    trip.employees.forEach((emp, index) => {
      if (emp.dropLocation) {
        const isCompleted = emp.status === 'Dropped';
        const marker = new google.maps.Marker({
          position: emp.dropLocation,
          map: map,
          title: `Drop: ${emp.employeeId?.name}`,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${isCompleted ? '%2310b981' : '%23ef4444'}"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${emp.employeeId?.name}</h3>
              <p class="text-sm text-gray-600">Drop Point</p>
              <p class="text-xs">${emp.dropLocation.address}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full ${
                isCompleted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }">${emp.status}</span>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);
    calculateRoute();
  };

  const calculateRoute = () => {
    if (!directionsService || !directionsRenderer || !trip || !currentLocation) return;

    // Create waypoints for pickup and drop locations
    const waypoints = [];
    
    // Add pending pickup points
    trip.employees.forEach(emp => {
      if (emp.status === 'Pending' && emp.pickupLocation) {
        waypoints.push({
          location: emp.pickupLocation,
          stopover: true
        });
      }
    });

    // Add drop points for picked employees
    trip.employees.forEach(emp => {
      if (emp.status === 'Picked' && emp.dropLocation) {
        waypoints.push({
          location: emp.dropLocation,
          stopover: true
        });
      }
    });

    if (waypoints.length === 0) return;

    const request = {
      origin: currentLocation,
      destination: waypoints[waypoints.length - 1].location,
      waypoints: waypoints.slice(0, -1),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        // Update polyline colors based on completion
        const route = result.routes[0];
        let totalDistance = 0;
        let completedDistance = 0;

        route.legs.forEach((leg, index) => {
          totalDistance += leg.distance.value;
          // Mark completed segments as green
          if (index < currentStep) {
            completedDistance += leg.distance.value;
          }
        });

        setRouteInfo({
          totalDistance: totalDistance / 1000, // Convert to km
          remainingDistance: (totalDistance - completedDistance) / 1000,
          completedDistance: completedDistance / 1000,
          estimatedTime: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60 // Convert to minutes
        });

        // Custom polyline rendering for completed vs remaining route
        directionsRenderer.setDirections(result);
        
        // Update polyline color based on progress
        const polylineOptions = {
          strokeColor: currentStep > 0 ? '#10b981' : '#2563eb',
          strokeWeight: 6,
          strokeOpacity: 0.8
        };
        
        directionsRenderer.setOptions({
          polylineOptions: polylineOptions
        });
      }
    });
  };

  const handleEmployeeAction = async (employeeId, action) => {
    try {
      if (onStatusUpdate) {
        await onStatusUpdate(trip._id, employeeId, action);
        setCurrentStep(prev => prev + 1);
        calculateRoute(); // Recalculate route after status update
      }
    } catch (error) {
      console.error('Error updating employee status:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-lg">{trip.tripName}</h2>
            <p className="text-sm text-gray-600">
              {routeInfo.remainingDistance.toFixed(1)} km remaining
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-sm font-medium">{Math.round(routeInfo.estimatedTime)} min</p>
            <p className="text-xs text-gray-600">ETA</p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Current Location Info */}
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Current Location</p>
              <p className="text-xs text-gray-600 truncate">{locationName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {currentLocation?.lat.toFixed(6)}, {currentLocation?.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Trip Progress */}
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{routeInfo.totalDistance.toFixed(1)}</p>
              <p className="text-xs text-gray-600">Total KM</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{routeInfo.completedDistance.toFixed(1)}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">{routeInfo.remainingDistance.toFixed(1)}</p>
              <p className="text-xs text-gray-600">Remaining</p>
            </div>
          </div>

          {/* Employee Actions for Driver */}
          {userRole === 'driver' && (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {trip.employees.map((emp, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">{emp.employeeId?.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.employeeId?.name}</p>
                      <p className="text-xs text-gray-600">{emp.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Phone className="w-4 h-4" />
                    </button>
                    {emp.status === 'Pending' && (
                      <button
                        onClick={() => handleEmployeeAction(emp.employeeId._id, 'pickup')}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Pickup
                      </button>
                    )}
                    {emp.status === 'Picked' && (
                      <button
                        onClick={() => handleEmployeeAction(emp.employeeId._id, 'drop')}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Drop
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Employee View */}
          {userRole === 'employee' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Driver Details</span>
                <div className="flex space-x-2">
                  <button className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>{trip.driverId?.name} • {trip.vehicleId?.numberPlate}</p>
                <p>{trip.vehicleId?.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NavigationMap;