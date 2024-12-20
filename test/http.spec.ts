import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

async function createRefcode(email: string){
  const form = new FormData()
  form.append('email', email)
  return SELF.fetch('http://example.com/refcode/create',
    { method: 'POST', body: form }
  );
}

async function createReferral(refcode: string, email: string){
  return SELF.fetch('http://example.com/referrals/create',
    {
      method: 'POST',
      body: (() => {
        const form = new FormData()
        form.append('refcode', refcode)
        form.append('email', email)
        return form
      })()
    }
  )
}

async function getReferrals(refcode: string){
  return SELF.fetch(`http://example.com/referrals/${encodeURIComponent(refcode)}`)
}

async function getRefcode(email: string){
  return SELF.fetch(`http://example.com/refcode/${encodeURIComponent(email)}`)
}

async function getReferredBy(email: string){
  return SELF.fetch(`http://example.com/referredby/${encodeURIComponent(email)}`);
}

describe('the referral service', () => {
  it('creates a refcode successfully', async () => {
    const email = 'test@example.com'
    const createResponse = await createRefcode(email)
    expect(await createResponse.json()).toHaveProperty('refcode');

    const getResponse = await getRefcode(email);
    expect(await getResponse.json()).toHaveProperty('refcode');
  });

  it('creates a referral successfully', async () => {

    // create a refcode
    const email = 'test@example.com'
    const createRefcodeResponse = await createRefcode(email);
    const refcode = (await createRefcodeResponse.json() as any).refcode as string

    // there shouldn't be any referrals yet
    let referralsResponse = await getReferrals(refcode);
    let referralsResponseJson = await referralsResponse.json() as any
    expect(referralsResponseJson).toHaveProperty('referrals');
    expect(referralsResponseJson.referrals).toBeInstanceOf(Array);
    expect(referralsResponseJson.referrals).toHaveLength(0)

    // create a referral
    const newUserEmail = 'newuser@example.com'
    await createReferral(refcode, newUserEmail)

    // now there should be one referral
    referralsResponse = await getReferrals(refcode)
    referralsResponseJson = await referralsResponse.json() as any
    expect(referralsResponseJson).toHaveProperty('referrals');
    expect(referralsResponseJson.referrals).toBeInstanceOf(Array);
    expect(referralsResponseJson.referrals).toHaveLength(1)

    const referredByResponse = await getReferredBy(newUserEmail)
    const referredByResponseJson = await referredByResponse.json() as any
    expect(referredByResponseJson).toHaveProperty('refcode')
  });

  it('can create multiple referrals with the same refcode', async () => {

    // create a refcode
    const email = 'test@example.com'
    const createRefcodeResponse = await createRefcode(email);
    const refcode = (await createRefcodeResponse.json() as any).refcode as string

    // create a referral
    const newUserEmail = 'newuser@example.com'
    await createReferral(refcode, newUserEmail)
    const secondNewUserEmail = 'secondnewuser@example.com'
    await createReferral(refcode, secondNewUserEmail);

    // now there should be two referrals
    const referralsResponse = await getReferrals(refcode)
    const referralsResponseJson = await referralsResponse.json() as any
    expect(referralsResponseJson).toHaveProperty('referrals');
    expect(referralsResponseJson.referrals).toBeInstanceOf(Array);
    expect(referralsResponseJson.referrals).toHaveLength(2)

    const secondReferredByResponse = await getReferredBy(secondNewUserEmail)
    const secondReferredByResponseJson = await secondReferredByResponse.json() as any
    expect(secondReferredByResponseJson).toHaveProperty('refcode')
  });

  it('will not create a referral for an email that has already been referred', async () => {

    // create a refcode
    const email = 'test@example.com'
    const createRefcodeResponse = await createRefcode(email);
    const refcode = (await createRefcodeResponse.json() as any).refcode as string

    // create a referral
    const newUserEmail = 'newuser@example.com'
    await createReferral(refcode, newUserEmail)

    // creating a referral for the same refcode and email should 400
    const sameRefcodeSameEmailResponse = await createReferral(refcode, newUserEmail);
    expect(sameRefcodeSameEmailResponse.status).toBe(400)

    // create a second refcode
    const secondEmail = 'test2@example.com'
    const secondCreateRefcodeResponse = await createRefcode(secondEmail);
    const secondRefcode = (await secondCreateRefcodeResponse.json() as any).refcode as string

    // creating a referral for a different refcode and but the same email should 400
    const sameRefcodeDifferentEmailResponse = await createReferral(secondRefcode, newUserEmail);
    expect(sameRefcodeDifferentEmailResponse.status).toBe(400)

    // there should only be 1 referral
    const referralsResponse = await getReferrals(refcode)
    const referralsResponseJson = await referralsResponse.json() as any
    expect(referralsResponseJson).toHaveProperty('referrals');
    expect(referralsResponseJson.referrals).toBeInstanceOf(Array);
    expect(referralsResponseJson.referrals).toHaveLength(1)

    const referredByResponse = await getReferredBy(newUserEmail)
    const secondReferredByResponseJson = await referredByResponse.json() as any
    expect(secondReferredByResponseJson).toHaveProperty('refcode')
    expect(secondReferredByResponseJson.refcode).toEqual(refcode)

  });

  it('will not create a referral for the user who created the refcode', async () => {

    // create a refcode
    const email = 'test@example.com'
    const form = new FormData()
    form.append('email', email)
    const createRefcodeResponse = await createRefcode(email)
    const refcode = (await createRefcodeResponse.json() as any).refcode as string

    const response = await createReferral(refcode, email)
    expect(response.status).toBe(400)
  })
});


