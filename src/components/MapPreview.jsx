import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, Clock } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE';

function MapPreview({ pickupLocation, dropLocation, height = '300px' }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [routeInfo, setRouteInfo] = useState({
    distance: 0,
    duration: 0
  });

  useEffect(() => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 12.9716, lng: 77.5946 },
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
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
          strokeColor: '#3B82F6',
          strokeWeight: 4
        }
      });

      directionsRendererInstance.setMap(mapInstance);

      setMap(mapInstance);
      setDirectionsService(directionsServiceInstance);
      setDirectionsRenderer(directionsRendererInstance);
    });
  }, []);

  useEffect(() => {
    if (!map || !pickupLocation || !dropLocation) return;

    // Add pickup marker
    new google.maps.Marker({
      position: pickupLocation,
      map: map,
      title: 'Pickup Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2310B981"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
        scaledSize: new google.maps.Size(30, 30),
        anchor: new google.maps.Point(15, 30)
      }
    });

    // Add drop marker
    new google.maps.Marker({
      position: dropLocation,
      map: map,
      title: 'Drop Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23EF4444"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
        scaledSize: new google.maps.Size(30, 30),
        anchor: new google.maps.Point(15, 30)
      }
    });

    // Calculate route
    if (directionsService && directionsRenderer) {
      const request = {
        origin: pickupLocation,
        destination: dropLocation,
        travelMode: google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          
          const route = result.routes[0];
          if (route && route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            setRouteInfo({
              distance: (leg.distance.value / 1000).toFixed(1),
              duration: Math.round(leg.duration.value / 60)
            });
          }
        }
      });
    }

    // Fit bounds to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pickupLocation);
    bounds.extend(dropLocation);
    map.fitBounds(bounds);
  }, [map, pickupLocation, dropLocation, directionsService, directionsRenderer]);

  return (
    <div className="w-full">
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full rounded-xl border-2 border-gray-200"
      />
      {routeInfo.distance > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              <span className="text-blue-900 font-semibold">{routeInfo.distance} km</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-blue-900 font-semibold">{routeInfo.duration} min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPreview;