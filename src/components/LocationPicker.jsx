import React, { useRef, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, X } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE';

function LocationPicker({ onLocationSelect, onClose, title = "Select Location" }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    try {
      await loader.load();
      
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

      // Add click listener to map
      mapInstance.addListener('click', (event) => {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        setSelectedLocation(location);
        getLocationName(location);
        addMarker(location);
      });

      setMap(mapInstance);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  };

  const addMarker = (location) => {
    if (!map) return;

    // Clear existing markers
    map.data.forEach((feature) => {
      map.data.remove(feature);
    });

    new google.maps.Marker({
      position: location,
      map: map,
      title: 'Selected Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%232563eb"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 32)
      }
    });
  };

  const getLocationName = async (location) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location });
      
      if (result.results[0]) {
        setLocationName(result.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
  };

  const handleConfirmLocation = () => {
    if (selectedLocation && locationName) {
      onLocationSelect({
        ...selectedLocation,
        address: locationName,
        name: locationName.split(',')[0]
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Instructions */}
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-700">Tap on the map to select a location</p>
          </div>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && locationName && (
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Selected Location</p>
                <p className="text-sm text-gray-600">{locationName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="bg-white border-t p-4">
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;