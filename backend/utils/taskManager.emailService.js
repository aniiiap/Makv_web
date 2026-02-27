const { Resend } = require('resend');

// Lazy initialization of Resend (after dotenv is loaded)
let resendInstance = null;

const getResend = () => {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    try {
      resendInstance = new Resend(process.env.RESEND_API_KEY);
    } catch (error) {
      console.warn('Failed to initialize Resend:', error.message);
    }
  }
  return resendInstance;
};

const sendEmail = async ({ email, subject, message, html, attachments }) => {
  try {
    const resend = getResend();

    if (!resend) {
      console.warn('Resend API key not configured. Email not sent.');
      return { message: 'Email service not configured' };
    }

    // Use verified domain email address - default to makv.in domain
    // Prefer RESEND_FROM_EMAIL (your current env), then EMAIL_FROM, then default
    const defaultFrom = 'Task Manager <noreply@makv.in>';
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      defaultFrom;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject,
      text: message,
      html: html || `<p>${message}</p>`,
      text: message,
      html: html || `<p>${message}</p>`,
      attachments,
    });

    if (error) {
      console.error('Resend error:', error);
      // Provide more helpful error message
      if (error.message && error.message.includes('only send testing emails')) {
        throw new Error('Please configure EMAIL_FROM in .env file with your verified domain email (e.g., noreply@makv.in)');
      }
      throw error;
    }

    console.log('Email sent successfully:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send invitation email with temporary password
 */
const sendInvitationEmail = async ({ name, email, temporaryPassword }) => {
  const loginUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/taskflow/login`
    : 'https://www.makv.in/taskflow/login';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
        .password { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to TaskFlow! 🎉</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your TaskFlow account has been created by the administrator. You can now access the task management system.</p>
          
          <div class="credentials">
            <p><strong>Your Login Credentials:</strong></p>
            <p>Email: <strong>${email}</strong></p>
            <p>Temporary Password: <span class="password">${temporaryPassword}</span></p>
          </div>
          
          <p><strong>⚠️ Important:</strong> For security reasons, you will be required to change this password on your first login.</p>
          
          <a href="${loginUrl}" class="button">Login to TaskFlow</a>
          
          <p>If you have any questions or need assistance, please contact your administrator.</p>
          
          <div class="footer">
            <p>This is an automated email from TaskFlow. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} MAKV. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const message = `
Welcome to TaskFlow!

Hello ${name},

Your TaskFlow account has been created. Here are your login credentials:

Email: ${email}
Temporary Password: ${temporaryPassword}

Login URL: ${loginUrl}

IMPORTANT: You will be required to change this password on your first login.

If you have any questions, please contact your administrator.

Best regards,
TaskFlow Team
  `;

  return await sendEmail({
    email,
    subject: 'Welcome to TaskFlow - Your Account Details',
    message,
    html,
  });
};

module.exports = { sendEmail, sendInvitationEmail };


