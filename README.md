# Tasker Application

Tasker is a comprehensive task management application built with React for the frontend and Node.js/SQLite for the backend. It provides users with a robust platform to manage tasks, events, categories, and generate reports.

## Features

- **Task Management**: Create, edit, and track tasks with due dates, priorities, categories, and subtypes
- **Event Management**: Schedule and manage events with calendar integration
- **Category System**: Organize tasks and events into customizable categories
- **Task Types & Subtypes**: Detailed classification system for better organization
- **User Authentication**: Secure login and registration system
- **File Attachments**: Upload and manage files associated with tasks
- **Reporting**: Generate detailed reports with filtering and export capabilities
- **Responsive Design**: Works seamlessly across devices

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
├── frontend/                 # React application
│   ├── public/              # Static assets
│   ├── src/                 # Source code
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service functions
│   │   ├── context/         # React context providers
│   │   └── utils/           # Utility functions
│   ├── package.json         # Frontend dependencies
├── backend/                 # Node.js server
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── database/            # Database setup and models
│   ├── middleware/          # Authentication and validation
│   ├── models/              # Data models
│   ├── routes/              # API route definitions
│   ├── utils/               # Utility functions
│   ├── uploads/             # File uploads directory
│   └── server.js            # Main server file
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```env
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_token_secret_here
   PORT=5000
   DB_NAME=tasker.db
   FRONTEND_URL=http://localhost:3000
   ```
4. Start the server: `npm start`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. Start the development server: `npm start`

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
- `attachments` - Stores file attachment metadata
- `sessions` - Stores active user sessions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Create React App
- SQLite for database management
- Various open-source libraries and components