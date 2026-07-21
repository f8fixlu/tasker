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
- **Inactivity Detection**: Automatic detection and handling of user inactivity
- **Session Management**: Refresh token rotation with secure session handling
- **Image Optimization**: Automatic image compression and optimization for uploads
- **File Security**: Secure file storage with type validation and sanitization
- **Holiday Management**: Track and manage holidays with calendar integration
- **Print Reports**: Generate and print formatted reports with PDF export

## Tech Stack

### Frontend
- React 18
- React Router v6 for navigation
- Tailwind CSS 3 for styling
- Chart.js 4 via react-chartjs-2 for data visualization
- Axios for API communication
- pdfmake for PDF report generation
- Helmet for security headers
- Express-rate-limit for rate limiting
- Prop-types for runtime type checking

### Backend
- Node.js with native `http` module and Express.js
- SQLite database with `sqlite3` package
- JSON Web Tokens (JWT) for authentication
- Node.js built-in `crypto` for password hashing
- Custom validation and sanitization middleware
- Session management with refresh token rotation
- Multipart file upload handling (no external libraries)

## Project Structure

```
tasker/
├── .gitignore
├── .prettierrc
├── LICENSE
├── README.md
├── package.json                 # Root scripts (dev, start, test, install:all)
│
├── backend/                     # Node.js API server
│   ├── server.js                # Main entry point - HTTP server + routing
│   ├── package.json
│   ├── .envbak                  # Environment variables template
│   ├── .eslintrc
│   ├── .prettierrc
│   │
│   ├── config/
│   │   ├── auth.js              # JWT/auth configuration
│   │   ├── cors.js              # CORS configuration
│   │   └── database.js          # SQLite database setup & initialization
│   │
│   ├── database/
│   │   └── indexes.sql          # Database indexes
│   │
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication & request logger
│   │   ├── error.js             # Centralized error handling
│   │   ├── sanitize.js          # Input sanitization
│   │   └── validation.js        # Request validation
│   │
│   ├── models/                  # Data access layer (SQL queries per model)
│   │   ├── Attachment.js
│   │   ├── Category.js
│   │   ├── Event.js
│   │   ├── EventCategory.js
│   │   ├── EventType.js
│   │   ├── Notification.js
│   │   ├── Session.js
│   │   ├── SubType.js
│   │   ├── Task.js
│   │   ├── TaskType.js
│   │   └── User.js
│   │
│   ├── routes/                  # API route handlers
│   │   ├── admin.js
│   │   ├── attachments.js
│   │   ├── auth.js
│   │   ├── backups.js
│   │   ├── categories.js
│   │   ├── dashboard.js
│   │   ├── database.js
│   │   ├── eventCategories.js
│   │   ├── eventTypes.js
│   │   ├── events.js
│   │   ├── holidays.js
│   │   ├── notifications.js
│   │   ├── reports.js
│   │   ├── statusTracking.js
│   │   ├── subTypes.js
│   │   ├── tasks.js
│   │   ├── taskTypes.js
│   │   └── users.js
│   │
│   ├── services/
│   │   ├── inactivityDetectionService.js
│   │   └── statusCleanupService.js
│   │
│   ├── utils/
│   │   ├── auth.js              # JWT generation & validation
│   │   ├── database.js          # Database helper utilities
│   │   ├── email.js             # Email sending (password reset)
│   │   ├── fileValidation.js    # File type/size validation
│   │   ├── imageOptimizer.js    # Image compression & resizing
│   │   ├── jwtManagement.js     # JWT lifecycle management
│   │   ├── multipartParser.js   # Custom multipart form parser
│   │   ├── notificationJobs.js  # Scheduled notification tasks
│   │   ├── secureFileStorage.js # Secure file write & delete
│   │   ├── sessionManagement.js # Session cleanup & refresh
│   │   └── statusTracker.js     # Status change tracking
│   │
│   └── tests/
│       ├── integration/
│       └── unit/
│
├── frontend/                    # React SPA
│   ├── server.js                # Production Express server for serving build
│   ├── build-production.js      # Production build script
│   ├── config-overrides.js      # Webpack overrides (react-app-rewired)
│   ├── optimize-css.js          # Post-build CSS optimization
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── postcss.config.js
│   └── src/
│       ├── App.js               # Root component with routing
│       ├── index.js             # Entry point
│       ├── setupTests.js
│       │
│       ├── components/
│       │   ├── admin/           # Admin panel UI
│       │   ├── common/          # Shared UI (ForgotPasswordModal, SessionExpiryWarning)
│       │   ├── layout/          # Layout wrapper
│       │   └── modals/          # Modal dialogs (task/event/category CRUD)
│       │
│       ├── context/             # React context providers
│       │   ├── AppContext.js
│       │   ├── AuthContext.js
│       │   ├── ModalContext.js
│       │   ├── NotificationUpdateContext.js
│       │   ├── TaskUpdateContext.js
│       │   └── ThemeContext.js
│       │
│       ├── hooks/               # Custom React hooks
│       │   ├── useCalendar.js
│       │   ├── useDebounce.js
│       │   ├── useEvents.js
│       │   ├── useFormValidation.js
│       │   ├── useModal.js
│       │   ├── useNotifications.js
│       │   ├── useSanitization.js
│       │   └── useTasks.js
│       │
│       ├── pages/               # Route-level page components
│       │   ├── admin/
│       │   ├── Calendar.js
│       │   ├── Dashboard.js
│       │   ├── Login.js
│       │   ├── NotFound.js
│       │   ├── PrintReport.js
│       │   ├── Register.js
│       │   ├── Reports.js
│       │   ├── ResetPassword.js
│       │   └── Tasks.js
│       │
│       ├── services/            # API client modules
│       │   ├── api.js           # Axios instance with interceptors
│       │   ├── attachmentService.js
│       │   ├── authService.js
│       │   ├── categoryService.js
│       │   ├── eventCategoryService.js
│       │   ├── eventService.js
│       │   ├── eventTypeService.js
│       │   ├── heartbeatService.js
│       │   ├── holidayService.js
│       │   ├── notificationService.js
│       │   ├── reportsService.js
│       │   ├── subTypeService.js
│       │   ├── taskService.js
│       │   ├── taskTypeService.js
│       │   └── userService.js
│       │
│       ├── styles/
│       │   └── index.css        # Tailwind base + custom styles
│       │
│       └── utils/
│           ├── cache.js
│           ├── date.js
│           ├── dateOptimized.js
│           ├── sanitization.js
│           └── validation.js
│
├── scripts/
│   ├── tasker_backup.sh         # Database backup script
│   └── tasker_db_watch.sh       # Database watch/monitor script
│
├── header/                      # HTTP header templates
├── logo/                        # Application logos
├── status/                      # Status monitoring files
├── nginx.md                     # Nginx configuration guide
├── cloudflared.md               # Cloudflare Tunnel setup
├── DEPLOY.md                    # Deployment instructions
├── BUILD-GUIDE.md               # Build process guide
├── SERVICE_SETUP.md             # Systemd service setup
├── BACKUP_DEPLOYMENT.md         # Backup deployment guide
├── BACKUP_STRATEGY.md           # Backup strategy documentation
├── ISSUES.md                    # Known issues and workarounds
├── updates.md                   # Changelog / update notes
├── todos.md                     # Development todo list
├── tasker.md                    # Detailed project architecture document
├── responsive.md                # Responsive design notes
├── audit.md                     # Security/performance audit notes
│
├── tasker-app.service           # Systemd unit files
├── tasker-backend-api.service
├── tasker-backend.service
├── tasker-frontend.service
├── tasker-backup.service
├── tasker-db-watch.service
│
├── tasker_backup.sh             # Standalone backup script
├── tasker_db_watch.sh           # Standalone DB watch script
├── tasker_backup_status.json    # Backup status tracking
├── tasker_exclude.txt           # Backup exclusion patterns
├── tasker_performance_test.jmx  # JMeter performance test plan
├── jmeter-config.properties     # JMeter configuration
├── run-jmeter-tests.ps1        # JMeter runner (PowerShell)
├── run-jmeter-tests.sh          # JMeter runner (Unix)
│
└── tasker_logo.png
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

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
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Tasks
- `GET /api/tasks` - Get all tasks (supports filtering, pagination)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get a specific task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `PUT /api/tasks/:id/status` - Update task status

### Events
- `GET /api/events` - Get all events (supports date filtering)
- `POST /api/events` - Create a new event
- `GET /api/events/:id` - Get a specific event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event

### Categories
- `GET /api/categories` - Get all task categories
- `POST /api/categories` - Create a new category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Task Types
- `GET /api/task-types` - Get all task types
- `POST /api/task-types` - Create a new task type
- `PUT /api/task-types/:id` - Update a task type
- `DELETE /api/task-types/:id` - Delete a task type

### Sub Types
- `GET /api/sub-types` - Get all sub types
- `POST /api/sub-types` - Create a new sub type
- `PUT /api/sub-types/:id` - Update a sub type
- `DELETE /api/sub-types/:id` - Delete a sub type

### Event Categories
- `GET /api/event-categories` - Get all event categories
- `POST /api/event-categories` - Create a new event category
- `PUT /api/event-categories/:id` - Update an event category
- `DELETE /api/event-categories/:id` - Delete an event category

### Event Types
- `GET /api/event-types` - Get all event types
- `POST /api/event-types` - Create a new event type
- `PUT /api/event-types/:id` - Update an event type
- `DELETE /api/event-types/:id` - Delete an event type

### Attachments
- `GET /api/attachments` - Get all attachments for a task/event
- `POST /api/attachments` - Upload a new attachment (multipart)
- `GET /api/attachments/:id` - Download a specific attachment
- `DELETE /api/attachments/:id` - Delete an attachment

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent` - Get recent activity

### Reports
- `GET /api/reports/tasks` - Generate task report
- `GET /api/reports/events` - Generate event report

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users
- `POST /api/admin/backup` - Create a database backup
- `GET /api/admin/backups` - List available backups
- `GET /api/admin/logs` - Get system logs

### Backups
- `POST /api/backups` - Trigger manual backup
- `GET /api/backups` - List all backups
- `POST /api/backups/restore/:id` - Restore from backup

### Status Tracking
- `GET /api/status-tracking` - Get status tracking information
- `POST /api/status-tracking` - Create a status tracking entry

### Holidays
- `GET /api/holidays` - Get holidays
- `POST /api/holidays` - Create a holiday entry
- `DELETE /api/holidays/:id` - Delete a holiday

### Database
- `GET /api/database/status` - Get database status
- `POST /api/database/backup` - Trigger database backup

## Environment Variables

### Backend (.env)
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_REFRESH_SECRET` - Secret key for refresh token signing
- `PORT` - Port for the backend server (default: 5000)
- `DB_NAME` - Name of the SQLite database file
- `FRONTEND_URL` - URL of the frontend application
- `SMTP_HOST` - SMTP server for email (password reset)
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `UPLOAD_DIR` - Upload directory path
- `MAX_FILE_SIZE` - Maximum upload file size in bytes
- `NODE_ENV` - Environment (development/production)

### Frontend (.env)
- `REACT_APP_API_URL` - Base URL for the backend API

## Database Schema

The application uses SQLite with the following main tables:
- `users` - Stores user account information
- `tasks` - Stores task information with status, priority, and due dates
- `events` - Stores event information with start/end dates
- `task_categories` - Stores task categories with color coding
- `task_types` - Stores task types linked to categories
- `task_sub_types` - Stores sub types linked to task types
- `event_categories` - Stores event categories
- `event_types` - Stores event types
- `attachments` - Stores file attachment metadata
- `sessions` - Stores active user sessions (JWT refresh tokens)
- `notifications` - Stores user notifications with read status
- `status_tracking` - Stores status changes with timestamps
- `holidays` - Stores holiday entries

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.