const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh', 'puducherry',
  'andaman and nicobar', 'dadra and nagar haveli', 'daman and diu', 'lakshadweep',
]);

const STATE_ABBREVIATIONS: Record<string, string> = {
  ap: 'andhra pradesh',
  ar: 'arunachal pradesh',
  as: 'assam',
  br: 'bihar',
  cg: 'chhattisgarh',
  ga: 'goa',
  gj: 'gujarat',
  hr: 'haryana',
  hp: 'himachal pradesh',
  jh: 'jharkhand',
  ka: 'karnataka',
  kl: 'kerala',
  mp: 'madhya pradesh',
  mh: 'maharashtra',
  mn: 'manipur',
  ml: 'meghalaya',
  mz: 'mizoram',
  nl: 'nagaland',
  od: 'odisha',
  pb: 'punjab',
  rj: 'rajasthan',
  sk: 'sikkim',
  tn: 'tamil nadu',
  ts: 'telangana',
  tr: 'tripura',
  up: 'uttar pradesh',
  uk: 'uttarakhand',
  wb: 'west bengal',
  dl: 'delhi',
  jk: 'jammu and kashmir',
  la: 'ladakh',
  ch: 'chandigarh',
  py: 'puducherry',
  an: 'andaman and nicobar',
  dh: 'dadra and nagar haveli',
  dd: 'daman and diu',
  ld: 'lakshadweep',
};

export type FieldValidation = { valid: boolean; error?: string };

export function validateName(name: string): FieldValidation {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Please enter your full name (at least 2 characters):' };
  }
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Name cannot be only numbers. Please enter your full name:' };
  }
  return { valid: true };
}

export function validateLine1(line1: string): FieldValidation {
  const trimmed = line1.trim();
  if (trimmed.length < 5) {
    return {
      valid: false,
      error: 'Please enter your complete address (house no., street, area — at least 5 characters):',
    };
  }
  return { valid: true };
}

export function validateCity(city: string): FieldValidation {
  const trimmed = city.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Please enter a valid city name:' };
  }
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'City name cannot be only numbers. Please enter the city name:' };
  }
  return { valid: true };
}

export function validateState(state: string): FieldValidation {
  const trimmed = state.trim();
  const normalized = trimmed.toLowerCase();
  if (INDIAN_STATES.has(normalized)) {
    return { valid: true };
  }
  const resolved = STATE_ABBREVIATIONS[normalized];
  if (resolved) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `"${trimmed}" doesn't look like a valid Indian state. Please enter the state name (e.g. Maharashtra, Karnataka, Delhi) or abbreviation (e.g. MH, KA, DL):`,
  };
}

export function validatePincode(pincode: string): FieldValidation {
  const digits = pincode.replace(/\D/g, '');
  if (digits.length !== 6) {
    return { valid: false, error: '❌ Pincode must be exactly 6 digits (e.g. 400001). Please re-enter:' };
  }
  const num = parseInt(digits, 10);
  if (num < 100000 || num > 999999) {
    return {
      valid: false,
      error: "❌ That doesn't look like a valid Indian pincode. Please enter a valid 6-digit pincode:",
    };
  }
  return { valid: true };
}
