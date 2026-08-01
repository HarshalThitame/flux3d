const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'delhi', 'jammu and kashmir', 'ladakh', 'chandigarh', 'puducherry',
  'andaman and nicobar', 'dadra and nagar haveli', 'daman and diu', 'lakshadweep',
]);

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
  const normalized = state.trim().toLowerCase();
  if (!INDIAN_STATES.has(normalized)) {
    return {
      valid: false,
      error: `"${state.trim()}" doesn't look like a valid Indian state. Please enter the state name (e.g. Maharashtra, Karnataka, Delhi):`,
    };
  }
  return { valid: true };
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
