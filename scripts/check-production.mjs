import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });

// Reports configuration status only; never prints secrets or contacts providers.
const env = process.env;
const checks = [];
const present = (key) => Boolean(env[key]?.trim()) && !/^(your_|replace_|change_me)/i.test(env[key]);
function check(name, ok, action) { checks.push({ name, status: ok ? 'pass' : 'required', ...(ok ? {} : { action }) }); }
check('Database URL', present('DATABASE_URL'), 'Configure the deployment DATABASE_URL.');
check('JWT signing secret', present('JWT_SECRET') && env.JWT_SECRET.length >= 32, 'Use a randomly generated JWT_SECRET of at least 32 characters.');
check('Refresh-token signing secret', present('JWT_REFRESH_SECRET') && env.JWT_REFRESH_SECRET.length >= 32 && env.JWT_REFRESH_SECRET !== env.JWT_SECRET, 'Use a separate randomly generated JWT_REFRESH_SECRET of at least 32 characters.');
check('Maintenance endpoint secret', present('CRON_SECRET') && env.CRON_SECRET.length >= 32, 'Configure a strong CRON_SECRET and the authenticated scheduler.');
check('Redis abuse protection', present('REDIS_URL') && /^rediss?:\/\//.test(env.REDIS_URL), 'Configure a reachable Redis service.');
let publicUrl;
try { publicUrl = new URL(env.NEXT_PUBLIC_APP_URL); } catch { /* report below */ }
check('Public production URL', publicUrl?.protocol === 'https:' && !/localhost|127\.0\.0\.1|ngrok|trycloudflare/.test(publicUrl.hostname), 'Set NEXT_PUBLIC_APP_URL to your final HTTPS domain and rebuild.');
check('Live payment key', /^rzp_live_/.test(env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '') && present('RAZORPAY_KEY_SECRET'), 'Configure the matching live Razorpay key pair after completing test-mode payment checks.');
check('Dedicated payment webhook secret', present('RAZORPAY_WEBHOOK_SECRET') && env.RAZORPAY_WEBHOOK_SECRET !== env.RAZORPAY_KEY_SECRET, 'Configure the webhook signing secret separately from the API secret.');
check('Email provider', present('RESEND_API_KEY') && present('FROM_EMAIL') && !env.FROM_EMAIL.includes('resend.dev'), 'Configure Resend and a verified sender domain.');
check('Phone authentication', ['MSG91_AUTH_KEY', 'NEXT_PUBLIC_MSG91_WIDGET_ID', 'NEXT_PUBLIC_MSG91_TOKEN_AUTH'].every(present), 'Configure MSG91 server credentials and the authorized widget.');
check('Google authentication', ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].every(present), 'Configure OAuth credentials and final-domain callbacks.');
check('Production courier', env.DELHIVERY_ENV === 'production' && (present('DELHIVERY_PRODUCTION_API_TOKEN') || present('DELHIVERY_API_TOKEN')) && present('DELHIVERY_PICKUP_LOCATION_NAME'), 'Verify the production courier token and registered pickup location.');
console.log(JSON.stringify({ mode: 'configuration-only; provider delivery and scheduler execution are not verified', checks }, null, 2));
if (checks.some((entry) => entry.status !== 'pass')) process.exitCode = 1;
