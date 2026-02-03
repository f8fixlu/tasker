const nodemailer = require('nodemailer');
const dns = require('dns').promises;

// Function to check internet connectivity
const checkInternetConnectivity = async () => {
  try {
    // Try to resolve a common DNS server to check connectivity
    await dns.lookup('8.8.8.8'); // Google's public DNS
    return true;
  } catch (error) {
    console.log('No internet connectivity detected, skipping email sending');
    return false;
  }
};

// Create a transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',  // Default to Gmail
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'your_email@gmail.com',  // Your email
      pass: process.env.SMTP_PASS || 'your_app_password'     // Your email app password
    }
  });
};

// Function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  // Check internet connectivity before sending email
  const isConnected = await checkInternetConnectivity();
  if (!isConnected) {
    console.log('Skipping password reset email due to lack of internet connectivity');
    return null; // Return null to indicate email was not sent
  }

  const transporter = createTransporter();

  // Construct the reset link (adjust the URL based on your deployment)
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Tasker" <noreply@f8fixlu.biz>',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your Tasker account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Function to send password reset confirmation email
const sendPasswordResetConfirmationEmail = async (email) => {
  // Check internet connectivity before sending email
  const isConnected = await checkInternetConnectivity();
  if (!isConnected) {
    console.log('Skipping password reset confirmation email due to lack of internet connectivity');
    return null; // Return null to indicate email was not sent
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Tasker" <noreply@f8fixlu.biz>',
    to: email,
    subject: 'Password Reset Confirmation',
    html: `
      <h2>Password Reset Successful</h2>
      <p>Your password for your Tasker account has been successfully reset.</p>
      <p>If you did not initiate this password reset, please contact our support team immediately.</p>
      <p>For security reasons, we recommend that you:</p>
      <ul>
        <li>Use a strong, unique password</li>
        <li>Enable two-factor authentication if available</li>
        <li>Regularly review your account activity</li>
      </ul>
      <p>Thank you for using Tasker!</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    throw error;
  }
};

// Function to send welcome email to new users
const sendWelcomeEmail = async (email, fullName) => {
  // Check internet connectivity before sending email
  const isConnected = await checkInternetConnectivity();
  if (!isConnected) {
    console.log('Skipping welcome email due to lack of internet connectivity');
    return null; // Return null to indicate email was not sent
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Tasker" <noreply@f8fixlu.biz>',
    to: email,
    subject: 'Welcome to Tasker!',
    html: `
      <h2>Welcome to Tasker, ${fullName}!</h2>
      <p>Thank you for registering with Tasker. We're excited to have you on board.</p>
      <p>Tasker helps you organize your tasks and boost your productivity. Start by creating your first task or importing your existing schedule.</p>
      <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
      <p>Happy organizing!</p>
      <p>The Tasker Team</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Function to send password change notification email
const sendPasswordChangeNotificationEmail = async (email) => {
  // Check internet connectivity before sending email
  const isConnected = await checkInternetConnectivity();
  if (!isConnected) {
    console.log('Skipping password change notification email due to lack of internet connectivity');
    return null; // Return null to indicate email was not sent
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Tasker" <noreply@f8fixlu.biz>',
    to: email,
    subject: 'Password Change Notification',
    html: `
      <h2>Password Changed Successfully</h2>
      <p>Your password for your Tasker account has been successfully changed.</p>
      <p>If you did not initiate this password change, please contact our support team immediately.</p>
      <p>For security reasons, we recommend that you:</p>
      <ul>
        <li>Use a strong, unique password</li>
        <li>Enable two-factor authentication if available</li>
        <li>Regularly review your account activity</li>
      </ul>
      <p>Thank you for using Tasker!</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password change notification email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password change notification email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendPasswordChangeNotificationEmail,
  sendWelcomeEmail
};