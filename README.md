# Company Cab Management System

A comprehensive web-based cab management system built with React.js frontend and Node.js backend, featuring role-based dashboards and real-time tracking capabilities.

## 🚀 Features

### Role-Based Dashboards
- **Company Admin**: Fleet management, user management, reports
- **Travel Admin**: Trip scheduling, route planning, live tracking
- **Driver**: Trip management, location sharing, status updates
- **Employee**: Trip booking, live tracking, trip history

### Key Functionalities
- JWT-based authentication with role-based access control
- Google Maps integration for location search and route planning
- Real-time location tracking via Socket.IO
- Fleet management with vehicle assignments
- Trip scheduling and management
- Analytics and reporting dashboard
- Responsive design for all devices

## 🛠️ Technology Stack

### Frontend
- React.js with Vite
- Tailwind CSS for styling
- React Router DOM for navigation
- Google Maps JavaScript API
- Chart.js for analytics
- Socket.IO client for real-time updates

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Socket.IO for real-time communication
- bcryptjs for password hashing

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Google Maps API key

### Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   PORT=5000
   JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_complex
   GOOGLE_MAPS_API_KEY=AIzaSyAlwkR078ja6eYka4GoD98JPkQoCf4jiaE
   MONGODB_URI=mongodb+srv://bhaskarAntoty123:bhaskar3958@bhaskarantony.wagpkay.mongodb.net/cabmanagement?retryWrites=true&w=majority&appName=BhaskarAntony
   ```

4. Create demo data:
   ```bash
   node seeders/createDemoUsers.js
   ```

5. Start server:
   ```bash
   npm run dev
   ```

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Company Admin | admin@company.com | admin123 |
| Travel Admin | travel@company.com | travel123 |
| Driver | driver@company.com | driver123 |
| Employee | employee@company.com | employee123 |

## 📱 Usage

1. **Login**: Use the demo credentials to access different role dashboards
2. **Company Admin**: Manage users, vehicles, and view reports
3. **Travel Admin**: Schedule trips, assign drivers, and track live locations
4. **Driver**: View assigned trips, start/complete trips, and share location
5. **Employee**: Book trips, track current trip, and view history

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token

### Users
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `POST /api/vehicles` - Create vehicle (Admin only)
- `PUT /api/vehicles/:id` - Update vehicle (Admin only)
- `DELETE /api/vehicles/:id` - Delete vehicle (Admin only)

### Trips
- `GET /api/trips` - Get all trips (Admin/Travel Admin)
- `POST /api/trips` - Create trip (Travel Admin)
- `POST /api/trips/book` - Book trip (Employee)
- `PUT /api/trips/:id/start` - Start trip (Driver)
- `PUT /api/trips/:id/complete` - Complete trip (Driver)

## 🔧 Features in Detail

### Real-time Tracking
- Driver location updates via WebSocket
- Live trip status updates
- Real-time notifications for trip assignments

### Google Maps Integration
- Place autocomplete for location input
- Route optimization and directions
- Live location markers and tracking

### Analytics Dashboard
- Trip statistics and metrics
- Driver performance tracking
- Fleet utilization reports

### Security Features
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Protected API endpoints

## 📊 Database Schema

### Users Collection
- Personal information and authentication
- Role-based access permissions
- Vehicle assignments for drivers

### Vehicles Collection
- Vehicle specifications and status
- Driver assignments
- Maintenance tracking

### Trips Collection
- Trip details and locations
- Status tracking and timestamps
- Route information and feedback

## 🚀 Deployment

The application is ready for deployment on platforms like:
- Frontend: Vercel, Netlify
- Backend: Railway, Render, Heroku
- Database: MongoDB Atlas

## 📞 Support

For any questions or issues, please contact the development team or create an issue in the repository.

## 📄 License

This project is licensed under the MIT License.