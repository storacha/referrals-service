// test/index.spec.ts
import { env, createExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import { calculateConversionsAndCredits } from '../src/index';
import { createRefcode, createReferral } from '../src/db';
import Stripe from 'stripe'

describe('Refcode creation', () => {
	it('creates a refcode successfully', async () => {
		const email = 'test@example.com'
		const form = new FormData()
		form.append('email', email)
		const createResponse = await SELF.fetch('http://example.com/refcode/create',
			{ method: 'POST', body: form }
		);
		expect(await createResponse.json()).toHaveProperty('refcode');

		const getResponse = await SELF.fetch(`http://example.com/refcode/${encodeURIComponent(email)}`);
		expect(await getResponse.json()).toHaveProperty('refcode');
	});

	it('creates a referral successfully', async () => {

		// create a refcode
		const email = 'test@example.com'
		const form = new FormData()
		form.append('email', email)
		const createRefcodeResponse = await SELF.fetch('http://example.com/refcode/create',
			{
				method: 'POST',
				body: (() => {
					const form = new FormData()
					form.append('email', email)
					return form
				})()
			}
		);
		const refcode = (await createRefcodeResponse.json() as any).refcode as string

		// there shouldn't be any referrals yet
		let referralsResponse = await SELF.fetch(`http://example.com/referrals/${encodeURIComponent(refcode)}`);
		let referralsResponseJson = await referralsResponse.json() as any
		console.log(referralsResponseJson)
		expect(referralsResponseJson).toHaveProperty('referrals');
		expect(referralsResponseJson.referrals).toBeInstanceOf(Array);
		expect(referralsResponseJson.referrals).toHaveLength(0)

		// create a referral
		const newUserEmail = 'newuser@example.com'
		await SELF.fetch('http://example.com/referrals/create',
			{
				method: 'POST',
				body: (() => {
					const form = new FormData()
					form.append('refcode', refcode)
					form.append('email', newUserEmail)
					return form
				})()
			}
		);

		// now there should be one referral
		referralsResponse = await SELF.fetch(`http://example.com/referrals/${encodeURIComponent(refcode)}`);
		referralsResponseJson = await referralsResponse.json() as any
		expect(referralsResponseJson).toHaveProperty('referrals');
		expect(referralsResponseJson.referrals).toBeInstanceOf(Array);
		expect(referralsResponseJson.referrals).toHaveLength(1)


		const referredByResponse = await SELF.fetch(`http://example.com/referredby/${encodeURIComponent(newUserEmail)}`);
		const referredByResponseJson = await referredByResponse.json() as any
		expect(referredByResponseJson).toHaveProperty('refcode')


	});
});

function useDummyStripeEnvironmentConstants () {
	const referrerEmail = 'referrer@example.con'
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

describe('conversion and credit cronjob', () => {
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