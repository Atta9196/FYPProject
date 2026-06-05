const jwt = require('jsonwebtoken');

/**
 * Express middleware that verifies the JWT issued by the auth service.
 * Reads `Authorization: Bearer <token>` and attaches `{ uid, email }` to req.user.
 * Responds with 401 if the token is missing, malformed, or expired.
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) {
        return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }
    const token = match[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[auth] JWT_SECRET not configured on server');
        return res.status(500).json({ message: 'Server auth not configured' });
    }
    try {
        const payload = jwt.verify(token, secret);
        if (!payload?.uid) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        req.user = { uid: payload.uid, email: payload.email };
        return next();
    } catch (err) {
        const msg = err?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return res.status(401).json({ message: msg });
    }
}

module.exports = { requireAuth };
