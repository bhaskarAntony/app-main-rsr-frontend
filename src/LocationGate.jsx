import React, { useEffect, useState } from "react";

function LocationGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | granted | denied
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus("granted");
      },
      (err) => {
        console.warn("Location error:", err);
        setStatus("denied");
      }
    );
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        📍 Checking location permission...
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-center p-6">
        <h1 className="text-xl font-bold text-red-600 mb-4">
          Location Permission Needed
        </h1>
        <p className="text-gray-700 mb-4">
          We need your location to continue. Please allow location access in your
          browser settings and refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  // ✅ If granted → show actual dashboard
  return children;
}

export default LocationGate;
