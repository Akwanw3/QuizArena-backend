import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Generate 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification email with OTP
 */
export const sendVerificationEmail = async (
  email: string,
  username: string,
  otp: string
) => {
  const mailOptions = {
    from: `"QuizArena" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎮 Verify Your QuizArena Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 32px; }
          .content { padding: 40px 30px; color: #e2e8f0; }
          .otp-box { background: #1e293b; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .otp { font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 QuizArena</h1>
          </div>
          <div class="content">
            <h2 style="color: #f1f5f9;">Welcome, ${username}! 🎉</h2>
            <p>Thank you for joining QuizArena! To complete your registration, please verify your email address.</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #94a3b8;">Your verification code:</p>
              <div class="otp">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">This code expires in 10 minutes</p>
            </div>

            <p>Enter this code on the verification page to activate your account and start battling!</p>
            
            <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
              If you didn't create an account with QuizArena, please ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 QuizArena. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset email with OTP
 */
export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  otp: string
) => {
  const mailOptions = {
    from: `"QuizArena" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔒 Reset Your QuizArena Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 32px; }
          .content { padding: 40px 30px; color: #e2e8f0; }
          .otp-box { background: #1e293b; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
          .otp { font-size: 48px; font-weight: bold; color: #ef4444; letter-spacing: 8px; }
          .warning { background: #7f1d1d; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <h2 style="color: #f1f5f9;">Hello, ${username}</h2>
            <p>We received a request to reset your QuizArena password.</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #94a3b8;">Your password reset code:</p>
              <div class="otp">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">This code expires in 10 minutes</p>
            </div>

            <p>Enter this code on the password reset page to create a new password.</p>
            
            <div class="warning">
              <p style="margin: 0; color: #fecaca; font-size: 14px;">
                ⚠️ If you didn't request this password reset, please ignore this email and ensure your account is secure.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 QuizArena. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};