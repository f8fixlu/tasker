# Tasker Frontend - Optimized Server

This optimized Express server provides enhanced performance, security, and caching for the Tasker frontend application.

## Features

- **Compression**: Gzip compression for smaller payloads
- **Advanced Caching**: Proper cache headers for different file types
- **Security**: Helmet for security headers and rate limiting
- **Performance**: Optimized chunk splitting and resource preloading
- **Logging**: Morgan for request logging
- **Error Handling**: Proper error handling middleware

## Installation

```bash
cd frontend
npm install
```

## Building the Application

```bash
npm run build
```

## Running the Server

### Development Mode
```bash
npm run dev-server  # Uses nodemon for auto-restart on changes
```

### Production Mode
```bash
npm run prod
```

### Standalone Mode
```bash
npm run server
```

## Environment Variables

Create a `.env.production` file with the following variables:

```env
NODE_ENV=production
BACKEND_URL=https://backend.f8fixlu.biz  # Your backend API URL
```

## Performance Optimizations

1. **Static Asset Caching**: JavaScript, CSS, and image files are cached for 1 year
2. **Resource Preloading**: Critical resources are preloaded for faster initial render
3. **Compression**: All responses are compressed using gzip
4. **Rate Limiting**: API abuse protection with rate limiting
5. **Security Headers**: XSS and CSRF protection via Helmet
6. **Efficient Routing**: Optimized client-side routing with proper fallback

## Integration with Cloudflare

When using with Cloudflare Tunnel, make sure your nginx configuration points to this Express server:

```nginx
location / {
    proxy_pass http://localhost:3000;  # Express server port
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Monitoring

The server includes logging via Morgan. In production, logs will be written to standard output.