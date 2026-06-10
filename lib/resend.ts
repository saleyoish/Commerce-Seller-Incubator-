import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Lazy initialization - don't throw on import
let resendInstance: Resend | null = null;

export const getResend = () => {
  if (!resendInstance) {
    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY environment variable');
      return null;
    }
    resendInstance = new Resend(resendApiKey);
  }
  return resendInstance;
};

// Email templates
export const sendSellerSignupConfirmation = async (to: string, sellerName: string) => {
  try {
    const resend = getResend();
    if (!resend) throw new Error('Resend not initialized');
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Welcome to Live Commerce Platform',
      html: `
        <h1>Welcome to Live Commerce!</h1>
        <p>Hi ${sellerName},</p>
        <p>Thank you for signing up as a seller. Your account is currently pending admin approval.</p>
        <p>Next steps:</p>
        <ol>
          <li>Complete your Stripe Connect onboarding</li>
          <li>Wait for admin approval</li>
          <li>Upload your products</li>
          <li>Start selling!</li>
        </ol>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send signup confirmation:', error);
  }
};

export const sendSellerApprovalNotification = async (to: string, sellerName: string, approved: boolean) => {
  try {
    const resend = getResend();
    if (!resend) throw new Error('Resend not initialized');
    const status = approved ? 'approved' : 'rejected';
    const subject = approved 
      ? 'Your Seller Account Has Been Approved!' 
      : 'Update on Your Seller Application';
    const message = approved
      ? 'Congratulations! Your seller account has been approved. You can now start uploading products and going live.'
      : 'We regret to inform you that your seller application has been rejected. Please contact support for more information.';

    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: `
        <h1>Account ${status}</h1>
        <p>Hi ${sellerName},</p>
        <p>${message}</p>
        ${approved ? '<p><a href="/dashboard">Go to Dashboard</a></p>' : ''}
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send approval notification:', error);
  }
};

export const sendSaleNotification = async (to: string, sellerName: string, productName: string, amount: number) => {
  try {
    const resend = getResend();
    if (!resend) throw new Error('Resend not initialized');
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'New Sale!',
      html: `
        <h1>You Made a Sale!</h1>
        <p>Hi ${sellerName},</p>
        <p>Great news! Someone just purchased your product:</p>
        <ul>
          <li><strong>Product:</strong> ${productName}</li>
          <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
        </ul>
        <p>The sale is being processed and will be included in your next payout.</p>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send sale notification:', error);
  }
};

export const sendPayoutNotification = async (to: string, sellerName: string, amount: number) => {
  try {
    const resend = getResend();
    if (!resend) throw new Error('Resend not initialized');
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Payout Initiated',
      html: `
        <h1>Payout Initiated</h1>
        <p>Hi ${sellerName},</p>
        <p>A payout of <strong>$${amount.toFixed(2)}</strong> has been initiated to your connected bank account.</p>
        <p>It may take 1-2 business days to appear in your account.</p>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send payout notification:', error);
  }
};

export const sendAdminNewSellerNotification = async (adminEmail: string, sellerEmail: string, sellerPhone: string) => {
  try {
    const resend = getResend();
    if (!resend) throw new Error('Resend not initialized');
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: 'New Seller Registration - Approval Required',
      html: `
        <h1>New Seller Signed Up</h1>
        <p>A new seller has registered and is pending your approval.</p>
        <ul>
          <li><strong>Email:</strong> ${sellerEmail}</li>
          <li><strong>Phone:</strong> ${sellerPhone}</li>
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/sellers" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review & Approve</a></p>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  try {
    const resend = getResend();
    if (!resend) {
      console.error('Resend not initialized - check RESEND_API_KEY env variable');
      return { success: false, error: 'Email service not configured' };
    }
    console.log('Sending password reset email to:', to, 'from:', fromEmail);
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Hi there,</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
    console.log('Resend API response:', result);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    console.error('Resend from email:', fromEmail);
    console.error('Resend API key configured:', !!resendApiKey);
    return { success: false, error: error?.message || 'Unknown error' };
  }
};
