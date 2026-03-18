function stripInternationalPrefix(digits: string) {
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  return digits;
}

function stripLeadingTrunkZero(digits: string) {
  if (!digits.startsWith("0")) {
    return digits;
  }

  return digits.replace(/^0+/, "");
}

function looksLikeBrazilianLocalPhone(digits: string) {
  if (digits.length !== 10 && digits.length !== 11) {
    return false;
  }

  const ddd = Number(digits.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) {
    return false;
  }

  if (digits.length === 11) {
    return digits[2] === "9";
  }

  return /[2-9]/.test(digits[2] ?? "");
}

export function normalizeWhatsAppPhone(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return "";
  }

  const hasExplicitPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (!hasExplicitPlus) {
    digits = stripInternationalPrefix(digits);
  }

  const normalizedDigits = hasExplicitPlus ? digits : stripLeadingTrunkZero(digits);

  if (looksLikeBrazilianLocalPhone(normalizedDigits)) {
    return `55${normalizedDigits}`;
  }

  return normalizedDigits;
}

export function normalizeOptionalWhatsAppPhone(value: string | null | undefined) {
  const normalized = normalizeWhatsAppPhone(value);
  return normalized || null;
}
