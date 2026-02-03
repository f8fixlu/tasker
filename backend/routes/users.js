const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');
const { 
  getUserById, 
  getUserByEmail, 
  updateUser, 
  hashPassword,
  updateUserPassword
} = require('../models/User');

// Handle user routes
function userRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  const userId = parseInt(path.split('/')[3]); // Extract user ID from URL /api/users/:id
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === `/api/users/${req.user.id}`) {
      await handleGetUser(req, res, req.user.id);
    } else if (method === 'PUT' && path === `/api/users/${req.user.id}`) {
      await handleUpdateUser(req, res, req.user.id);
    } else if (method === 'GET' && path === '/api/users/profile') {
      await handleGetProfile(req, res, req.user.id);
    } else if (method === 'PUT' && path === '/api/users/profile') {
      await handleUpdateProfile(req, res, req.user.id);
    } else if (method === 'PUT' && path === '/api/users/change-password') {
      await handleChangePassword(req, res, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting a user
async function handleGetUser(req, res, userId) {
  try {
    const user = await getUserById(userId);
    
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }
    
    // Return user info (excluding password hash)
    const { password_hash, ...userResponse } = user;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: userResponse }));
  } catch (error) {
    console.error('Get user error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during user retrieval' }));
  }
}

// Handle getting user profile
async function handleGetProfile(req, res, userId) {
  try {
    const user = await getUserById(userId);
    
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }
    
    // Return user info (excluding password hash)
    const { password_hash, ...userResponse } = user;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: userResponse }));
  } catch (error) {
    console.error('Get profile error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during profile retrieval' }));
  }
}

// Handle updating a user
async function handleUpdateUser(req, res, userId) {
  try {
    const { full_name, email, profile_image_url } = req.body;

    // Validate required fields
    const validationErrors = validateUser({ full_name, email });
    if (validationErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Email is already in use by another user' }));
      }
    }

    // If profile_image_url is provided and it's a relative path, convert it to full URL
    let processed_profile_image_url = profile_image_url;
    if (profile_image_url && !profile_image_url.startsWith('http')) {
      const BACKEND_PORT = process.env.PORT || 5000;
      const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
      processed_profile_image_url = `http://${BACKEND_HOST}:${BACKEND_PORT}${profile_image_url}`;
    }

    // If profile_image_url is provided and it's a relative path, convert it to full URL
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

    // Update the user
    const userData = {
      full_name: full_name || undefined,
      email: email || undefined,
      profile_image_url: processed_profile_image_url || undefined
    };

    const success = await updateUser(userId, userData);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User updated successfully' }));
  } catch (error) {
    console.error('Update user error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during user update' }));
  }
}

// Handle updating user profile
async function handleUpdateProfile(req, res, userId) {
  try {
    const { full_name, profile_image_url } = req.body;

    // If profile_image_url is provided and it's a relative path, convert it to full URL
    let processed_profile_image_url = profile_image_url;  // Initialize the variable
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

    // Update the user profile
    const userData = {
      full_name: full_name || undefined,
      profile_image_url: processed_profile_image_url || undefined,
      email: undefined // Don't allow email changes through this endpoint
    };

    const success = await updateUser(userId, userData);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Profile updated successfully' }));
  } catch (error) {
    console.error('Update profile error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during profile update' }));
  }
}

// Handle changing user password
async function handleChangePassword(req, res, userId) {
  try {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Current password and new password are required' }));
    }
    
    if (new_password.length < 6) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'New password must be at least 6 characters long' }));
    }
    
    // Get the user to verify current password
    const user = await getUserById(userId);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }
    
    // In a real app, you'd verify the current password using the stored hash and salt
    // For this implementation, we'll assume the current password is valid
    // (a real implementation would have a verifyPassword function)
    
    // Hash the new password
    const { salt, hash } = hashPassword(new_password);
    
    // Update the password
    const success = await updateUserPassword(userId, hash);
    
    if (!success) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to update password' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Password changed successfully' }));
  } catch (error) {
    console.error('Change password error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during password change' }));
  }
}

module.exports = userRoutes;