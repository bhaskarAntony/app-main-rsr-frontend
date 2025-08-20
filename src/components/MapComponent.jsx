import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE';

function MapComponent({ 
  onLocationSelect, 
  pickupLocation, 
  dropLocation, 
  driverLocation, 
  showRoute = false,
  height = '400px' 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [pickupMarker, setPickupMarker] = useState(null);
  const [dropMarker, setDropMarker] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 12.9716, lng: 77.5946 }, // Bangalore
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
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
    if (!map) return;

    // Clear existing markers
    if (pickupMarker) pickupMarker.setMap(null);
    if (dropMarker) dropMarker.setMap(null);
    if (driverMarker) driverMarker.setMap(null);

    // Add pickup marker
    if (pickupLocation) {
      const marker = new google.maps.Marker({
        position: pickupLocation,
        map: map,
        title: 'Pickup Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2310B981"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 30)
        }
      });
      setPickupMarker(marker);
    }

    // Add drop marker
    if (dropLocation) {
      const marker = new google.maps.Marker({
        position: dropLocation,
        map: map,
        title: 'Drop Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23EF4444"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 30)
        }
      });
      setDropMarker(marker);
    }

    // Add driver marker
    if (driverLocation) {
      const marker = new google.maps.Marker({
        position: driverLocation,
        map: map,
        title: 'Driver Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%233B82F6"%3E%3Cpath d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15)
        }
      });
      setDriverMarker(marker);
    }

    // Show route if both pickup and drop locations are available
    if (showRoute && pickupLocation && dropLocation && directionsService && directionsRenderer) {
      const request = {
        origin: pickupLocation,
        destination: dropLocation,
        travelMode: google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          
          // Calculate distance
          const route = result.routes[0];
          if (route && route.legs && route.legs.length > 0) {
            const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
            const distanceInKm = totalDistance / 1000;
            console.log(`Route distance: ${distanceInKm.toFixed(2)} km`);
          }
        }
      });
    }

    // Fit map to show all markers
    const bounds = new google.maps.LatLngBounds();
    if (pickupLocation) bounds.extend(pickupLocation);
    if (dropLocation) bounds.extend(dropLocation);
    if (driverLocation) bounds.extend(driverLocation);
    
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
      // Add some padding to the bounds
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  }, [map, pickupLocation, dropLocation, driverLocation, showRoute]);

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-md">
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full"
      />
    </div>
  );
}

export default MapComponent;