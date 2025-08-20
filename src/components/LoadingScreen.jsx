import React, { useState, useEffect } from 'react';
import { Car, MapPin, Clock, Users } from 'lucide-react';

const loadingMessages = [
  "Connecting to RSR Tours & Travels...",
  "Finding the best route for you...",
  "Preparing your journey...",
  "Almost ready to go...",
  "Getting everything set up...",
  "Optimizing your travel experience...",
  "Loading your cab details...",
  "Preparing live tracking..."
];

function LoadingScreen({ message = "Loading..." }) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center z-50">
      <div className="text-center text-white px-6">
        {/* Logo Animation */}
        <div className="mb-8">
          <div className="relative">
            <Car className="w-16 h-16 mx-auto mb-4 animate-bounce text-white" />
            <div className="absolute -top-2 -right-2">
              <MapPin className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">RSR Tours & Travels</h1>
          <p className="text-blue-100">Your Premium Cab Service</p>
        </div>

        {/* Loading Animation */}
        <div className="mb-6">
          <div className="flex justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-64 h-2 bg-white/20 rounded-full mx-auto mb-4">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Loading Messages */}
        <div className="h-12 flex items-center justify-center">
          <p className="text-lg font-medium animate-pulse">
            {loadingMessages[currentMessage]}
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <Clock className="w-6 h-6 mb-2 text-yellow-300" />
            <span className="text-sm">Real-time</span>
          </div>
          <div className="flex flex-col items-center">
            <MapPin className="w-6 h-6 mb-2 text-green-300" />
            <span className="text-sm">Live Tracking</span>
          </div>
          <div className="flex flex-col items-center">
            <Users className="w-6 h-6 mb-2 text-pink-300" />
            <span className="text-sm">Safe Journey</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;