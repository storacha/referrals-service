// test/index.spec.ts
import { env, createExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { calculateConversionsAndCredits } from '../src/index';
import { createRefcode, createReferral } from '../src/db';
import Stripe from 'stripe'


function useDummyStripeEnvironmentConstants () {
  const referrerEmail = 'referrer@example.com'
  const referralEmail = 'referral@example.com'
  return { referrerEmail, referralEmail }
}

async function createDummyStripeEnvironment (stripe: Stripe) {
  const { referralEmail, referrerEmail } = useDummyStripeEnvironmentConstants()
  const referralStripeCustomer = await stripe.customers.create({ email: referralEmail })
  const referrerStripeCustomer = await stripe.customers.create({ email: referrerEmail })
  return ({
    referralEmail, referrerEmail, referralStripeCustomer, referrerStripeCustomer
  })
}

async function cleanupDummyStripeEnvironment (stripe: Stripe) {
  const { referrerEmail, referralEmail } = useDummyStripeEnvironmentConstants()
  for (const email of [referralEmail, referrerEmail]) {
    const result = await stripe.customers.search({ query: `email:"${email}"` })
    for (const customer of result.data) {
      await stripe.customers.del(customer.id)
    }
  }
}

async function resetDummyStripeEnvironment (stripe: Stripe) {
  await cleanupDummyStripeEnvironment(stripe)
  await createDummyStripeEnvironment(stripe)
}

// TODO: Work in Progress 
// I'm trying to use Stripe sandboxes to create a static remote environment reliable enough for testing
// the credits and conversions reconciliation logic but haven't finished yet - TBD after we get v1 out the door
describe.skip('conversion and credit cronjob', () => {
  it('checks stripe', async () => {
    const stripe = new Stripe(env.STRIPE_API_KEY)
    // uncomment this to reset the stripe environment
    // await resetDummyStripeEnvironment(stripe)
    const { referralEmail, referrerEmail } = useDummyStripeEnvironmentConstants()
    const refcode = await createRefcode(env.REFERRALS, referrerEmail)
    await createReferral(env.REFERRALS, referralEmail, refcode)
    await stripe.customers.search({ query: `email:"${referralEmail}"` })
    //const stripeCustomer = await stripe.customers.create({email: referralEmail})

    await calculateConversionsAndCredits({} as ScheduledController, env, createExecutionContext())

  })

})