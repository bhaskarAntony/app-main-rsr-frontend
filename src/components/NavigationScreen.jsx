import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { X, Phone, MessageCircle, Navigation, MapPin, Clock, User, Car, Route as RouteIcon, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE';

function NavigationScreen({ 
  trip,
  trips = [],
  currentLocation, 
  onClose, 
  userRole = 'driver',
  onPickupEmployee,
  onDropEmployee,
  onCompleteTrip
}) {
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
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
  const [speedLimit, setSpeedLimit] = useState(null);
  const [snappedLocation, setSnappedLocation] = useState(null);
  const [prevLocation, setPrevLocation] = useState(null);

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
    if (map && heading) {
      map.setHeading(heading);
    }
  }, [map, heading]);

  useEffect(() => {
    if (map && (trip || trips) && (currentLocation || userRole === 'admin')) {
      updateMapWithTrip();
      updateLocationName();
      recenterMap();
      updateCurrentStep();
    }
  }, [map, trip, trips, currentLocation, snappedLocation, userRole]);

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

  useEffect(() => {
    if (!currentLocation || userRole === 'admin') return;

    const fetchRoadsData = async () => {
      try {
        const path = `${currentLocation.lat},${currentLocation.lng}`;
        const response = await fetch(
          `https://roads.googleapis.com/v1/speedLimits?path=${path}&key=${GOOGLE_MAPS_API_KEY}&units=KPH`
        );
        const data = await response.json();

        if (data.speedLimits && data.speedLimits[0]) {
          setSpeedLimit(data.speedLimits[0].speedLimit);
        }

        if (data.snappedPoints && data.snappedPoints[0]) {
          const snapped = data.snappedPoints[0].location;
          setSnappedLocation({ lat: snapped.latitude, lng: snapped.longitude });
        }
      } catch (error) {
        console.error('Error fetching Roads API data:', error);
      }
    };

    fetchRoadsData();
  }, [currentLocation, userRole]);

  const startLocationWatching = () => {
    if (navigator.geolocation && userRole !== 'admin') {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setHeading(position.coords.heading || 0);
          setSpeed((position.coords.speed || 0) * 3.6); // m/s to km/h
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
        center: { lat: 12.9716, lng: 77.5946 },
        zoom: userRole === 'admin' ? 5 : 17,
        tilt: userRole === 'admin' ? 0 : 60,
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

      // Add transit and bicycle layers for enhanced navigation
      const bikeLayer = new google.maps.BicyclingLayer();
      bikeLayer.setMap(mapInstance);
      const transitLayer = new google.maps.TransitLayer();
      transitLayer.setMap(mapInstance);

    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  };

  const updateLocationName = async () => {
    const loc = snappedLocation || currentLocation;
    if (!loc || userRole === 'admin') return;
    
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: loc });
      if (result.results[0]) {
        setCurrentLocationName(result.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
  };

  const animateMarker = (marker, startPos, endPos) => {
    const duration = 1000; // ms
    const startTime = performance.now();

    const animate = (time) => {
      let progress = (time - startTime) / duration;
      if (progress > 1) progress = 1;

      const lat = startPos.lat + (endPos.lat - startPos.lat) * progress;
      const lng = startPos.lng + (endPos.lng - startPos.lng) * progress;

      marker.setPosition({ lat, lng });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const updateMapWithTrip = () => {
    if (!map) return;

    // Clear existing markers except driver marker
    markers.forEach(marker => {
      if (marker !== driverMarkerRef.current) marker.setMap(null);
    });
    const newMarkers = [];

    if (userRole === 'admin') {
      // Admin view: live tracking of all trips
      trips.forEach((adminTrip, index) => {
        if (adminTrip.currentLocation) {
          const adminMarker = new google.maps.Marker({
            position: adminTrip.currentLocation,
            map: map,
            title: `Vehicle: ${adminTrip.vehicleId?.numberPlate || 'Unknown'}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%232563eb"%3E%3Cpath d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/%3E%3C/svg%3E',
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            },
            animation: google.maps.Animation.DROP
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h3>${adminTrip.tripName}</h3>
                <p>Vehicle: ${adminTrip.vehicleId?.numberPlate}</p>
                <p>Driver: ${adminTrip.driverId?.name}</p>
                <p>Employees: ${adminTrip.employees.length}</p>
              </div>
            `
          });

          adminMarker.addListener('click', () => {
            infoWindow.open(map, adminMarker);
          });

          newMarkers.push(adminMarker);
        }
      });
      setMarkers(newMarkers);
      return; // No route calculation for admin
    }

    const effectiveLocation = snappedLocation || currentLocation;

    // Update driver marker position smoothly
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new google.maps.Marker({
        position: effectiveLocation,
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
      newMarkers.push(driverMarkerRef.current);
    } else {
      if (prevLocation) {
        animateMarker(driverMarkerRef.current, prevLocation, effectiveLocation);
      } else {
        driverMarkerRef.current.setPosition(effectiveLocation);
      }
      driverMarkerRef.current.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#1A73E8',
        fillOpacity: 1,
        strokeWeight: 2,
        rotation: heading
      });
    }

    setPrevLocation(effectiveLocation);

    let destination;
    if (trip?.employees?.length > 0) {
      const emp = trip.employees[0]; // Assume first employee for simplicity; adjust if multiple
      if (userRole === 'employee') {
        // For employee, destination is pickup or drop based on status
        destination = emp.status === 'Pending' ? emp.pickupLocation : emp.dropLocation;
      } else {
        // For driver, last destination
        const lastEmp = trip.employees[trip.employees.length - 1];
        destination = lastEmp.status === 'Picked' ? lastEmp.dropLocation : lastEmp.pickupLocation;
      }
      if (destination) {
        const destMarker = new google.maps.Marker({
          position: destination,
          map: map,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(40, 40)
          },
          zIndex: 500,
          animation: google.maps.Animation.DROP
        });
        newMarkers.push(destMarker);
      }
    }

    // Add intermediate markers for driver with color based on status
    if (userRole === 'driver') {
      trip.employees.forEach((emp) => {
        if (emp.pickupLocation) {
          const isCompleted = emp.status === 'Picked' || emp.status === 'Dropped';
          const pickupMarker = new google.maps.Marker({
            position: emp.pickupLocation,
            map: map,
            title: `Pickup: ${emp.employeeId?.name}`,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${isCompleted ? '%2310b981' : '%23f59e0b'}"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E`,
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32)
            },
            animation: google.maps.Animation.DROP
          });
          newMarkers.push(pickupMarker);
        }
        if (emp.dropLocation) {
          const isCompleted = emp.status === 'Dropped';
          const dropMarker = new google.maps.Marker({
            position: emp.dropLocation,
            map: map,
            title: `Drop: ${emp.employeeId?.name}`,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${isCompleted ? '%2310b981' : '%23ef4444'}"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E`,
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32)
            },
            animation: google.maps.Animation.DROP
          });
          newMarkers.push(dropMarker);
        }
      });
    }

    setMarkers([...newMarkers, driverMarkerRef.current]);
    calculateRoute();
  };

  const calculateRoute = () => {
    if (!directionsService || !directionsRenderer || userRole === 'admin') return;

    const effectiveOrigin = snappedLocation || currentLocation;

    let waypoints = [];
    let destinationLocation;

    if (userRole === 'employee') {
      // Employee view: simple route from driver to employee's pickup/drop
      const emp = trip.employees[0]; // Assume single employee
      destinationLocation = emp.status === 'Pending' ? emp.pickupLocation : emp.dropLocation;
      // No waypoints
    } else {
      // Driver view: full route with waypoints
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

      if (waypoints.length === 0) return;
      destinationLocation = waypoints.pop().location;
    }

    const request = {
      origin: effectiveOrigin,
      destination: destinationLocation,
      waypoints: waypoints,
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
          maneuver: step.maneuver
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
    let completedPath = [];
    let remainingPath = [];
    let isCompleted = true;

    route.legs.forEach(leg => {
      leg.steps.forEach(step => {
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
    if (!navigationSteps.length || !currentLocation || userRole === 'admin') return;

    const effectiveLocation = snappedLocation || currentLocation;

    let minDistance = Infinity;
    let closestIndex = 0;

    navigationSteps.forEach((step, index) => {
      const isOnPath = google.maps.geometry.poly.isLocationOnEdge(
        new google.maps.LatLng(effectiveLocation.lat, effectiveLocation.lng),
        new google.maps.Polyline({ path: step.path }),
        0.0001
      );

      if (isOnPath) {
        closestIndex = index;
        return;
      }

      const distToEnd = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(effectiveLocation.lat, effectiveLocation.lng),
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
    setSpokenSteps(new Set());
    displayRoute({ routes: availableRoutes }, index);
  };

  const recenterMap = () => {
    if (map) {
      if (userRole === 'admin') {
        // For admin, fit bounds to all markers
        if (markers.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          markers.forEach(marker => bounds.extend(marker.getPosition()));
          map.fitBounds(bounds);
        }
      } else if (currentLocation) {
        const effectiveLocation = snappedLocation || currentLocation;
        map.setCenter(effectiveLocation);
        map.setZoom(17);
        map.setTilt(60);
        map.setHeading(heading);
      }
    }
  };

  const handlePickupEmployee = (employeeId) => {
    if (onPickupEmployee) {
      onPickupEmployee(trip._id, employeeId);
      calculateRoute();
    }
  };

  const handleDropEmployee = (employeeId) => {
    if (onDropEmployee) {
      onDropEmployee(trip._id, employeeId);
      calculateRoute();
    }
  };

  const nextStep = navigationSteps[currentStepIndex] || {};

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
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="bg-blue-700 text-white p-3 flex flex-col space-y-2"
      >
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
        {userRole !== 'admin' && (
          <div className="bg-blue-800 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              {getManeuverIcon(maneuver)}
              <div>
                <p className="text-lg font-bold">{nextStep.instruction || 'Proceed to route'}</p>
                <p className="text-sm">{nextStep.distance} • {nextStep.duration}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        {userRole !== 'admin' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 border flex items-center space-x-2"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-xs font-medium">Speed: {Math.round(speed)} km/h (Limit: {speedLimit || 'N/A'} km/h)</p>
              <p className="text-xs text-gray-600 truncate max-w-xs">{currentLocationName}</p>
            </div>
          </motion.div>
        )}
      </div>

      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="bg-white border-t p-3 space-y-3"
      >
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

        {availableRoutes.length > 1 && userRole !== 'admin' && (
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

        {userRole === 'driver' && trip && (
          <div className="space-y-2 max-h-24 overflow-y-auto">
            {trip.employees.map((emp, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md border text-sm"
              >
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
              </motion.div>
            ))}
          </div>
        )}

        {userRole === 'driver' && trip?.employees.every(emp => emp.status === 'Dropped') && (
          <button
            onClick={onCompleteTrip}
            className="w-full bg-green-600 text-white py-2 rounded-md font-medium text-sm"
          >
            Complete Trip
          </button>
        )}

        {userRole === 'employee' && trip && (
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
            <p className="text-gray-600">Status: {trip.employees[0]?.status}</p>
          </div>
        )}

        {userRole === 'admin' && trips && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trips.map((adminTrip, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-2 bg-gray-50 rounded-md border text-sm"
              >
                <h3 className="font-medium">{adminTrip.tripName}</h3>
                <p>Vehicle: {adminTrip.vehicleId?.numberPlate}</p>
                <p>Driver: {adminTrip.driverId?.name}</p>
                <p>Employees: {adminTrip.employees.length}</p>
                <p>Status: {adminTrip.status}</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default NavigationScreen;