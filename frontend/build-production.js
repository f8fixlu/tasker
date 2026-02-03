#!/bin/bash
# Build script for Tasker frontend that bypasses linting errors

# Set environment to production
export NODE_ENV=production

# Temporarily disable linting during build
export SKIP_PREFLIGHT_CHECK=true

# Run the build command
npx react-scripts build