import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const FROM = env.EMAIL_FROM_ADDRESS || 'no-reply@my-net.tech';

/** Build the Kiswahili onboarding email: welcome, login URL, temporary password. */
export const buildOnboardingEmail = ({ shopName, ownerEmail, tempPassword }) => {
  const loginUrl = env.FRONTEND_URL; // single sign-in host; tenant resolved at login
  const subject = 'Karibu Digital Shop Manager';
  const text = [
    'Habari,',
    '',
    `Akaunti ya duka lako "${shopName}" imefunguliwa kwenye Digital Shop Manager.`,
    '',
    `Ingia hapa: ${loginUrl}`,
    `Barua pepe: ${ownerEmail}`,
    `Nenosiri la muda: ${tempPassword}`,
    '',
    'Tafadhali badilisha nenosiri lako mara tu unapoingia.',
    '',
    'Asante.',
  ].join('\n');
  return { from: FROM, to: ownerEmail, subject, text };
};

/** Build the welcome email for self-registered shops (owner set their own password). */
export const buildWelcomeEmail = ({ shopName, ownerEmail }) => {
  const loginUrl = env.FRONTEND_URL;
  const subject = 'Karibu Digital Shop Manager';
  const text = [
    'Habari,',
    '',
    `Akaunti ya duka lako "${shopName}" imefunguliwa kwenye Digital Shop Manager.`,
    '',
    `Ingia hapa: ${loginUrl}`,
    `Barua pepe: ${ownerEmail}`,
    '',
    'Tumia nenosiri ulilochagua wakati wa kujisajili.',
    '',
    'Asante.',
  ].join('\n');
  return { from: FROM, to: ownerEmail, subject, text };
};

/** POST a built message to Resend; no-op + log when no API key is configured. */
const deliver = async (message, label) => {
  if (!env.EMAIL_SERVICE_API_KEY) {
    logger.info({ to: message.to, subject: message.subject }, `${label} NOT sent (no EMAIL_SERVICE_API_KEY)`);
    return { delivered: false, to: message.to, subject: message.subject };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_SERVICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error({ status: res.status, detail }, `${label} send failed`);
      return { delivered: false, to: message.to, subject: message.subject };
    }
    const data = await res.json().catch(() => ({}));
    logger.info({ to: message.to, id: data.id }, `${label} sent`);
    return { delivered: true, to: message.to, subject: message.subject, id: data.id };
  } catch (err) {
    logger.error({ err }, `${label} send error`);
    return { delivered: false, to: message.to, subject: message.subject };
  }
};

/** Welcome email for self-registration — best-effort. */
export const sendWelcomeEmail = (params) => deliver(buildWelcomeEmail(params), 'Welcome email');

/**
 * Send the onboarding email via Resend (https://resend.com) using EMAIL_SERVICE_API_KEY.
 * Until the key is set it is a no-op that just logs — the caller never fails on email.
 */
export const sendOnboardingEmail = async (params) => {
  const message = buildOnboardingEmail(params);

  if (!env.EMAIL_SERVICE_API_KEY) {
    logger.info(
      { to: message.to, subject: message.subject },
      'Onboarding email NOT sent (no EMAIL_SERVICE_API_KEY) — logging instead'
    );
    return { delivered: false, to: message.to, subject: message.subject };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_SERVICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error({ status: res.status, detail }, 'Onboarding email send failed');
      return { delivered: false, to: message.to, subject: message.subject };
    }
    const data = await res.json().catch(() => ({}));
    logger.info({ to: message.to, id: data.id }, 'Onboarding email sent');
    return { delivered: true, to: message.to, subject: message.subject, id: data.id };
  } catch (err) {
    logger.error({ err }, 'Onboarding email send error');
    return { delivered: false, to: message.to, subject: message.subject };
  }
};
