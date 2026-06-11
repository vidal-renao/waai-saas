const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /api[_-]?key/i,
  /auth/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
];

const SENSITIVE_VALUE_PREFIXES = [
  "sk-",       // OpenAI/Stripe secret keys
  "pk-",       // Stripe publishable (still don't log)
  "whsec_",    // Stripe webhook secret
  "EAA",       // Meta access tokens
  "Bearer ",   // Authorization headers
  "sk-ant-",   // Anthropic keys
  "supabase",  // Supabase role keys (partial)
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PREFIXES.some((p) => value.startsWith(p));
}

function redactString(key: string, value: string): string {
  if (isSensitiveKey(key) || isSensitiveValue(value)) return "[REDACTED]";

  // Phone numbers: show last 4 digits
  if (/^\+?[0-9]{10,15}$/.test(value)) {
    return `***${value.slice(-4)}`;
  }

  // Emails: redact local part, keep domain
  const emailMatch = /^([^@]+)@(.+)$/.exec(value);
  if (emailMatch) {
    return `${emailMatch[1].charAt(0)}***@${emailMatch[2]}`;
  }

  return value;
}

export function redactSecrets(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      result[k] = v;
    } else if (typeof v === "string") {
      result[k] = redactString(k, v);
    } else if (typeof v === "object" && !Array.isArray(v)) {
      result[k] = redactSecrets(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}
