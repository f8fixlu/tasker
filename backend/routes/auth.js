const url = require('url');
const jwt = require('jsonwebtoken');
const { jsonParser } = require('../middleware/auth');
const sanitizeMiddleware = require('../middleware/sanitize');
const { validateUser } = require('../middleware/validation');
const { createUser, getUserByEmail, getUserById, updateUser, hashPassword, verifyPassword, updateUserPassword, updateUserStatus, setUserPendingOffline, setUserOnline } = require('../models/User');
const { createSession, getSessionByToken, deleteSessionByToken, deleteSessionById, deleteAllSessionsForUser, updateLastActivity } = require('../models/Session');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeToken } = require('../utils/jwtManagement');
const { handleFileUpload } = require('../utils/multipartParser');
const { UPLOAD_DIR } = require('../utils/secureFileStorage');
const { sendPasswordResetEmail } = require('../utils/email');

// Handle authentication routes
function authRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  // For multipart requests (like profile image upload), don't apply sanitization here
  if (path === '/api/auth/profile/upload-image') {
    // Parse the request body (multipart parser handles this internally)
    jsonParser(req, res, async () => {
      await handleUploadProfileImage(req, res, req.user.id);
    });
  } else {
    // Apply sanitization first to ensure data is sanitized before processing for non-multipart requests
    sanitizeMiddleware(req, res, () => {
      // Parse the request body
      jsonParser(req, res, async () => {
        if (method === 'POST' && path === '/api/auth/register') {
          await handleRegister(req, res);
        } else if (method === 'POST' && path === '/api/auth/login') {
          await handleLogin(req, res);
        } else if (method === 'POST' && path === '/api/auth/logout') {
          await handleLogout(req, res);
        } else if (method === 'POST' && path === '/api/auth/refresh') {
          await handleRefresh(req, res);
        } else if (method === 'GET' && path === '/api/auth/profile') {
          // Profile route is handled by authentication middleware, so jsonParser is sufficient
          await handleGetProfile(req, res);
        } else if (method === 'PUT' && path === '/api/auth/profile') {
          await handleUpdateProfile(req, res);
        } else if (method === 'POST' && path === '/api/auth/profile/delete-image') {
          await handleDeleteProfileImage(req, res, req.user.id);
        } else if (method === 'POST' && path === '/api/auth/change-password') {
          await handleChangePassword(req, res);
        } else if (method === 'POST' && path === '/api/auth/forgot-password') {
          await handleForgotPassword(req, res);
        } else if (method === 'POST' && path.startsWith('/api/auth/reset-password/')) {
          // Extract token from URL path
          const token = path.split('/').pop();
          await handleResetPassword(req, res, token);
        } else if (method === 'GET' && path.startsWith('/api/auth/reset-password/')) {
          // Extract token from URL path for validation
          const token = path.split('/').pop();
          await validateResetToken(req, res, token);
        } else if (method === 'POST' && path === '/api/auth/mark-welcome-shown') {
          await handleMarkWelcomeShown(req, res, req.user.id);
        } else if (method === 'POST' && path === '/api/auth/heartbeat') {
          await handleHeartbeat(req, res);
        } else {
          // Route not found
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Route not found' }));
        }
      });
    });
  }
}

// Handle user registration
async function handleRegister(req, res) {
  try {
    const { full_name, email, password } = req.body;
    
    // Validate required fields
    const validationErrors = validateUser({ full_name, email, password });
    if (validationErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User with this email already exists' }));
    }
    
    // Hash the password
    const password_hash = await hashPassword(password);
    
    // Create the user
    const userData = {
      full_name,
      email,
      password_hash, // Store the hash
      profile_image_url: null // Default to null, can be updated later
    };
    
    const user = await createUser(userData);
    
    // Generate tokens
    const payload = { id: user.id, email: user.email };
    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);
    
    // Delete existing sessions for the user to avoid duplicate token errors
    await deleteAllSessionsForUser(user.id);
    
    // Store refresh token in session
    await createSession({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // Return user info and tokens (excluding password hash)
    const { password_hash: _, ...userResponse } = user;

    // Send welcome email to the new user
    try {
      const { sendWelcomeEmail } = require('../utils/email');
      await sendWelcomeEmail(user.email, user.full_name);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the registration if email sending fails
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      user: userResponse,
      accessToken,
      refreshToken
    }));
  } catch (error) {
    console.error('Registration error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during registration' }));
  }
}

// Handle user login
async function handleLogin(req, res) {
  console.log('handleLogin function called');
  try {
    console.log('Request body before processing:', req.body);
    console.log('Content-Type header:', req.headers['content-type']);

    // Ensure req.body exists and has the expected properties
    if (!req.body) {
      console.error('Request body is undefined or null');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Request body is required' }));
    }

    const { email, password } = req.body;
    console.log('Login request body:', req.body);

    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Email and password are required' }));
    }
    
    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid email or password' }));
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid email or password' }));
    }

    // Ensure admin role is set for eligible users
    const { ensureAdminRole } = require('../middleware/auth');
    const userWithRole = ensureAdminRole(user);

    // Always update the role if it should be set (to ensure it's properly stored in database)
    if (userWithRole.role && user.role !== userWithRole.role) {
      await updateUser(user.id, { role: userWithRole.role });
    }

    // Generate tokens - use the updated user object with correct role
    const updatedUser = await getUserById(user.id); // Get user again to ensure we have the latest role
    const payload = { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role || null };
    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);
    
    // Delete existing sessions for the user to avoid duplicate token errors
    await deleteAllSessionsForUser(user.id);
    
    // Get client IP and user agent
    // Handle Cloudflare's header as well as standard headers
    const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare header
    const xForwardedFor = req.headers['x-forwarded-for']; // Standard reverse proxy header
    const ipAddress = cfConnectingIp || xForwardedFor || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // Set user status to online when logging in (with explicit 'login' reason)
    await updateUserStatus(user.id, 'online', 'login');

    // Store refresh token in session with metadata
    const { JWT_REFRESH_EXPIRES_IN } = require('../config/auth');
    // Convert the expiration string to milliseconds for the date calculation
    let expirationMs = 24 * 60 * 60 * 1000; // Default to 1 day in ms

    if (typeof JWT_REFRESH_EXPIRES_IN === 'string') {
      if (JWT_REFRESH_EXPIRES_IN.endsWith('d')) {
        const days = parseInt(JWT_REFRESH_EXPIRES_IN.replace('d', ''));
        expirationMs = days * 24 * 60 * 60 * 1000;
      } else if (JWT_REFRESH_EXPIRES_IN.endsWith('h')) {
        const hours = parseInt(JWT_REFRESH_EXPIRES_IN.replace('h', ''));
        expirationMs = hours * 60 * 60 * 1000;
      }
    }

    await createSession({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + expirationMs),
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Persist last login timestamp on the user record (survives session deletion)
    const { runQuery } = require('../utils/database');
    runQuery('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]).catch(() => {});
    
    // Return user info and tokens (excluding password hash)
    const { password_hash: _, ...userResponse } = user;

    console.log('Login successful, issuing access token:', typeof accessToken === 'string' ? accessToken.substring(0, 20) + '... (truncated)' : 'NOT A STRING');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      user: userResponse,
      accessToken,
      refreshToken
    }));
  } catch (error) {
    console.error('Login error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during login' }));
  }
}

// Handle user logout
async function handleLogout(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access token is required' }));
    }

    try {
      // Verify the token to get user ID
      const { JWT_SECRET } = require('../config/auth');
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;

      // Revoke the token (add to blacklist)
      await revokeToken(token, userId);

      // Set user status to pending offline (will become offline after 30 seconds) with explicit 'logout' reason
      await updateUserStatus(userId, 'pending_offline', 'logout');

      // Mark ALL sessions for this user as ended (invalidate all sessions)
      const { runQuery } = require('../utils/database');
      await runQuery(
        `UPDATE sessions
         SET expires_at = datetime('now', '-1 minute')  -- Mark all sessions as expired
         WHERE user_id = ?`,
        [userId]
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Logged out successfully' }));
    } catch (error) {
      // Even if token verification fails, we still want to clean up
      // Try to get user ID from the token without verification to invalidate all their sessions
      try {
        // Decode the token without verification to extract user ID
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          // Invalidate all sessions for this user
          await deleteAllSessionsForUser(decoded.id);
        }
      } catch (decodeError) {
        // If we can't decode the token, at least try to delete by token
        await deleteSessionByToken(token);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Logged out successfully' }));
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during logout' }));
  }
}

// Handle token refresh
async function handleRefresh(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Refresh token is required' }));
    }
    
    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid refresh token' }));
    }
    
    // Check if refresh token exists in database (for security)
    const session = await getSessionByToken(refreshToken);
    if (!session) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid refresh token' }));
    }
    
    // Get user information to include in the payload
    const user = await getUserById(session.user_id);
    if (!user) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User associated with token not found' }));
    }
    
    // Generate new access token
    const payload = { id: session.user_id, email: user.email };
    const newAccessToken = await generateAccessToken(payload);
    const newRefreshToken = await generateRefreshToken(payload);
    
    // Remove old refresh token and add new one
    await deleteSessionByToken(refreshToken);

    // Delete any other existing sessions for the user to avoid duplicate token errors
    await deleteAllSessionsForUser(session.user_id);

    const { JWT_REFRESH_EXPIRES_IN } = require('../config/auth');
    // Convert the expiration string to milliseconds for the date calculation
    let expirationMs = 24 * 60 * 60 * 1000; // Default to 1 day in ms

    if (typeof JWT_REFRESH_EXPIRES_IN === 'string') {
      if (JWT_REFRESH_EXPIRES_IN.endsWith('d')) {
        const days = parseInt(JWT_REFRESH_EXPIRES_IN.replace('d', ''));
        expirationMs = days * 24 * 60 * 60 * 1000;
      } else if (JWT_REFRESH_EXPIRES_IN.endsWith('h')) {
        const hours = parseInt(JWT_REFRESH_EXPIRES_IN.replace('h', ''));
        expirationMs = hours * 60 * 60 * 1000;
      }
    }

    await createSession({
      user_id: session.user_id,
      token: newRefreshToken,
      expires_at: new Date(Date.now() + expirationMs)
    });

    // Update the activity time for the new session token
    await updateLastActivity(newRefreshToken);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }));
  } catch (error) {
    console.error('Refresh error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during token refresh' }));
  }
}

// Handle getting user profile
async function handleGetProfile(req, res) {
  try {
    console.log('Profile endpoint called, req.user:', req.user);
    // The user is already attached to req by the authentication middleware
    const user = await getUserById(req.user.id);

    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    // Return user info (excluding password hash)
    const { password_hash: _, ...userResponse } = user;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: userResponse }));
  } catch (error) {
    console.error('Get profile error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during profile retrieval' }));
  }
}

// Handle updating user profile
async function handleUpdateProfile(req, res) {
  try {
    // The user is already attached to req by the authentication middleware
    const userId = req.user.id;
    const { full_name, email, profile_image_url } = req.body;

    // Get current user to verify it exists
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    // If email is being updated, check if the new email already exists for another user
    if (email && email !== currentUser.email) {
      const existingUser = await getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Email already in use by another account' }));
      }
    }

    // If profile_image_url is provided and it's a relative path, convert it to full URL
    let processed_profile_image_url = profile_image_url;
    if (profile_image_url && !profile_image_url.startsWith('http')) {
      // Determine the correct protocol and host based on the request
      const protocol = req.headers['x-forwarded-proto'] || 'http'; // Use forwarded protocol if available
      const host = req.headers['x-forwarded-host'] || req.headers['host'] || '';

      if (host) {
        // Use the actual host from the request (useful for proxies like Cloudflare)
        processed_profile_image_url = `${protocol}://${host}${profile_image_url}`;
      } else {
        // Fallback to environment variables
        const BACKEND_PORT = process.env.PORT || 5000;
        const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
        processed_profile_image_url = `http://${BACKEND_HOST}:${BACKEND_PORT}${profile_image_url}`;
      }
    }

    // Prepare update data, only include fields that are provided
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (processed_profile_image_url !== undefined) updateData.profile_image_url = processed_profile_image_url;

    // If no fields to update, return an error
    if (Object.keys(updateData).length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No fields to update provided' }));
    }

    // Use the updateUser function from the User model which handles partial updates
    const { updateUser } = require('../models/User');
    const updateSuccess = await updateUser(userId, updateData);

    if (!updateSuccess) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to update user profile' }));
    }

    // Get updated user data to return
    const updatedUser = await getUserById(userId);

    // Return updated user info (excluding password hash)
    const { password_hash: _, ...userResponse } = updatedUser;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: userResponse }));
  } catch (error) {
    console.error('Update profile error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during profile update' }));
  }
}

// Handle uploading profile image
async function handleUploadProfileImage(req, res, userId) {
  try {
    // Handle the file upload as profile image
    await handleFileUpload(req, res, userId, 'profile');

    // The response is handled within handleFileUpload for profile uploads
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during profile image upload' }));
  }
}

// Handle deleting profile image
async function handleDeleteProfileImage(req, res, userId) {
  try {
    // Get current user to verify it exists
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    // Check if the user has a profile image to delete
    if (!currentUser.profile_image_url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No profile image to delete' }));
    }

    // Extract the file path from the profile_image_url (remove the backend host part to get relative path)
    let profileImagePath = currentUser.profile_image_url;
    if (profileImagePath && profileImagePath.startsWith('http')) {
      // Extract the relative path from the full URL
      const urlParts = profileImagePath.split('/uploads/');
      if (urlParts.length > 1) {
        profileImagePath = `/uploads/${urlParts[1]}`;
      }
    }

    // Prepare update data to remove the profile image URL
    const updateData = {
      profile_image_url: null
    };

    // Use the updateUser function from the User model to update only the profile_image_url field
    const { updateUser } = require('../models/User');
    const updateSuccess = await updateUser(userId, updateData);

    if (!updateSuccess) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to delete profile image' }));
    }

    // Attempt to delete the physical file if it exists
    try {
      const fs = require('fs');
      const path = require('path');
      const { UPLOAD_DIR } = require('../utils/secureFileStorage');

      // Construct the full file path from the profile image URL
      // profile_image_url is in format like: /uploads/profiles/{userId}/{filename}
      const fullPath = path.join(process.cwd(), profileImagePath);

      // Verify the path is within the allowed directory to prevent directory traversal
      const resolvedPath = path.resolve(fullPath);
      const allowedDir = path.resolve(UPLOAD_DIR);

      if (resolvedPath.startsWith(allowedDir) && fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath); // Delete the file
      }
    } catch (fileError) {
      console.error('Error deleting profile image file:', fileError);
      // Don't return an error to the client if only the file deletion failed,
      // since the database record was successfully updated
    }

    // Get updated user data to return
    const updatedUser = await getUserById(userId);
    if (!updatedUser) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to retrieve updated user data' }));
    }

    // Return updated user info (excluding password hash)
    const { password_hash: _, ...userResponse } = updatedUser;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      user: userResponse,
      message: 'Profile image deleted successfully'
    }));
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during profile image deletion' }));
  }
}

// Handle changing user password
async function handleChangePassword(req, res) {
  try {
    console.log('Change password endpoint called, req.user:', req.user);

    // The user is already attached to req by the authentication middleware
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('Change password request body:', { userId, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

    // Validate required fields
    if (!currentPassword || !newPassword) {
      console.log('Missing required fields');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Current password and new password are required' }));
    }

    // Get current user to verify it exists and get current password hash
    const user = await getUserById(userId);
    if (!user) {
      console.log('User not found:', userId);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    // Verify the current password
    console.log('About to verify current password for user:', userId);
    console.log('Current password provided (first 5 chars):', currentPassword ? currentPassword.substring(0, 5) + '...' : 'none');
    console.log('Stored password hash (first 20 chars):', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'none');

    const isValidCurrentPassword = await verifyPassword(currentPassword, user.password_hash);
    console.log('Password verification result:', isValidCurrentPassword);

    if (!isValidCurrentPassword) {
      console.log('Current password is incorrect');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Current password is incorrect', code: 'INCORRECT_CURRENT_PASSWORD' }));
    }

    // Validate the new password with stricter requirements
    if (newPassword.length < 8) {
      console.log('New password too short');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'New password must be at least 8 characters', code: 'WEAK_PASSWORD' }));
    }

    // Additional password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      console.log('New password does not meet strength requirements');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Password must contain at least 8 characters with uppercase, lowercase, and number',
        code: 'WEAK_PASSWORD'
      }));
    }

    // Check if new password is the same as the current password
    const isSameAsCurrent = await verifyPassword(newPassword, user.password_hash);
    if (isSameAsCurrent) {
      console.log('New password is the same as current password');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      }));
    }

    // Update the password using the User model helper function
    const updateResult = await updateUserPassword(userId, newPassword);

    if (!updateResult) {
      console.log('Failed to update password in database');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to update password' }));
    }

    console.log('Password updated successfully for user:', userId);

    // Send email notification about password change
    try {
      const { sendPasswordChangeNotificationEmail } = require('../utils/email');
      await sendPasswordChangeNotificationEmail(user.email);
    } catch (emailError) {
      console.error('Error sending password change notification email:', emailError);
      // Don't fail the password change if email sending fails
    }

    // Password changed successfully
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Password updated successfully' }));
  } catch (error) {
    console.error('Change password error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during password change' }));
  }
}

// Handle forgot password request
async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Email is required' }));
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'If an account with that email exists, a password reset link has been sent' }));
    }

    // Generate a password reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token and expiry
    const { updateUserResetToken } = require('../models/User');
    await updateUserResetToken(user.id, resetToken, resetTokenExpiry);

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'If an account with that email exists, a password reset link has been sent' }));
  } catch (error) {
    console.error('Forgot password error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during password reset request' }));
  }
}

// Handle password reset with token
async function handleResetPassword(req, res, token) {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'New password is required' }));
    }

    // Validate the token and check if it's expired
    const { getUserByResetToken, updateUserPassword, clearResetToken } = require('../models/User');
    const user = await getUserByResetToken(token);

    if (!user) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid or expired reset token' }));
    }

    // Check if the token has expired
    const now = new Date();
    if (user.reset_token_expiry < now) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Reset token has expired' }));
    }

    // Update the user's password
    const updateResult = await updateUserPassword(user.id, newPassword);

    if (!updateResult) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to update password' }));
    }

    // Clear the reset token after successful password update
    await clearResetToken(user.id);

    // Send notification email about successful password reset
    try {
      const { sendPasswordResetConfirmationEmail } = require('../utils/email');
      await sendPasswordResetConfirmationEmail(user.email);
    } catch (emailError) {
      console.error('Error sending password reset confirmation email:', emailError);
      // Don't fail the password reset if email sending fails
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Password has been reset successfully' }));
  } catch (error) {
    console.error('Reset password error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during password reset' }));
  }
}

// Validate reset token
async function validateResetToken(req, res, token) {
  try {
    // Validate the token and check if it's expired
    const { getUserByResetToken } = require('../models/User');
    const user = await getUserByResetToken(token);

    if (!user) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid or expired reset token' }));
    }

    // Check if the token has expired
    const now = new Date();
    if (user.reset_token_expiry < now) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Reset token has expired' }));
    }

    // Token is valid
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid: true, message: 'Token is valid' }));
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during token validation' }));
  }
}

// Handle marking welcome as shown
async function handleMarkWelcomeShown(req, res, userId) {
  try {
    const { markWelcomeShown } = require('../models/User');

    // Mark the welcome as shown for the user
    const success = await markWelcomeShown(userId);

    if (!success) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to update welcome status' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Welcome status updated successfully' }));
  } catch (error) {
    console.error('Mark welcome shown error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during welcome status update' }));
  }
}

// Handle heartbeat to update user's last activity time
async function handleHeartbeat(req, res) {
  try {
    const { verifyAccessToken } = require('../utils/jwtManagement');
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Heartbeat received with access token:', accessToken ? 'present' : 'missing');

    if (!accessToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access token is required' }));
    }

    // Verify the access token to get user information
    let decodedToken;
    try {
      decodedToken = await verifyAccessToken(accessToken);
    } catch (error) {
      console.log('Access token verification failed:', error.message);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    }

    // Set user status to online when heartbeat is received, but only if they're not in pending offline status
    try {
      const { getRow } = require('../utils/database');
      const currentUser = await getRow('SELECT status FROM users WHERE id = ?', [decodedToken.id]);
      
      // Only update to online if the user is not in pending_offline status
      // This prevents heartbeat from overriding a logout status
      if (currentUser && currentUser.status !== 'pending_offline') {
        await setUserOnline(decodedToken.id);
      } else if (currentUser) {
        console.log(`Heartbeat: Not updating status for user ${decodedToken.id}, current status is ${currentUser.status}`);
      }
    } catch (statusError) {
      console.error('Error checking or setting user online status:', statusError);
      // Continue anyway, as this shouldn't prevent heartbeat from working
    }

    // Update the session activity for the user
    // Since sessions are stored with refresh tokens, we need to update based on user ID
    try {
      const { runQuery, getRow } = require('../utils/database');

      // First, check what sessions exist for this user
      const checkSql = `
        SELECT id, session_id, token, expires_at, last_activity_at
        FROM sessions
        WHERE user_id = ?
      `;
      const existingSessions = await getRow(checkSql, [decodedToken.id]);
      console.log('Existing sessions for user', decodedToken.id, ':', existingSessions);

      // Check if there are any non-expired sessions
      const checkValidSql = `
        SELECT id, session_id, token, expires_at, last_activity_at
        FROM sessions
        WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
      `;
      const validSessions = await getRow(checkValidSql, [decodedToken.id]);
      console.log('Valid (non-expired) sessions for user', decodedToken.id, ':', validSessions);

      // Update the last activity time for the user regardless of session status
      // This ensures that the user's online status is always updated when they send a heartbeat
      const updateSql = `
        UPDATE sessions
        SET last_activity_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
      `;

      const result = await runQuery(updateSql, [decodedToken.id]);
      const success = result.changes > 0;

      console.log('Update last activity result for user', decodedToken.id, ':', success, 'rows updated:', result.changes);

      // Even if no session was updated (because all sessions expired), we still want to track the user's activity
      // If no active session exists, we should update an existing expired session or create a new one
      if (!success) {
        console.log('No active session found for user', decodedToken.id, ', possibly already logged out or session expired');

        // First, try to update an existing expired session for this user
        try {
          // Find an expired session ID for this user first
          const findExpiredSql = `
            SELECT id, session_id
            FROM sessions
            WHERE user_id = ? AND expires_at <= CURRENT_TIMESTAMP
            LIMIT 1
          `;
          
          const expiredSession = await getRow(findExpiredSql, [decodedToken.id]);
          
          if (expiredSession) {
            // Update the specific expired session
            const updateExpiredSql = `
              UPDATE sessions
              SET last_activity_at = CURRENT_TIMESTAMP,
                  expires_at = datetime('now', '+1 day')  -- Reset expiration to 1 day from now
              WHERE id = ?
            `;
            
            const updateResult = await runQuery(updateExpiredSql, [expiredSession.id]);
            const updatedRows = updateResult.changes;
            
            if (updatedRows > 0) {
              console.log('Updated expired session for user', decodedToken.id, 'rows updated:', updatedRows);
            }
          } else {
            // If no expired session was found, create a new session
            const crypto = require('crypto');
            const { generateRefreshToken } = require('../utils/jwtManagement');

            // Generate a new session ID using crypto
            const sessionId = crypto.randomBytes(16).toString('hex');
            const refreshToken = await generateRefreshToken({ id: decodedToken.id, email: decodedToken.email });

            // Calculate expiration time (using the same logic as login)
            const { JWT_REFRESH_EXPIRES_IN } = require('../config/auth');
            let expirationMs;
            if (typeof JWT_REFRESH_EXPIRES_IN === 'string') {
              if (JWT_REFRESH_EXPIRES_IN.endsWith('d')) {
                const days = parseInt(JWT_REFRESH_EXPIRES_IN.replace('d', ''));
                expirationMs = days * 24 * 60 * 60 * 1000;
              } else if (JWT_REFRESH_EXPIRES_IN.endsWith('h')) {
                const hours = parseInt(JWT_REFRESH_EXPIRES_IN.replace('h', ''));
                expirationMs = hours * 60 * 60 * 1000;
              } else {
                // Default to 1 day if format is unexpected
                expirationMs = 24 * 60 * 60 * 1000;
              }
            } else {
              // Default to 1 day if not a string
              expirationMs = 24 * 60 * 60 * 1000;
            }

            const expiresAt = new Date(Date.now() + expirationMs);

            // Create a new session record
            const insertSql = `
              INSERT INTO sessions (session_id, user_id, token, expires_at, last_activity_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            await runQuery(insertSql, [sessionId, decodedToken.id, refreshToken, expiresAt]);
            console.log('Created new session for user', decodedToken.id, 'after heartbeat');
          }
        } catch (sessionUpdateError) {
          console.error('Error updating or creating session for user after heartbeat:', sessionUpdateError);
          // Continue anyway, as the token is still valid
        }
      } else {
        console.log('Successfully updated activity time for user', decodedToken.id, 'rows:', result.changes);

        // Check the updated session
        const updatedCheckSql = `
          SELECT id, session_id, token, expires_at, last_activity_at
          FROM sessions
          WHERE user_id = ? AND last_activity_at >= datetime('now', '-1 minute')
        `;
        const updatedSession = await getRow(updatedCheckSql, [decodedToken.id]);
        console.log('Updated session for user', decodedToken.id, ':', updatedSession);
      }
    } catch (error) {
      console.error('Error updating last activity for user:', decodedToken.id, error);
      // Don't return an error here as it might be a valid scenario (e.g., token expired)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Activity updated successfully', 
      timestamp: new Date().toISOString(),
      userId: decodedToken.id
    }));
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during heartbeat' }));
  }
}

module.exports = authRoutes;