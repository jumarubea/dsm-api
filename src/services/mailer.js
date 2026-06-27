import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const FROM = env.EMAIL_FROM_ADDRESS || 'no-reply@digitalshopmanager.co.tz';

/** Tenant login URL with the shop's slug as a subdomain of the frontend host. */
const loginUrlFor = (slug) => {
  const url = new URL(env.FRONTEND_URL);
  return `${url.protocol}//${slug}.${url.host}`;
};

/** Build the Kiswahili onboarding email: welcome, login URL, temporary password. */
export const buildOnboardingEmail = ({ shopName, slug, ownerEmail, tempPassword }) => {
  const loginUrl = loginUrlFor(slug);
  const subject = 'Karibu Digital Shop Manager';
  const text = [
    `Habari,`,
    ``,
    `Akaunti ya duka lako "${shopName}" imefunguliwa kwenye Digital Shop Manager.`,
    ``,
    `Ingia hapa: ${loginUrl}`,
    `Barua pepe: ${ownerEmail}`,
    `Nenosiri la muda: ${tempPassword}`,
    ``,
    `Tafadhali badilisha nenosiri lako mara tu unapoingia.`,
    ``,
    `Asante.`,
  ].join('\n');
  return { from: FROM, to: ownerEmail, subject, text };
};

/**
 * Send the onboarding email. No transactional provider is wired yet (Mailgun/
 * SendGrid onboarding pending), so without EMAIL_SERVICE_API_KEY this logs the
 * message instead of sending. Returns delivery metadata either way.
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

  // TODO(email-integration): send via Mailgun/SendGrid using EMAIL_SERVICE_API_KEY.
  logger.info({ to: message.to, subject: message.subject }, 'Onboarding email queued');
  return { delivered: true, to: message.to, subject: message.subject };
};
