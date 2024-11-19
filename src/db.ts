import { customAlphabet } from 'nanoid'

// 16 characters from this alphabet is plenty safe enough - per https://zelark.github.io/nano-id-cc/
// "399B IDs needed, in order to have a 1% probability of at least one collision."
const REFCODE_LENGTH = 16
// from https://github.com/CyberAP/nanoid-dictionary - "This list should protect you from accidentally getting obscene words in generated strings."
const nanoid = customAlphabet("6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz")

const generateRefcode = () => nanoid(REFCODE_LENGTH)

export async function createReferral(db: D1Database, email: string, refcode: string){
	const insertStmt = db.prepare(`
	INSERT INTO referrals (email, refcode) 
	VALUES (?, ?)
	`).bind(email, refcode)
	const result = await insertStmt.run()
  if (result.error){
    throw result.error
  }
}

export async function listReferrals (db: D1Database, refcode: string) {
  const response = await db.prepare(`
    SELECT referred_at, rewarded FROM referrals
    WHERE refcode = ?
    `).
    bind(refcode).
    all();
  return response.results.map(result => ({
    referredAt: result.referred_at,
    reward: Boolean(result.reward)
  }))
}

export async function createRefcode (db: D1Database, email: string): Promise<string> {
  const refcode = generateRefcode()
  const insertStmt = db.prepare(`
	INSERT INTO users (email, refcode) 
	VALUES (?, ?)
	`).bind(email, refcode)
  const result = await insertStmt.run()
  if (result.error) {
    throw result.error
  }
  return refcode
}

export async function getRefcode (db: D1Database, email: string): Promise<string | null> {
  const result = await db.prepare(`SELECT refcode FROM users WHERE email = ?`).
    bind(email).
    first()
  return result ? result.refcode as string : null
}

export async function getReferredBy (db: D1Database, email: string): Promise<string | null> {
  const result = await db.prepare(`SELECT refcode FROM referrals WHERE email = ?`).
    bind(email).
    first()
  return result ? result.refcode as string : null
}

