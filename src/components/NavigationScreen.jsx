import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { X, Phone, MessageCircle, Navigation, MapPin, Clock, User, Car, Route as RouteIcon, RotateCcw } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE';

function NavigationScreen({ 
  trip, 
  currentLocation, 
  onClose, 
  userRole = 'driver',
  onPickupEmployee,
  onDropEmployee,
  onCompleteTrip
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
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [trafficLayer, setTrafficLayer] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [spokenSteps, setSpokenSteps] = useState(new Set());
  const [maneuver, setManeuver] = useState(null);

  useEffect(() => {
    initializeMap();
    startLocationWatching();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    if (map && trip && currentLocation) {
      updateMapWithTrip();
      updateLocationName();
      recenterMap();
      updateCurrentStep();
    }
  }, [map, trip, currentLocation]);

  useEffect(() => {
    if (navigationSteps.length > 0 && currentStepIndex < navigationSteps.length) {
      const nextStep = navigationSteps[currentStepIndex];
      setManeuver(nextStep.maneuver || null);
      if (nextStep.instruction && !spokenSteps.has(currentStepIndex) && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`${nextStep.instruction}. In ${nextStep.distance}.`);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
        setSpokenSteps(prev => new Set([...prev, currentStepIndex]));
      }
    }
  }, [currentStepIndex, navigationSteps]);

  const startLocationWatching = () => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setHeading(position.coords.heading || 0);
          setSpeed((position.coords.speed || 0) * 3.6); // m/s to km/h
          // Assuming currentLocation prop is updated externally
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      setWatchId(id);
    }
  };

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
        zoom: 17,
        tilt: 60,
        heading: heading,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels.icon',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#4a4a4a' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        gestureHandling: 'greedy',
        mapTypeId: 'roadmap'
      });

      const traffic = new google.maps.TrafficLayer();
      traffic.setMap(mapInstance);
      setTrafficLayer(traffic);

      const directionsServiceInstance = new google.maps.DirectionsService();
      const directionsRendererInstance = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: '#1A73E8',
          strokeWeight: 5,
          strokeOpacity: 1.0
        }
      });

      directionsRendererInstance.setMap(mapInstance);
      
      setMap(mapInstance);
      setDirectionsService(directionsServiceInstance);
      setDirectionsRenderer(directionsRendererInstance);

      // Add transit and bicycle layers
      const bikeLayer = new google.maps.BicyclingLayer();
      bikeLayer.setMap(mapInstance);
      const transitLayer = new google.maps.TransitLayer();
      transitLayer.setMap(mapInstance);

    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  };

  const updateLocationName = async () => {
    if (!currentLocation) return;
    
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: currentLocation });
      if (result.results[0]) {
        setCurrentLocationName(result.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
  };

  const updateMapWithTrip = () => {
    if (!map || !trip || !currentLocation) return;

    markers.forEach(marker => marker.setMap(null));
    const newMarkers = [];

    const driverMarker = new google.maps.Marker({
      position: currentLocation,
      map: map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#1A73E8',
        fillOpacity: 1,
        strokeWeight: 2,
        rotation: heading
      },
      zIndex: 1000
    });
    newMarkers.push(driverMarker);

    let destination;
    if (trip.employees.length > 0) {
      const lastEmp = trip.employees[trip.employees.length - 1];
      destination = lastEmp.status === 'Picked' ? lastEmp.dropLocation : lastEmp.pickupLocation;
      if (destination) {
        const destMarker = new google.maps.Marker({
          position: destination,
          map: map,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(40, 40)
          },
          zIndex: 500
        });
        newMarkers.push(destMarker);
      }
    }

    setMarkers(newMarkers);
    calculateRoute();
  };

  const calculateRoute = () => {
    if (!directionsService || !directionsRenderer || !trip || !currentLocation) return;

    let waypoints = [];
    
    trip.employees.forEach(emp => {
      if (emp.status === 'Pending' && emp.pickupLocation) {
        waypoints.push({
          location: new google.maps.LatLng(emp.pickupLocation.lat, emp.pickupLocation.lng),
          stopover: true
        });
      }
    });

    trip.employees.forEach(emp => {
      if (emp.status === 'Picked' && emp.dropLocation) {
        waypoints.push({
          location: new google.maps.LatLng(emp.dropLocation.lat, emp.dropLocation.lng),
          stopover: true
        });
      }
    });

    if (waypoints.length === 0) {
      return;
    }

    const request = {
      origin: currentLocation,
      destination: waypoints[waypoints.length - 1].location,
      waypoints: waypoints.slice(0, -1),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      provideRouteAlternatives: true,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: 'bestguess'
      },
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: true
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        setAvailableRoutes(result.routes);
        displayRoute(result, selectedRouteIndex);
      } else {
        console.error('Directions request failed:', status);
      }
    });
  };

  const displayRoute = (result, index) => {
    if (!result.routes[index]) return;
    
    directionsRenderer.setDirections(result);
    directionsRenderer.setRouteIndex(index);

    const route = result.routes[index];
    let totalDistance = 0;
    let estimatedTime = 0;

    route.legs.forEach((leg) => {
      totalDistance += leg.distance.value;
      estimatedTime += leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value;
    });

    const steps = [];
    route.legs.forEach(leg => {
      leg.steps.forEach(step => {
        let distValue = parseFloat(step.distance.text);
        if (step.distance.text.includes('km')) distValue *= 1000;
        steps.push({
          instruction: step.instructions.replace(/<[^>]+>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          path: step.path,
          end_location: step.end_location,
          distanceValue: distValue,
          maneuver: step.maneuver // For lane guidance
        });
      });
    });
    setNavigationSteps(steps);

    const completedDistance = calculateCompletedDistance(steps);

    setRouteInfo({
      totalDistance: totalDistance / 1000,
      remainingDistance: (totalDistance - completedDistance) / 1000,
      completedDistance: completedDistance / 1000,
      estimatedTime: estimatedTime / 60
    });

    drawProgressPolyline(route);
  };

  const drawProgressPolyline = (route) => {
    // Clear existing polylines by creating new ones
    let completedPath = [];
    let remainingPath = [];
    let isCompleted = true;

    route.legs.forEach(leg => {
      leg.steps.forEach((step, idx) => {
        if (isCompleted) {
          if (currentStepIndex > navigationSteps.findIndex(s => s.end_location.lat() === step.end_location.lat() && s.end_location.lng() === step.end_location.lng())) {
            completedPath = [...completedPath, ...step.path];
          } else {
            isCompleted = false;
            remainingPath = [...remainingPath, ...step.path];
          }
        } else {
          remainingPath = [...remainingPath, ...step.path];
        }
      });
    });

    new google.maps.Polyline({
      path: completedPath,
      geodesic: true,
      strokeColor: '#808080',
      strokeOpacity: 1.0,
      strokeWeight: 5,
      map: map
    });

    new google.maps.Polyline({
      path: remainingPath,
      geodesic: true,
      strokeColor: '#1A73E8',
      strokeOpacity: 1.0,
      strokeWeight: 5,
      map: map
    });
  };

  const calculateCompletedDistance = (steps) => {
    let completed = 0;
    for (let i = 0; i < currentStepIndex && i < steps.length; i++) {
      completed += steps[i].distanceValue;
    }
    return completed;
  };

  const updateCurrentStep = () => {
    if (!navigationSteps.length || !currentLocation) return;

    let minDistance = Infinity;
    let closestIndex = 0;

    navigationSteps.forEach((step, index) => {
      const isOnPath = google.maps.geometry.poly.isLocationOnEdge(
        new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
        new google.maps.Polyline({ path: step.path }),
        0.0001
      );

      if (isOnPath) {
        closestIndex = index;
        return;
      }

      const distToEnd = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
        step.end_location
      );

      if (distToEnd < minDistance) {
        minDistance = distToEnd;
        closestIndex = index;
      }
    });

    setCurrentStepIndex(closestIndex);
  };

  const handleSelectRoute = (index) => {
    setSelectedRouteIndex(index);
    setSpokenSteps(new Set()); // Reset spoken steps for new route
    displayRoute({ routes: availableRoutes }, index);
  };

  const recenterMap = () => {
    if (map && currentLocation) {
      map.setCenter(currentLocation);
      map.setZoom(17);
      map.setTilt(60);
      map.setHeading(heading);
    }
  };

  const handlePickupEmployee = (employeeId) => {
    if (onPickupEmployee) {
      onPickupEmployee(trip._id, employeeId);
      calculateRoute(); // Recalculate route after pickup
    }
  };

  const handleDropEmployee = (employeeId) => {
    if (onDropEmployee) {
      onDropEmployee(trip._id, employeeId);
      calculateRoute(); // Recalculate route after drop
    }
  };

  const nextStep = navigationSteps[currentStepIndex] || {};

  // Map maneuver to icon
  const getManeuverIcon = (maneuver) => {
    if (!maneuver) return <Navigation className="w-8 h-8 flex-shrink-0" />;
    switch (maneuver) {
      case 'turn-left':
        return <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18H4V13L10 7H14V18H9Z" /></svg>;
      case 'turn-right':
        return <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 18H20V13L14 7H10V18H15Z" /></svg>;
      case 'straight':
        return <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4V20M8 8L12 4L16 8" /></svg>;
      case 'roundabout-right':
      case 'roundabout-left':
        return <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4" /><path d="M12 8V4L16 8" /></svg>;
      default:
        return <Navigation className="w-8 h-8 flex-shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Navigation Header */}
      <div className="bg-blue-700 text-white p-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="text-white">
              <X className="w-6 h-6" />
            </button>
            <div>
              <p className="text-lg font-bold">{Math.round(routeInfo.estimatedTime)} min ({routeInfo.remainingDistance.toFixed(1)} km)</p>
              <p className="text-sm">ETA: {new Date(Date.now() + routeInfo.estimatedTime * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button onClick={recenterMap} className="text-white">
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-blue-800 p-3 rounded-lg">
          <div className="flex items-center space-x-3">
            {getManeuverIcon(maneuver)}
            <div>
              <p className="text-lg font-bold">{nextStep.instruction || 'Proceed to route'}</p>
              <p className="text-sm">{nextStep.distance} • {nextStep.duration}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        {/* Speed and Location Overlay */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 border flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <div>
            <p className="text-xs font-medium">Speed: {Math.round(speed)} km/h</p>
            <p className="text-xs text-gray-600 truncate max-w-xs">{currentLocationName}</p>
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-white border-t p-3 space-y-3">
        {/* Trip Stats */}
        <div className="flex justify-around text-center text-sm">
          <div>
            <p className="font-bold">{routeInfo.totalDistance.toFixed(1)} km</p>
            <p className="text-gray-600">Total</p>
          </div>
          <div>
            <p className="font-bold">{routeInfo.completedDistance.toFixed(1)} km</p>
            <p className="text-gray-600">Completed</p>
          </div>
          <div>
            <p className="font-bold">{routeInfo.remainingDistance.toFixed(1)} km</p>
            <p className="text-gray-600">Remaining</p>
          </div>
          <div>
            <p className="font-bold">{Math.round(speed)} km/h</p>
            <p className="text-gray-600">Speed</p>
          </div>
        </div>

        {/* Alternative Routes */}
        {availableRoutes.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto">
            {availableRoutes.map((route, index) => {
              const totalTime = route.legs.reduce((sum, leg) => sum + (leg.duration_in_traffic?.value || leg.duration.value), 0) / 60;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectRoute(index)}
                  className={`px-3 py-1 rounded-full text-sm ${selectedRouteIndex === index ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                >
                  Route {index + 1}: {Math.round(totalTime)} min
                </button>
              );
            })}
          </div>
        )}

        {/* Employee Actions */}
        {userRole === 'driver' && (
          <div className="space-y-2 max-h-24 overflow-y-auto">
            {trip.employees.map((emp, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium">{emp.employeeId?.name}</p>
                    <p className="text-xs text-gray-600">{emp.status}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button className="p-1 text-green-600">
                    <Phone className="w-4 h-4" />
                  </button>
                  {emp.status === 'Pending' && (
                    <button
                      onClick={() => handlePickupEmployee(emp.employeeId._id)}
                      className="px-2 py-1 bg-green-600 text-white rounded-md text-xs"
                    >
                      Pickup
                    </button>
                  )}
                  {emp.status === 'Picked' && (
                    <button
                      onClick={() => handleDropEmployee(emp.employeeId._id)}
                      className="px-2 py-1 bg-red-600 text-white rounded-md text-xs"
                    >
                      Drop
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Complete Trip */}
        {userRole === 'driver' && trip.employees.every(emp => emp.status === 'Dropped') && (
          <button
            onClick={onCompleteTrip}
            className="w-full bg-green-600 text-white py-2 rounded-md font-medium text-sm"
          >
            Complete Trip
          </button>
        )}

        {/* Employee View */}
        {userRole === 'employee' && (
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Driver: {trip.driverId?.name}</span>
              <div className="flex space-x-2">
                <button className="p-1 text-blue-600">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-1 text-green-600">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-gray-600">{trip.vehicleId?.name} • {trip.vehicleId?.numberPlate}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NavigationScreen;