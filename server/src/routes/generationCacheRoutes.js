/**
 * Cache for AI-generated practice content (Reading / Listening / Writing /
 * Speaking).
 *
 * Goal: Stop re-calling OpenAI every time the user opens a practice page.
 * The first time content is generated for a user, we save it here. Every
 * subsequent visit reads from Firestore instead of hitting OpenAI again.
 *
 * Storage layout (Firestore):
 *   users/{uid}/generated_content/{module}
 *     - data: object           (raw payload the practice page expects)
 *     - createdAt: timestamp
 *     - updatedAt: timestamp
 *     - version: number
 *
 * Modules: reading | listening | writing | speaking
 *
 * Listening audio:
 *   Audio buffers themselves are NOT stored in Firestore (they would blow
 *   past the 1MB doc cap). Instead, the dialogue/listening scripts are
 *   preserved inside the cached payload. When a cached listening test is
 *   returned, we register its scripts with the listening route's
 *   in-memory cache so the existing /api/listening/audio/:testId/:sectionId
 *   endpoint can lazily re-synthesise audio if it's missing (after a server
 *   restart, for example). That keeps "do not regenerate content" intact -
 *   the expensive part (writing scripts/questions) is only ever done on
 *   first generation or explicit regenerate. TTS is a cheap rendering step.
 */
const express = require('express');
const { admin, getDb } = require('../config/firebase');
const { requireAuth } = require('../middleware/auth');
const listeningRoutes = require('./listeningRoutes');

const router = express.Router();

const ALLOWED_MODULES = new Set(['reading', 'listening', 'writing', 'speaking']);

function isValidModule(module) {
    return typeof module === 'string' && ALLOWED_MODULES.has(module);
}

/**
 * Lightweight sanity check so a half-written cache doesn't ship corrupt
 * content to the client. If this returns false, treat the cache as a miss.
 */
function isValidPayload(module, data) {
    if (!data || typeof data !== 'object') return false;
    switch (module) {
        case 'reading':
            return !!(data.readingSet && Array.isArray(data.readingSet.questions) && data.readingSet.questions.length);
        case 'listening':
            return !!(data.success !== false && Array.isArray(data.sections) && data.sections.length > 0);
        case 'writing':
            return !!(data.taskId && data.promptId);
        case 'speaking':
            return typeof data.question === 'string' && data.question.trim().length > 0;
        default:
            return false;
    }
}

/**
 * Remove fields we deliberately strip from listening payloads before sending
 * to the client (the scripts are server-only — they are used to rebuild
 * audio if needed but the client doesn't need them).
 */
function sanitizeForClient(module, data) {
    if (module !== 'listening' || !data || !Array.isArray(data.sections)) return data;
    return {
        ...data,
        sections: data.sections.map((section) => {
            // eslint-disable-next-line no-unused-vars
            const { dialogueScript, listeningScript, ...rest } = section;
            return rest;
        }),
    };
}

// GET /api/generation-cache/:module - return cached test or { cached: false }
router.get('/:module', requireAuth, async (req, res) => {
    const { module } = req.params;
    if (!isValidModule(module)) {
        return res.status(400).json({ message: 'Unknown module' });
    }
    try {
        const db = getDb();
        const docRef = db
            .collection('users')
            .doc(req.user.uid)
            .collection('generated_content')
            .doc(module);
        const snap = await docRef.get();
        if (!snap.exists) {
            return res.json({ cached: false });
        }
        const docData = snap.data() || {};
        const data = docData.data;

        if (!isValidPayload(module, data)) {
            // Auto-cleanup corrupt cache so the next call regenerates fresh.
            try { await docRef.delete(); } catch {}
            return res.json({ cached: false, reason: 'corrupt-cache' });
        }

        // Special: listening payloads need their scripts re-registered with
        // the in-memory audio cache so audio can be re-synthesised on
        // demand (the in-memory store is wiped whenever the server
        // restarts).
        if (module === 'listening' && typeof listeningRoutes.registerCachedListeningTest === 'function') {
            try {
                listeningRoutes.registerCachedListeningTest(data);
            } catch (e) {
                console.warn('[cache] Failed to register listening scripts:', e.message);
            }
        }

        return res.json({
            cached: true,
            module,
            data: sanitizeForClient(module, data),
            updatedAt: docData.updatedAt
                ? docData.updatedAt.toDate?.().toISOString?.() || null
                : null,
        });
    } catch (err) {
        console.error(`[cache] GET /${module} failed:`, err);
        return res.status(500).json({ message: 'Failed to load cached content' });
    }
});

// PUT /api/generation-cache/:module - replace the cached payload
router.put('/:module', requireAuth, async (req, res) => {
    const { module } = req.params;
    if (!isValidModule(module)) {
        return res.status(400).json({ message: 'Unknown module' });
    }
    const data = req.body?.data;
    if (!isValidPayload(module, data)) {
        return res.status(400).json({ message: 'Invalid payload for module' });
    }
    try {
        const db = getDb();
        const docRef = db
            .collection('users')
            .doc(req.user.uid)
            .collection('generated_content')
            .doc(module);
        const existing = await docRef.get();
        const version = (existing.exists ? (existing.data().version || 0) : 0) + 1;

        await docRef.set({
            data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(existing.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
            version,
        }, { merge: true });

        if (module === 'listening' && typeof listeningRoutes.registerCachedListeningTest === 'function') {
            try {
                listeningRoutes.registerCachedListeningTest(data);
            } catch (e) {
                console.warn('[cache] Failed to register listening scripts on save:', e.message);
            }
        }

        return res.json({ saved: true, module, version });
    } catch (err) {
        console.error(`[cache] PUT /${module} failed:`, err);
        return res.status(500).json({ message: 'Failed to save cached content' });
    }
});

// DELETE /api/generation-cache/:module - clear the cache (used on regenerate)
router.delete('/:module', requireAuth, async (req, res) => {
    const { module } = req.params;
    if (!isValidModule(module)) {
        return res.status(400).json({ message: 'Unknown module' });
    }
    try {
        const db = getDb();
        await db
            .collection('users')
            .doc(req.user.uid)
            .collection('generated_content')
            .doc(module)
            .delete();
        return res.json({ cleared: true, module });
    } catch (err) {
        console.error(`[cache] DELETE /${module} failed:`, err);
        return res.status(500).json({ message: 'Failed to clear cached content' });
    }
});

module.exports = router;
