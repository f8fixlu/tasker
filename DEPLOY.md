# Deployment Guide for Tasker Application

This document provides instructions for deploying the Tasker application to various environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Heroku Deployment](#heroku-deployment)
  - [Railway Deployment](#railway-deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [Self-Hosting](#self-hosting)
- [Database Configuration](#database-configuration)
- [Production Considerations](#production-considerations)

## Prerequisites

Before deploying the Tasker application, ensure you have:

- Node.js (v14 or higher) installed
- Git installed
- Accounts on chosen deployment platforms
- SSL certificates (for production deployments)

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
JWT_SECRET=your_secure_jwt_secret_here
JWT_REFRESH_SECRET=your_secure_refresh_token_secret_here
PORT=5000
DB_NAME=tasker.db
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory with the following variables:

```env
REACT_APP_API_URL=https://your-backend-domain.com/api
GENERATE_SOURCEMAP=false
```

## Deployment Options

### Heroku Deployment

#### Backend Deployment

1. Create a new Heroku app:
   ```bash
   heroku create your-tasker-backend-app-name
   ```

2. Add the SQLite buildpack:
   ```bash
   heroku buildpacks:set https://github.com/malloc/heroku-buildpack-sqlite3.git -a your-tasker-backend-app-name
   ```

3. Set environment variables:
   ```bash
   heroku config:set JWT_SECRET=your_jwt_secret -a your-tasker-backend-app-name
   heroku config:set JWT_REFRESH_SECRET=your_refresh_token_secret -a your-tasker-backend-app-name
   heroku config:set FRONTEND_URL=https://your-frontend-domain.com -a your-tasker-backend-app-name
   ```

4. Deploy the backend:
   ```bash
   git subtree push --prefix backend heroku main
   ```

#### Frontend Deployment

1. Create a new Heroku app for the frontend:
   ```bash
   heroku create your-tasker-frontend-app-name
   ```

2. Set environment variables:
   ```bash
   heroku config:set REACT_APP_API_URL=https://your-tasker-backend-app-name.herokuapp.com/api
   ```

3. Deploy the frontend:
   ```bash
   git subtree push --prefix frontend heroku main
   ```

### Railway Deployment

1. Sign up at [Railway](https://railway.app) and install the Railway CLI

2. Create a new project:
   ```bash
   railway login
   railway init
   ```

3. For the backend:
   - Link your repository
   - Set environment variables in the Railway dashboard
   - Configure the build command: `npm install && npm run build`
   - Configure the start command: `npm start`

4. For the frontend:
   - Create a separate service or use static hosting
   - Set environment variables
   - Configure build command: `npm install && npm run build`
   - Serve the `build` directory

### Vercel Deployment

#### Frontend Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

4. Set environment variables in the Vercel dashboard:
   - `REACT_APP_API_URL`: Your backend API URL

#### Backend Deployment

1. Create a `vercel.json` file in the backend directory:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server.js"
       }
     ]
   }
   ```

2. Deploy:
   ```bash
   cd backend
   vercel --prod
   ```

### Self-Hosting

#### Backend Server Setup

1. Clone the repository to your server:
   ```bash
   git clone https://github.com/f8fixlu/tasker-app.git
   cd tasker/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`

4. Set up a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "tasker-backend"
   pm2 startup
   pm2 save
   ```

5. Set up a reverse proxy with Nginx:
   ```nginx
   server {
       listen 80;
       server_name your-backend-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

#### Frontend Server Setup

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Serve the build directory using Nginx:
   ```nginx
   server {
       listen 80;
       server_name your-frontend-domain.com;

       root /path/to/tasker/frontend/build;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy API requests to backend
       location /api {
           proxy_pass http://your-backend-domain.com;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Cloudflare Deployment

#### Option 1: Cloudflare Pages (Frontend) + Workers (Backend)

##### Frontend Deployment with Cloudflare Pages

1. Create a new project in the Cloudflare dashboard
2. Connect your GitHub repository containing the Tasker frontend
3. Set build configuration:
   - Framework preset: Create React App
   - Build command: `npm run build`
   - Build output directory: `build`
   - Root directory: `/frontend`

4. Set environment variables in the Cloudflare Pages dashboard:
   - `REACT_APP_API_URL`: Your backend API URL

5. Deploy the project

##### Backend Deployment with Cloudflare Workers

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Initialize a new Worker project:
   ```bash
   wrangler init tasker-backend-worker
   cd tasker-backend-worker
   ```

3. Create a Durable Object for SQLite database access or use Cloudflare D1:
   ```javascript
   // worker.js
   export default {
     async fetch(request, env) {
       // Handle API requests similar to your Express server
       const url = new URL(request.url);

       if (url.pathname.startsWith('/api')) {
         // Process API requests
         // Note: You may need to adapt your existing Express routes
       }

       return new Response('Tasker API', { status: 200 });
     },
   };
   ```

4. Configure wrangler.toml:
   ```toml
   name = "tasker-backend-worker"
   main = "worker.js"

   [env.production]
   account_id = "your-account-id"
   workers_dev = true
   ```

5. Deploy the Worker:
   ```bash
   wrangler deploy
   ```

#### Option 2: Cloudflare Tunnel (Cloudflared) with Self-Hosted Infrastructure

1. Install Cloudflared on your server:
   ```bash
   # For Ubuntu/Debian
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. Authenticate Cloudflared:
   ```bash
   sudo cloudflared tunnel login
   ```

3. Create a tunnel:
   ```bash
   sudo cloudflared tunnel create tasker-tunnel
   ```

4. Configure the tunnel in `/etc/cloudflared/config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: /etc/cloudflared/<tunnel-id>.json

   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:5000
     - hostname: app.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. Run the tunnel as a service:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```

6. Add DNS records in the Cloudflare dashboard:
   - Create CNAME records pointing your domains to the tunnel
   - Enable SSL/TLS encryption in the Cloudflare dashboard

#### Option 3: Cloudflare Pages with Custom Domain and Backend Proxy

1. Deploy the frontend to Cloudflare Pages as described in Option 1

2. Set up custom domain in Cloudflare Pages dashboard

3. Configure API proxy in Cloudflare Pages:
   - Go to your Pages project settings
   - Under "Functions", create a proxy function for API requests
   - Example `_worker.js` in the Functions directory:
   ```javascript
   export default {
     async fetch(request, env, ctx) {
       const url = new URL(request.url);

       // Proxy API requests to your backend
       if (url.pathname.startsWith('/api')) {
         const apiUrl = `https://your-backend-domain.com${url.pathname}${url.search}`;
         const apiRequest = new Request(apiUrl, {
           method: request.method,
           headers: request.headers,
           body: request.body,
         });

         return await fetch(apiRequest);
       }

       // For all other requests, serve the static site
       return env.ASSETS.fetch(request);
     },
   };
   ```

4. This setup allows you to host the frontend on Cloudflare Pages while keeping your backend on traditional infrastructure

## Database Configuration

The application uses SQLite by default. For production deployments:

- The database file will be created automatically in the backend directory
- Ensure the application has write permissions to the database directory
- For scaling, consider migrating to PostgreSQL or MySQL

## Production Considerations

### Security

- Use strong, unique values for JWT secrets
- Enable HTTPS with SSL certificates
- Implement rate limiting
- Sanitize all user inputs
- Regularly update dependencies

### Performance

- Enable gzip compression
- Implement caching strategies
- Optimize database queries
- Monitor application performance
- Set up proper logging

### Monitoring

- Set up error tracking (e.g., Sentry)
- Monitor server resources
- Track application metrics
- Log important events for debugging

### Backup Strategy

- Regularly backup the database
- Store backups in a secure, separate location
- Test backup restoration procedures regularly

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure `FRONTEND_URL` environment variable is correctly set
2. **Database connection errors**: Check file permissions and path
3. **API calls failing**: Verify `REACT_APP_API_URL` is correctly set
4. **Build failures**: Check environment variables and dependencies

### Logs

Check application logs for errors:
- Heroku: `heroku logs --tail -a app-name`
- Railway: Access logs through the dashboard
- Self-hosted: Check PM2 logs with `pm2 logs`

## Rollback Procedure

To rollback to a previous version:

1. Identify the commit hash of the previous working version
2. Deploy that specific commit to your platform
3. Verify functionality after rollback
4. Update DNS records if needed