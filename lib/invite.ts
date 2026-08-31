import { customAlphabet } from "nanoid"

/// Crockford-style alphabet: no I, L, O, U, or 0/1, so a code read aloud or
/// typed from a screenshot cannot be misheard.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"

const generateCode = customAlphabet(CODE_ALPHABET, 8)
const generateToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  32
)

/// The short code is what someone types; the long token is what goes in a
/// copyable link. Keeping them separate means a shared link cannot be guessed
/// by brute-forcing the eight-character code.
export function newInviteCode() {
  return generateCode()
}

export function newInviteToken() {
  return generateToken()
}

/// Accepts what people actually paste: lower case, spaces, dashes, a full
/// invite URL. Characters outside the alphabet are dropped rather than
/// substituted — none of them can be a genuine code character.
export function normaliseInviteCode(input: string) {
  const tail = input.trim().split("/").pop() ?? ""
  return tail
    .toUpperCase()
    .split("")
    .filter((character) => CODE_ALPHABET.includes(character))
    .join("")
    .slice(0, 8)
}

export function inviteLink(token: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/join/${token}`
}
