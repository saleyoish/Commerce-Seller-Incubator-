// Test script to verify Resend is working
const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;

console.log('API Key exists:', !!resendApiKey);
console.log('API Key starts with:', resendApiKey?.substring(0, 10) + '...');

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY is missing!');
  console.log('Add this to .env.local: RESEND_API_KEY=re_xxxxxxxx');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function testEmail() {
  try {
    console.log('Sending test email...');
    
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'imrabiariazdev@gmail.com', // Change to your email
      subject: 'Test from TikTok Shop App',
      html: '<p>This is a test email to verify Resend is working!</p>',
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return;
    }

    console.log('✅ Email sent! ID:', data?.id);
    console.log('Check your inbox (and spam folder)');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testEmail();
