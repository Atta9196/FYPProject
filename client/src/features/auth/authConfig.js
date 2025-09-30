export const passwordRules = {
	minLength: 8,
	requireUppercase: true,
	requireLowercase: true,
	requireNumber: true,
	requireSpecial: true,
};

export function validatePassword(password) {
	const errors = [];
	if (password.length < passwordRules.minLength) errors.push(`At least ${passwordRules.minLength} characters`);
	if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) errors.push('One uppercase letter');
	if (passwordRules.requireLowercase && !/[a-z]/.test(password)) errors.push('One lowercase letter');
	if (passwordRules.requireNumber && !/[0-9]/.test(password)) errors.push('One number');
	if (passwordRules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) errors.push('One special character');
	return { valid: errors.length === 0, errors };
}


