import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER || 'theabdulmuqeet@gmail.com';
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || 'rkbylzdchkmwbzth';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
};

// Generate random password
export const generatePassword = (length: number = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Send email template: New account created notification to seller (NO PASSWORD - password sent on approval)
export const sendAccountCreatedToSeller = async (
  to: string,
  name: string
) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Live Commerce Platform" <${gmailUser}>`,
      to,
      subject: 'Your Account Has Been Created - Awaiting Admin Approval',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Live Commerce!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <h2>Hi ${name},</h2>
            <p>Great news! Your seller account has been <strong>created successfully</strong>.</p>
            
            <div style="background: #fffbeb; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #b45309;">Pending Approval</h3>
              <p style="margin: 10px 0; color: #92400e;">Your account is currently under review by our admin team.</p>
              <p style="margin: 10px 0; color: #92400e;"><strong>You will receive your login credentials via email once your account is approved.</strong></p>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ol style="line-height: 1.8;">
              <li>Our admin team will review your application</li>
              <li>Once approved, you will receive an email with your login credentials</li>
              <li>Then you can log in and start selling!</li>
            </ol>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              If you have any questions, please contact our support team.
            </p>
            
            <p>Best regards,<br><strong>Live Commerce Team</strong></p>
          </div>
        </div>
      `,
    });
    
    console.log('Account created email sent to seller:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send account created email to seller:', error);
    return { success: false, error };
  }
};

// Send email template: New seller notification to admin
export const sendNewSellerNotificationToAdmin = async (
  adminEmail: string,
  sellerName: string,
  sellerEmail: string,
  sellerPhone: string,
  whatYouSell: string,
  hasLiveExperience: boolean
) => {
  try {
    const transporter = createTransporter();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    await transporter.sendMail({
      from: `"Live Commerce Platform" <${gmailUser}>`,
      to: adminEmail,
      subject: 'New Seller Registration - Approval Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">New Seller Registration</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>A new seller has registered and is <strong>pending your approval</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Seller Details</h3>
              <p style="margin: 10px 0;"><strong>Name:</strong> ${sellerName}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${sellerEmail}</p>
              <p style="margin: 10px 0;"><strong>Phone:</strong> ${sellerPhone}</p>
              <p style="margin: 10px 0;"><strong>Products:</strong> ${whatYouSell}</p>
              <p style="margin: 10px 0;"><strong>Live Experience:</strong> ${hasLiveExperience ? 'Yes' : 'No'}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/admin/waitlist" 
                 style="display: inline-block; background: #7C3AED; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Review & Approve
              </a>
            </div>
            
            <p>Best regards,<br><strong>Live Commerce Platform</strong></p>
          </div>
        </div>
      `,
    });
    
    console.log('New seller notification sent to admin:', adminEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return { success: false, error };
  }
};

// Send email template: Account approved with credentials
// Send email template: Referral approved notification to referrer
export const sendReferralApprovalEmailToSeller = async (
  referrerEmail: string,
  referredName: string,
  referredEmail: string,
  bonusAmount: number = 50
) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Live Commerce Platform" <${gmailUser}>`,
      to: referrerEmail,
      subject: 'Great News! Your Referral Has Been Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Referral Bonus Earned!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <h2>Hi ${referrerEmail.split('@')[0]},</h2>
            <p>Exciting news! Your referral <strong>${referredName}</strong> has been <strong style="color: #10B981;">APPROVED</strong> as a seller.</p>
            
            <div style="background: #ecfdf5; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #047857;">Your Referral Bonus</h3>
              <p style="margin: 10px 0;"><strong>Bonus Amount:</strong> $${bonusAmount}</p>
              <p style="margin: 10px 0;"><strong>Referred:</strong> ${referredName} (${referredEmail})</p>
              <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #10B981;">Approved</span></p>
            </div>
            
            <p style="margin: 20px 0;"><strong>What happens next?</strong></p>
            <ol style="line-height: 1.8;">
              <li>The bonus will be added to your account balance</li>
              <li>You can track all your referrals in your dashboard</li>
              <li>Keep referring new sellers to earn more bonuses!</li>
            </ol>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              Thank you for helping grow our community!
            </p>
            
            <p>Best regards,<br><strong>Live Commerce Team</strong></p>
          </div>
        </div>
      `,
    });
    
    console.log('Referral approval email sent to referrer:', referrerEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send referral approval email:', error);
    return { success: false, error };
  }
};

// Send email template: Account approved with credentials
export const sendApprovalEmailToSeller = async (
  to: string,
  name: string,
  email: string,
  password: string
) => {
  try {
    const transporter = createTransporter();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    await transporter.sendMail({
      from: `"Live Commerce Platform" <${gmailUser}>`,
      to,
      subject: 'Your Account Has Been Approved - Start Selling Now!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Congratulations!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <h2>Hi ${name},</h2>
            <p>Excellent news! Your seller account has been <strong style="color: #10B981;">APPROVED</strong> by our admin team.</p>
            
            <div style="background: #ecfdf5; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #047857;">Your Login Credentials</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Password:</strong> ${password}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/login" 
                 style="display: inline-block; background: #10B981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ol style="line-height: 1.8;">
              <li>Log in to your dashboard</li>
              <li>Complete your profile and Stripe onboarding</li>
              <li>Upload your products</li>
              <li>Schedule your first live stream!</li>
            </ol>
            
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              You can change your password anytime from your account settings.
            </p>
            
            <p>Welcome to the team!<br><strong>Live Commerce Team</strong></p>
          </div>
        </div>
      `,
    });
    
    console.log('Approval email with credentials sent to seller:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send approval email:', error);
    return { success: false, error };
  }
};
