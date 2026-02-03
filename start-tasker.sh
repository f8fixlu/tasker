#!/bin/bash
# Tasker startup script

# Start backend
cd /home/pi/apps/tasker/backend
npm start &

# Start frontend
cd /home/pi/apps/tasker/frontend
node server.js &

# Wait for both processes
wait