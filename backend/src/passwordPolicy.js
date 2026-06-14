const PASSWORD_POLICY_MESSAGE = 'La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula y un número.';

export function validatePasswordPolicy(password) {
  const value = String(password || '');

  if (value.length < 8) {
    return PASSWORD_POLICY_MESSAGE;
  }

  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
    return PASSWORD_POLICY_MESSAGE;
  }

  return '';
}

export { PASSWORD_POLICY_MESSAGE };