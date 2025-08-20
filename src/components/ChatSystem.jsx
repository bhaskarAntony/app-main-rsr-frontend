import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Phone } from 'lucide-react';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

function ChatSystem({ trip, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    // Load existing messages for this trip
    loadMessages();
    
    // Listen for new messages
    const socket = socketService.connect(user.id);
    socket.on('newMessage', (message) => {
      if (message.tripId === trip._id) {
        setMessages(prev => [...prev, message]);
      }
    });

    return () => {
      socket.off('newMessage');
    };
  }, [trip._id, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    // Simulate loading messages for this trip
    const demoMessages = [
      {
        id: 1,
        senderId: trip.driverId._id,
        senderName: trip.driverId.name,
        message: "I'm on my way to the pickup location",
        timestamp: new Date(Date.now() - 300000),
        type: 'text'
      },
      {
        id: 2,
        senderId: user.id,
        senderName: user.name,
        message: "Thank you! I'll be waiting",
        timestamp: new Date(Date.now() - 240000),
        type: 'text'
      }
    ];
    setMessages(demoMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      senderId: user.id,
      senderName: user.name,
      message: newMessage,
      timestamp: new Date(),
      type: 'text',
      tripId: trip._id
    };

    setMessages(prev => [...prev, message]);
    
    // Emit message via socket
    socketService.emit('sendMessage', message);
    
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">{trip.tripName}</h2>
            <p className="text-sm text-gray-600">Trip Chat</p>
          </div>
        </div>
        <button className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
          <Phone className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.message}</p>
              <p className={`text-xs mt-1 ${
                message.senderId === user.id ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || loading}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatSystem;