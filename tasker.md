# Tasker Project Structure

## Project Architecture

### Backend (Vanilla Node.js with SQLite)
- **HTTP Server**: Built with Node.js native `http` module
- **Database**: SQLite with `sqlite3` package for persistence
- **Authentication**: JWT-based authentication using Node.js built-in crypto
- **File Uploads**: Node.js `fs` and `path` modules for file handling
- **Data Validation**: Custom validation middleware
- **Configuration**: Environment-based configuration with `.env`

### Database Schema Design (SQLite)

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task Categories
CREATE TABLE task_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT, -- Hex color
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task Types
CREATE TABLE task_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task Sub Types
CREATE TABLE task_sub_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type_id INTEGER,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (type_id) REFERENCES task_types(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  type_id INTEGER,
  sub_type_id INTEGER,
  quantity INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High')),
  due_date DATETIME,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed')),
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (type_id) REFERENCES task_types(id) ON DELETE SET NULL,
  FOREIGN KEY (sub_type_id) REFERENCES task_sub_types(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Events
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  is_whole_day INTEGER DEFAULT 0, -- BOOLEAN in SQLite
  category TEXT,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attachments
CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  task_id INTEGER,
  event_id INTEGER,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT CHECK(type IN ('task', 'event', 'general')),
  is_read INTEGER DEFAULT 0, -- BOOLEAN in SQLite
  user_id INTEGER NOT NULL,
  related_task_id INTEGER,
  related_event_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (related_event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Sessions table for JWT refresh tokens
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Project Structure

```
tasker/
├── backend/
│   ├── server.js                  # Main HTTP server
│   ├── config/
│   │   ├── database.js           # SQLite database configuration
│   │   ├── auth.js               # JWT and authentication configuration
│   │   └── cors.js               # CORS configuration
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── taskController.js     # Task management logic
│   │   ├── eventController.js    # Event management logic
│   │   ├── userController.js     # User management logic
│   │   ├── attachmentController.js # File attachment logic
│   │   └── notificationController.js # Notification logic
│   ├── middleware/
│   │   ├── auth.js               # Authentication middleware
│   │   ├── validation.js         # Request validation middleware
│   │   └── error.js              # Error handling middleware
│   ├── models/
│   │   ├── User.js               # User data model
│   │   ├── Task.js               # Task data model
│   │   ├── Event.js              # Event data model
│   │   ├── Category.js           # Category data model
│   │   ├── Attachment.js         # Attachment data model
│   │   └── Notification.js       # Notification data model
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── tasks.js              # Task routes
│   │   ├── events.js             # Event routes
│   │   ├── users.js              # User routes
│   │   ├── attachments.js        # Attachment routes
│   │   └── notifications.js      # Notification routes
│   ├── utils/
│   │   ├── auth.js               # Authentication utilities
│   │   ├── database.js           # Database utilities
│   │   ├── validation.js         # Validation utilities
│   │   └── helpers.js            # General helper functions
│   ├── public/
│   │   ├── uploads/             # File uploads directory
│   │   └── assets/              # Static assets (if any)
│   ├── database/
│   │   ├── migrations/          # Database migration files
│   │   ├── seeders/             # Database seed files
│   │   └── tasker.db            # SQLite database file
│   ├── tests/
│   │   ├── integration/         # Integration tests
│   │   └── unit/                # Unit tests
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.js
│   │   │   │   ├── Sidebar.js
│   │   │   │   ├── Footer.js
│   │   │   │   ├── Modal.js          # Base Modal component
│   │   │   │   ├── Button.js
│   │   │   │   ├── Input.js
│   │   │   │   ├── Select.js
│   │   │   │   ├── DataTable.js
│   │   │   │   └── Calendar.js       # Calendar component with day cells
│   │   │   ├── layout/
│   │   │   │   └── Layout.js
│   │   │   ├── modals/               # Dedicated modal components
│   │   │   │   ├── NewTaskModal.js   # Modal for creating new tasks
│   │   │   │   ├── ViewTaskModal.js  # Modal for viewing task details
│   │   │   │   ├── EditTaskModal.js  # Modal for editing tasks
│   │   │   │   ├── NewEventModal.js  # Modal for creating new events
│   │   │   │   ├── ViewEventModal.js # Modal for viewing event details
│   │   │   │   ├── EditEventModal.js # Modal for editing events
│   │   │   │   ├── NewCategoryModal.js    # Modal for adding new categories
│   │   │   │   ├── NewTaskTypeModal.js    # Modal for adding new task types
│   │   │   │   └── NewSubTypeModal.js     # Modal for adding new sub types
│   │   │   └── dashboard/
│   │   │       ├── DashboardStats.js
│   │   │       └── RecentItems.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Tasks.js              # Tasks page with ability to open modals
│   │   │   ├── Calendar.js           # Calendar page with day cells that can open modals
│   │   │   ├── Reports.js
│   │   │   ├── Settings.js
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useTasks.js
│   │   │   ├── useEvents.js
│   │   │   ├── useNotifications.js
│   │   │   ├── useModal.js          # Custom hook for modal management
│   │   │   └── useCalendar.js       # Custom hook for calendar functionality
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── AppContext.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── authService.js
│   │   ├── utils/
│   │   │   ├── helpers.js
│   │   │   └── constants.js
│   │   ├── styles/
│   │   │   ├── index.css
│   │   │   └── globals.css
│   │   └── App.js
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env
├── package.json
└── README.md
```

### Backend Implementation Details

1. **Server Architecture**: Use Node.js `http` module to create the web server
2. **Routing**: Custom routing system that parses request URLs and matches them to appropriate handlers
3. **Database Operations**: Use `sqlite3` package for direct database operations
4. **Authentication**: JWT token generation and validation using Node.js `crypto` module
5. **File Handling**: Use Node.js native `fs` module for file uploads and management
6. **Configuration**: Environment variables managed through `.env` files

### Modal Components with Add Buttons

The main modals (NewTaskModal and NewEventModal) include add buttons that open specialized modals:

**NewTaskModal.js**:
- Category select with add button that opens NewCategoryModal
- Task type select with add button that opens NewTaskTypeModal
- Sub type select with add button that opens NewSubTypeModal

**NewEventModal.js**:
- Category select with add button that opens NewCategoryModal

All specialized modals (NewCategoryModal, NewTaskTypeModal, NewSubTypeModal) will be simple forms with appropriate fields and validation that save data back to the database and update the parent select controls.