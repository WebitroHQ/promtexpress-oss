// Public input length caps. Used by API Zod schemas and client UI alike.
// Server is the authoritative validator; the client mirrors these values to
// surface counters and disable submit before the request leaves the browser.

export const INTENT_MIN_LEN = 3;
export const INTENT_MAX_LEN = 4000;

export const FEEDBACK_MIN_LEN = 1;
export const FEEDBACK_MAX_LEN = 2000;
