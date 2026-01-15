/**
 * Stripe Client Module - AGPL-3.0 Licensed
 *
 * DI module for Stripe client initialization.
 *
 * @module @calcom/features/billing/di/modules
 * @license AGPL-3.0
 */

import Stripe from "stripe";

import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { DI_TOKENS } from "../tokens";
import process from "node:process";

export const stripeClientModule = createModule();
const token = DI_TOKENS.STRIPE_CLIENT;

/**
 * Creates a deep proxy that only throws when a Stripe function is invoked.
 * Property access (e.g. stripe.customers, stripe.customers.create) returns another proxy so that
 * code doing capability checks (typeof stripe.customers?.create === "function") does not immediately throw.
 */
function createLazyThrowingStripeStub(error: Error): Stripe {
  function makeDeepProxy(): unknown {
    return new Proxy(() => {}, {
      get() {
        return makeDeepProxy();
      },
      apply() {
        throw error;
      },
    });
  }
  return makeDeepProxy() as Stripe;
}

stripeClientModule.bind(token).toFactory(() => {
  if (!process.env.STRIPE_PRIVATE_KEY) {
    const error = new Error("STRIPE_PRIVATE_KEY is not set");
    return createLazyThrowingStripeStub(error);
  }

  return new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
    apiVersion: "2020-08-27",
  });
});

export const stripeClientModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(token, stripeClientModule);
  },
};
