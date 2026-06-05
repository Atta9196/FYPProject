/**
 * Progress storage API.
 *
 * Stores user practice history in Firestore so it survives:
 *  - logging in from a different device
 *  - clearing browser cache / localStorage
 *  - switching origins (e.g. localhost dev -> production Vercel domain)
 *
 * Firestore layout:
 *   users/{uid}/progress_data/{module}
 *     - entries: Array<object>   (the practice history for that module)
 *     - updatedAt: server timestamp
 *
 * Supported modules: reading, writing, listening, speaking, full-test
 */
const express = require('express');
const { admin, getDb } = require('../config/firebase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_MODULES = new Set([
    'reading',
    'writing',
    'listening',
    'speaking',
    'full-test',
]);

// Hard size limit per module to protect Firestore document size (1 MB cap).
// Keeps the most recent N entries if a payload exceeds the limit.
const MAX_ENTRIES_PER_MODULE = 500;

function isValidModule(module) {
    return typeof module === 'string' && ALLOWED_MODULES.has(module);
}

function sanitizeEntries(entries) {
    if (!Array.isArray(entries)) return [];
    // Trim to the most recent MAX entries (assumes newest-first; if not, slice from end)
    if (entries.length <= MAX_ENTRIES_PER_MODULE) return entries;
    return entries.slice(0, MAX_ENTRIES_PER_MODULE);
}

// GET /api/progress - return all modules' history for the authenticated user
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        const snap = await db
            .collection('users')
            .doc(req.user.uid)
            .collection('progress_data')
            .get();

        const result = {};
        snap.forEach((doc) => {
            const data = doc.data() || {};
            result[doc.id] = Array.isArray(data.entries) ? data.entries : [];
        });

        // Ensure all known modules are present (empty arrays if missing)
        for (const m of ALLOWED_MODULES) {
            if (!(m in result)) result[m] = [];
        }
        return res.json({ progress: result });
    } catch (err) {
        console.error('[progress] GET / failed:', err);
        return res.status(500).json({ message: 'Failed to load progress' });
    }
});

// GET /api/progress/:module - return one module's history
router.get('/:module', requireAuth, async (req, res) => {
    const { module } = req.params;
    if (!isValidModule(module)) {
        return res.status(400).json({ message: 'Unknown module' });
    }
    try {
        const db = getDb();
        const doc = await db
            .collection('users')
            .doc(req.user.uid)
            .collection('progress_data')
            .doc(module)
            .get();
        const data = doc.exists ? doc.data() : null;
        const entries = data && Array.isArray(data.entries) ? data.entries : [];
        return res.json({ module, entries });
    } catch (err) {
        console.error(`[progress] GET /${module} failed:`, err);
        return res.status(500).json({ message: 'Failed to load module progress' });
    }
});

// PUT /api/progress/:module - replace one module's full history
router.put('/:module', requireAuth, async (req, res) => {
    const { module } = req.params;
    if (!isValidModule(module)) {
        return res.status(400).json({ message: 'Unknown module' });
    }
    const entries = sanitizeEntries(req.body?.entries);
    try {
        const db = getDb();
        await db
            .collection('users')
            .doc(req.user.uid)
            .collection('progress_data')
            .doc(module)
            .set({
                entries,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        return res.json({ module, savedCount: entries.length });
    } catch (err) {
        console.error(`[progress] PUT /${module} failed:`, err);
        return res.status(500).json({ message: 'Failed to save module progress' });
    }
});

// POST /api/progress/sync - bulk sync (used to push the entire localStorage cache)
// Body: { progress: { reading: [...], writing: [...], listening: [...], speaking: [...], 'full-test': [...] } }
router.post('/sync', requireAuth, async (req, res) => {
    const progress = req.body?.progress;
    if (!progress || typeof progress !== 'object') {
        return res.status(400).json({ message: 'Body must include a `progress` object' });
    }
    try {
        const db = getDb();
        const batch = db.batch();
        const userRef = db.collection('users').doc(req.user.uid);
        const counts = {};
        for (const [module, entries] of Object.entries(progress)) {
            if (!isValidModule(module)) continue;
            const sanitized = sanitizeEntries(entries);
            counts[module] = sanitized.length;
            batch.set(userRef.collection('progress_data').doc(module), {
                entries: sanitized,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        return res.json({ synced: counts });
    } catch (err) {
        console.error('[progress] POST /sync failed:', err);
        return res.status(500).json({ message: 'Failed to sync progress' });
    }
});

module.exports = router;
