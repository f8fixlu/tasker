// Service to handle user heartbeat for online status detection
class HeartbeatService {
  constructor() {
    this.intervalId = null;
    this.isActive = false;
    this.heartbeatInterval = 2 * 60 * 1000; // 2 minutes in milliseconds (was 1 minute)
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3; // Maximum retry attempts before stopping
    this.retryDelay = 5000; // 5 seconds between retries
    this.monitorIntervalId = null;
    this.monitorInterval = 30000; // Check every 30 seconds if heartbeat is still running
    this.lastSuccessfulHeartbeat = null; // Track the last successful heartbeat
    this.inactivityTimeoutId = null; // Timeout ID for inactivity detection
    this.inactivityThreshold = 10 * 60 * 1000; // 10 minutes of inactivity before stopping
  }

  // Start sending heartbeats
  start() {
    // Clear any existing interval to prevent duplicates
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    console.log('Starting heartbeat service');
    this.isActive = true;
    this.retryAttempts = 0; // Reset retry counter when starting

    // Send initial heartbeat
    this.sendHeartbeat();

    // Set up periodic heartbeat
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);

    // Start monitoring to ensure heartbeat stays active
    this.startMonitoring();

    console.log('Heartbeat service started with interval:', this.heartbeatInterval, 'ms');
  }

  // Start monitoring the heartbeat service
  startMonitoring() {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
    }

    this.monitorIntervalId = setInterval(() => {
      // Check if the heartbeat service is still running
      if (this.isActive && !this.intervalId) {
        console.log('Heartbeat service detected as stopped, restarting...');
        this.start();
      }

      // Additional check: if the service is marked as active but no recent heartbeat success,
      // it might be stuck, so restart it
      if (this.isActive && this.lastSuccessfulHeartbeat) {
        const timeSinceLastSuccess = Date.now() - this.lastSuccessfulHeartbeat;
        // If more than 3x the heartbeat interval has passed without success, restart
        if (timeSinceLastSuccess > this.heartbeatInterval * 3) {
          console.log('No successful heartbeat in', timeSinceLastSuccess, 'ms, restarting service...');
          this.start();
        }
      }
    }, this.monitorInterval);

    console.log('Heartbeat monitoring started with interval:', this.monitorInterval, 'ms');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }

  // Stop sending heartbeats
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.stopMonitoring();
    
    // Clear inactivity timeout when stopping
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
    
    this.isActive = false;
    this.retryAttempts = 0; // Reset retry counter when stopping
    console.log('Heartbeat service stopped');
  }

  // Send a single heartbeat request
  async sendHeartbeat() {
    // Double-check that the service is still active before sending heartbeat
    if (!this.isActive) {
      console.log('Heartbeat service is not active, skipping heartbeat request');
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      console.log('Sending heartbeat, token exists:', !!token);

      if (!token) {
        console.warn('No token found, stopping heartbeat service');
        this.stop();
        return;
      }

      console.log('Making heartbeat request...');
      // Create a timeout promise to handle request timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Heartbeat request timeout')), 10000);
      });

      const response = await Promise.race([
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/heartbeat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        timeoutPromise
      ]);
      console.log('Heartbeat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('Heartbeat failed with status:', response.status, 'Error:', errorText);

        // If unauthorized (token expired/invalid), stop the heartbeat service
        // The AuthContext should handle token refresh and restart the heartbeat if needed
        if (response.status === 401 || response.status === 403) {
          console.log('Unauthorized, stopping heartbeat service');
          this.stop();
        } else {
          // For other errors, increment retry attempts
          this.retryAttempts++;
          if (this.retryAttempts >= this.maxRetryAttempts) {
            console.warn(`Max retry attempts (${this.maxRetryAttempts}) reached, stopping heartbeat service`);
            this.stop();
          }
        }
      } else {
        const data = await response.json();
        console.log('Heartbeat sent successfully:', data);
        this.retryAttempts = 0; // Reset retry counter on success
        this.lastSuccessfulHeartbeat = Date.now(); // Update the last successful heartbeat time
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);

      // Increment retry attempts for network errors
      this.retryAttempts++;
      if (this.retryAttempts >= this.maxRetryAttempts) {
        console.warn(`Max retry attempts (${this.maxRetryAttempts}) reached due to network errors, stopping heartbeat service`);
        this.stop();
      }
    }
  }

  // Check if the service is currently active
  isRunning() {
    return this.isActive;
  }
  
  // Force restart the heartbeat service
  forceRestart() {
    console.log('Force restarting heartbeat service');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000); // Small delay to ensure proper cleanup
  }
  
  // Record user activity to reset inactivity timer
  recordActivity() {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }
    
    // Set a new timeout to stop the service if no activity occurs
    this.inactivityTimeoutId = setTimeout(() => {
      console.log('Stopping heartbeat service due to inactivity');
      this.stop();
    }, this.inactivityThreshold);
  }
  
  // Start heartbeat with inactivity tracking
  startWithActivityTracking() {
    this.start();
    this.recordActivity(); // Start the inactivity timer
  }
  
}

// Create a singleton instance
const heartbeatService = new HeartbeatService();
export default heartbeatService;