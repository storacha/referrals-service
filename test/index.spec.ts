// test/index.spec.ts
import { env, applyD1Migrations, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker from '../src/index';
import { create } from 'domain';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

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
