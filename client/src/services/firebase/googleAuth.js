// Client-only helper to render Google One Tap or button and return ID token
export function loadGooglePlatformScript() {
	return new Promise((resolve, reject) => {
		if (document.getElementById('google-client-script')) return resolve();
		const script = document.createElement('script');
		script.id = 'google-client-script';
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.defer = true;
		script.onload = resolve;
		script.onerror = reject;
		document.body.appendChild(script);
	});
}

export function renderGoogleButton({ containerId, clientId, callback }) {
	if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
	window.google.accounts.id.initialize({ client_id: clientId, callback });
	window.google.accounts.id.renderButton(document.getElementById(containerId), {
		theme: 'outline',
		size: 'large',
		shape: 'rectangular',
		text: 'continue_with',
	});
}

// Firebase Auth based Google sign-in that returns a Firebase ID token
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './config';

export async function signInWithGoogleAndGetIdToken() {
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth, provider);
	const idToken = await result.user.getIdToken();
	return idToken;
}


