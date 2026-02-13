# Tasker Application

Tasker is a comprehensive task management application built with React for the frontend and Node.js/SQLite for the backend. It provides users with a robust platform to manage tasks, events, categories, and generate reports.

## Features

- **Task Management**: Create, edit, and track tasks with due dates, priorities, categories, and subtypes
- **Event Management**: Schedule and manage events with calendar integration
- **Category System**: Organize tasks and events into customizable categories
- **Task Types & Subtypes**: Detailed classification system for better organization
- **User Authentication**: Secure login and registration system with JWT tokens
- **File Attachments**: Upload and manage files associated with tasks
- **Reporting**: Generate detailed reports with filtering and export capabilities
- **Responsive Design**: Works seamlessly across devices
- **Admin Panel**: Comprehensive administrative interface for system management
- **Backup System**: Automated backup functionality for data protection
- **Real-time Notifications**: Stay updated with system notifications
- **Dark/Light Mode**: Choose between different theme options
- **Status Tracking**: Track task and user status changes with timestamps

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Chart.js for data visualization
- Axios for API communication

### Backend
- Node.js with Express.js
- SQLite database
- JSON Web Tokens (JWT) for authentication
- BCrypt for password hashing

## Project Structure

```
tasker/
├── backend/                 # Node.js server
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers (currently empty - API logic in routes)
│   ├── database/            # Database setup and initialization
│   ├── middleware/          # Authentication and validation
│   ├── models/              # Data models (User.js, Task.js, Event.js, etc.)
│   ├── public/              # Public static files
│   ├── routes/              # API route definitions (auth.js, tasks.js, events.js, etc.)
│   ├── scripts/             # Database scripts
│   ├── services/            # Service layer functions
│   ├── temp/                # Temporary files
│   ├── tests/               # Test files
│   ├── uploads/             # File uploads directory
│   ├── utils/               # Utility functions
│   ├── .envbak              # Environment variables template
│   └── server.js            # Main server file
├── frontend/                # React application
│   ├── public/              # Static assets
│   ├── src/                 # Source code
│   │   ├── components/      # Reusable UI components
│   │   │   ├── admin/       # Admin panel components
│   │   │   ├── charts/      # Chart components for reports
│   │   │   ├── common/      # Common UI components (Button, Input, etc.)
│   │   │   ├── dashboard/   # Dashboard-specific components
│   │   │   ├── layout/      # Layout components
│   │   │   └── modals/      # Modal components (NewTaskModal, etc.)
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components (Login, Dashboard, etc.)
│   │   ├── services/        # API service functions
│   │   ├── styles/          # Custom styles
│   │   └── utils/           # Utility functions
│   ├── .env.production      # Production environment variables
│   ├── build-production.js  # Production build script
│   ├── config-overrides.js  # Build configuration overrides
│   ├── optimize-css.js      # CSS optimization script
│   ├── server.js            # Production server for serving build
│   └── tailwind.config.js   # Tailwind CSS configuration
├── backup/                  # Backup utilities and configurations
├── logo/                    # Logo and branding assets
├── start-tasker.sh          # Startup script for the application
├── tasker-*.service         # Systemd service files for deployment
├── DEPLOY.md                # Deployment instructions
├── BUILD-GUIDE.md           # Build process documentation
├── SERVICE_SETUP.md         # Service setup documentation
├── ISSUES.md                # Known issues and solutions
├── package.json             # Root package.json for overall project
└── README.md                # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Setup (Recommended)
1. Clone the repository
2. Install all dependencies: `npm run install:all`
3. Create a `.env` file in the `backend/` directory with the following variables:
   ```env
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_token_secret_here
   PORT=5000
   DB_NAME=tasker.db
   FRONTEND_URL=http://localhost:3000
   ```
4. Create a `.env` file in the `frontend/` directory with the following variables:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
5. Start both servers in development mode: `npm run dev`

### Individual Setup
#### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file with the required variables (see above)
4. Start the server: `npm start`

#### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file with the required variables (see above)
4. Start the development server: `npm start`

### Production Setup
1. Install all dependencies: `npm run install:all`
2. Build the frontend: `cd frontend && npm run build`
3. Start the application: `npm start`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get a specific task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create a new event
- `GET /api/events/:id` - Get a specific event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event

### Categories
- `GET /api/tasks/categories` - Get all task categories
- `POST /api/tasks/categories` - Create a new category
- `PUT /api/tasks/categories/:id` - Update a category
- `DELETE /api/tasks/categories/:id` - Delete a category

### Task Types
- `GET /api/tasks/types` - Get all task types
- `POST /api/tasks/types` - Create a new task type
- `PUT /api/tasks/types/:id` - Update a task type
- `DELETE /api/tasks/types/:id` - Delete a task type

### Sub Types
- `GET /api/tasks/subtypes` - Get all sub types
- `POST /api/tasks/subtypes` - Create a new sub type
- `PUT /api/tasks/subtypes/:id` - Update a sub type
- `DELETE /api/tasks/subtypes/:id` - Delete a sub type

### Event Categories
- `GET /api/events/categories` - Get all event categories
- `POST /api/events/categories` - Create a new event category
- `PUT /api/events/categories/:id` - Update an event category
- `DELETE /api/events/categories/:id` - Delete an event category

### Event Types
- `GET /api/events/types` - Get all event types
- `POST /api/events/types` - Create a new event type
- `PUT /api/events/types/:id` - Update an event type
- `DELETE /api/events/types/:id` - Delete an event type

### Attachments
- `GET /api/attachments` - Get all attachments
- `POST /api/attachments` - Create/upload a new attachment
- `GET /api/attachments/:id` - Get a specific attachment
- `DELETE /api/attachments/:id` - Delete an attachment

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Admin
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/backup` - Create a backup
- `GET /api/admin/logs` - Get system logs

### Status Tracking
- `GET /api/status-tracking` - Get status tracking information
- `POST /api/status-tracking` - Create status tracking entry

## Environment Variables

### Backend (.env)
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_REFRESH_SECRET` - Secret key for refresh token signing
- `PORT` - Port for the backend server (default: 5000)
- `DB_NAME` - Name of the SQLite database file
- `FRONTEND_URL` - URL of the frontend application

### Frontend (.env)
- `REACT_APP_API_URL` - Base URL for the backend API

## Database Schema

The application uses SQLite with the following main tables:
- `users` - Stores user account information
- `tasks` - Stores task information
- `events` - Stores event information
- `categories` - Stores task categories
- `task_types` - Stores task types
- `sub_types` - Stores sub types for tasks
- `event_categories` - Stores event categories
- `event_types` - Stores event types
- `attachments` - Stores file attachment metadata
- `sessions` - Stores active user sessions
- `notifications` - Stores user notifications
- `status_tracking` - Stores status changes for tasks and users

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and Create React App
- SQLite for database management
- Tailwind CSS for styling
- Chart.js for data visualization
- React Router for navigation
- JSON Web Tokens (JWT) for authentication
- Various open-source libraries and components
- Concurrently for running multiple processes during development