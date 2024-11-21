import { Router, RouterHandler } from '@tsndr/cloudflare-worker-router'
import Stripe from 'stripe'
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { createRefcode, createReferral, getRefcode, getReferredBy, listReferrals } from './db'

type RSRouterHandler = RouterHandler<Env>

const referralCreate: RSRouterHandler = async function (
  { req, env }
) {
  const form = await req.formData()
  const email = form.get('email')?.toString()
  const refcode = form.get('refcode')?.toString()
  if (!email){
    return new Response('invalid email', { status: 400 })
  } else if (!refcode) {
    return new Response('invalid refcode', { status: 400 })
  } else {
    await createReferral(env.REFERRALS, email, refcode)
    return Response.json({})
  }
}

const referralList: RSRouterHandler = async function (
  { req, env }
) {
  const refcode = decodeURIComponent(req.params.refcode)
  return Response.json({
    referrals: await listReferrals(env.REFERRALS, refcode)
  })
}

export const refcodeCreate: RSRouterHandler = async function (
  { req, env }
) {
  const form = await req.formData()
  const email = form.get('email')?.toString()
  if (email) {
    return Response.json({
      refcode: await createRefcode(
        env.REFERRALS,
        email
      )
    })
  } else {
    return new Response('invalid email', { status: 400 })
  }
}

const refcodeGet: RSRouterHandler = async function (
  { req, env }
) {
  return Response.json({
    refcode: await getRefcode(
      env.REFERRALS,
      decodeURIComponent(req.params.email)
    )
  })
}

const referredByGet: RouterHandler = async function (
  { req, env }
) {
  return Response.json({
    refcode: await getReferredBy(
      env.REFERRALS,
      decodeURIComponent(req.params.email)
    )
  })
}

const router = new Router<Env, ExecutionContext, Request>()
// TODO: need to update to allow different origins in different envs
router.get('/referrals/:refcode', referralList)
router.post('/referrals/create', referralCreate)
router.post('/refcode/create', refcodeCreate)
router.get('/refcode/:email', refcodeGet)
router.get('/referredby/:email', referredByGet)

export async function calculateConversionsAndCredits (event: ScheduledController, env: Env, context: ExecutionContext) {
  const result = await env.REFERRALS.prepare(
    `SELECT email FROM referrals WHERE NOT rewarded`
  ).run()
  if (result.error) {
    throw result.error
  } else {
    const emails = result.results.map(r => r.email)
    if (emails.length > 0) {
      const stripe = new Stripe(env.STRIPE_API_KEY)
      const query = "email: '" + emails.join("' OR email: '") + "'"
      console.log(query)
      const searchResult = await stripe.customers.search({ query })
      console.log("STRIPE:", searchResult)
      // TODO: calculate credits and conversions from stripe and the referrals db
    } else {
      console.log("NOTHING TO CHECK")
    }
  }
}

export default {
  async fetch (request, env, ctx): Promise<Response> {
    router.cors({ allowOrigin: env.ALLOW_ORIGIN })
    return router.handle(request, env, ctx)
  },

  async scheduled (event, env, ctx) {
    ctx.waitUntil(calculateConversionsAndCredits(event, env, ctx))
  },
} satisfies ExportedHandler<Env>;
