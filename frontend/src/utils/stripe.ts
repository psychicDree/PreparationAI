import { loadStripe, type Stripe } from '@stripe/stripe-js';
import config from '../config';

/** True when real card payments are switched on and a publishable key is set. */
export const paymentsEnabled = (): boolean =>
  config.features.enablePayments && Boolean(config.stripe.publishableKey);

let stripePromise: Promise<Stripe | null> | null = null;

/** Loads Stripe.js once, on first use, so pages without checkout never fetch it. */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(config.stripe.publishableKey);
  }
  return stripePromise;
};
