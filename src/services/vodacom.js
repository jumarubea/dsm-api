/**
 * Vodacom Tanzania M-Pesa Open API client (NOT Safaricom Daraja).
 * Auth = API Key + RSA encryption → Session ID. Payment = C2B + status polling.
 *
 * This module is only exercised when mpesaLive is true (MPESA_API_KEY set AND
 * MPESA_LIVE=true). Until Vodacom business registration completes, payments run
 * in manual/external mode and none of this code path executes.
 */
import crypto from 'node:crypto';
import { env, isProduction } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Vodacom's PUBLIC key from the Open API portal (same for all developers).
const VODACOM_PUBLIC_KEY = process.env.MPESA_PUBLIC_KEY || '';

const baseUrl = () => {
  const stage = isProduction ? 'openapi' : 'sandbox';
  return `https://openapi.m-pesa.com/${stage}/ipg/v2/vodacomTZN`;
};

export const encryptApiKey = (apiKey) => {
  const encrypted = crypto.publicEncrypt(
    {
      key: `-----BEGIN PUBLIC KEY-----\n${VODACOM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(apiKey)
  );
  return encrypted.toString('base64');
};

let cachedSessionId = null;
let sessionExpiry = 0;

export const getSessionId = async (now = Date.now()) => {
  if (cachedSessionId && now < sessionExpiry) return cachedSessionId;
  const res = await fetch(`${baseUrl()}/getSession/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${encryptApiKey(env.MPESA_API_KEY)}`, Origin: '*' },
  });
  const data = await res.json();
  if (data.output_ResponseCode !== 'INS-0') {
    throw new AppError(
      `Imeshindwa kupata Session ID ya M-Pesa: ${data.output_ResponseDesc}`,
      502,
      'MPESA_SESSION_FAILED'
    );
  }
  cachedSessionId = data.output_SessionID;
  sessionExpiry = now + 23 * 60 * 60 * 1000;
  return cachedSessionId;
};

export const formatPhoneForVodacom = (phone) => {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) return `255${cleaned.slice(1)}`;
  if (cleaned.startsWith('255')) return cleaned;
  throw new AppError('Nambari ya simu si sahihi.', 400, 'INVALID_PHONE');
};

export const initiateC2BPayment = async ({ amount, customerMSISDN, saleId }) => {
  const sessionId = await getSessionId();
  const body = {
    input_Amount: Math.round(amount),
    input_Country: 'TZN',
    input_Currency: 'TZS',
    input_CustomerMSISDN: formatPhoneForVodacom(customerMSISDN),
    input_ServiceProviderCode: env.MPESA_SERVICE_PROVIDER_CODE,
    input_ThirdPartyConversationID: saleId,
    input_TransactionReference: saleId.slice(0, 12),
    input_PurchasedItemsDesc: 'Malipo ya bidhaa',
  };
  const res = await fetch(`${baseUrl()}/c2bPayment/singleStage/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${encryptApiKey(sessionId)}`,
      'Content-Type': 'application/json',
      Origin: '*',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!['INS-0', 'INS-1'].includes(data.output_ResponseCode)) {
    throw new AppError(
      `Malipo ya M-Pesa yameshindwa: ${data.output_ResponseDesc}`,
      422,
      'MPESA_PAYMENT_FAILED'
    );
  }
  return {
    conversationId: data.output_ConversationID,
    transactionId: data.output_TransactionID,
    responseCode: data.output_ResponseCode,
  };
};

export const queryTransactionStatus = async (conversationId) => {
  const sessionId = await getSessionId();
  const res = await fetch(`${baseUrl()}/queryTransactionStatus/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${encryptApiKey(sessionId)}`,
      'Content-Type': 'application/json',
      Origin: '*',
    },
    body: JSON.stringify({
      input_QueryReference: conversationId,
      input_ServiceProviderCode: env.MPESA_SERVICE_PROVIDER_CODE,
      input_ThirdPartyConversationID: conversationId,
      input_Country: 'TZN',
    }),
  });
  const data = await res.json();
  return { responseCode: data.output_ResponseCode, responseDesc: data.output_ResponseDesc };
};
