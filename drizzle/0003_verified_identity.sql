ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
-- Only phone-only identities are known to have completed phone sign-in in the old model.
UPDATE users SET phone = '+91' || RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10), phone_verified_at = NOW()
WHERE email IS NULL AND is_verified = true AND phone IS NOT NULL AND phone_verified_at IS NULL;
-- Abort rather than silently choose an identity when historical verified phones collide.
CREATE UNIQUE INDEX IF NOT EXISTS users_verified_phone_unique ON users(phone) WHERE phone_verified_at IS NOT NULL;
