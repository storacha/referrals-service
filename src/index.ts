import { Router, RouterHandler } from '@tsndr/cloudflare-worker-router'

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

import { customAlphabet } from 'nanoid'

// 16 characters from this alphabet is plenty safe enough - per https://zelark.github.io/nano-id-cc/
// "399B IDs needed, in order to have a 1% probability of at least one collision."
const REFCODE_LENGTH = 16
// from https://github.com/CyberAP/nanoid-dictionary - "This list should protect you from accidentally getting obscene words in generated strings."
const nanoid = customAlphabet("6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz")

const generateRefcode = () => nanoid(REFCODE_LENGTH)

type RSRouterHandler = RouterHandler<Env>

const referralCreate: RSRouterHandler = async function (
	{ req, env }
) {
	const form = await req.formData()
	const email = form.get('email')
	const refcode = form.get('refcode')
	const referralsDB = env.REFERRALS
	const insertStmt = referralsDB.prepare(`
	INSERT INTO referrals (email, refcode) 
	VALUES (?, ?)
	`).bind(email, refcode)
	const result = await insertStmt.run()
	if (result.error) {
		return new Response(result.error, { status: 500 })
	}
	return Response.json({})
}

const referralList: RSRouterHandler = async function (
	{ req, env }
) {
	const refcode = decodeURIComponent(req.params.refcode)
	const referralsDB = env.REFERRALS
	const response = await referralsDB.prepare(`
    SELECT referred_at, reward FROM referrals
    WHERE refcode = ?
    `).
		bind(refcode).
		all();
	const referrals = response.results.map(result => ({
		referredAt: result.referred_at,
		reward: Boolean(result.reward)
	}))
	return Response.json({ referrals })
}

export const refcodeCreate: RSRouterHandler = async function (
	{ req, env }
) {
	const form = await req.formData()
	const email = form.get('email')
	const refcode = generateRefcode()
	const referralsDB = env.REFERRALS
	const insertStmt = referralsDB.prepare(`
	INSERT INTO users (email, refcode) 
	VALUES (?, ?)
	`).bind(email, refcode)
	const result = await insertStmt.run()
	if (result.error) {
		return new Response(result.error, { status: 500 })
	}
	return Response.json({
		refcode
	})
}

const refcodeGet: RSRouterHandler = async function (
	{ req, env }
) {
	const email = decodeURIComponent(req.params.email)
	const result = await env.REFERRALS.
		prepare(`SELECT refcode FROM users WHERE email = ?`).
		bind(email).
		first()
	return Response.json({
		refcode: result?.refcode
	})
}

const referredByGet: RouterHandler = async function (
	{ req, env }
) {
	const email = req.params.email
	const result = await env.REFERRALS.
		prepare(`SELECT refcode FROM referrals WHERE email = ?`).
		bind(email).
		first()
	return Response.json({
		refcode: result?.refcode
	})
}

const router = new Router<Env, ExecutionContext, Request>()
router.cors({ allowOrigin: 'http://localhost:3000' })
router.get('/referrals/:refcode', referralList)
router.post('/referrals/create', referralCreate)
router.post('/refcode/create', refcodeCreate)
router.get('/refcode/:email', refcodeGet)
router.get('/referredby/:email', referredByGet)

export default {
	async fetch (request, env, ctx): Promise<Response> {
		return router.handle(request, env, ctx)
	},
} satisfies ExportedHandler<Env>;
