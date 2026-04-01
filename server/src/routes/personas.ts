import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  getPublishedPersonas,
  getUserPersonas,
  publishPersona,
  deletePersona,
  toggleLikePersona,
} from '../services/personaService';

const router = Router();

/**
 * GET /api/personas/published
 * Public route — returns all published, non-deleted personas from DB.
 */
router.get('/published', async (req, res) => {
  try {
    const personas = await getPublishedPersonas();
    res.json({ personas });
  } catch (error) {
    console.error('Error fetching published personas:', error);
    res.status(500).json({ error: 'Failed to fetch published personas' });
  }
});

/**
 * GET /api/personas/mine
 * Protected — returns current user's personas.
 */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const personas = await getUserPersonas(req.supabaseUser!.id);
    res.json({ personas });
  } catch (error) {
    console.error('Error fetching user personas:', error);
    res.status(500).json({ error: 'Failed to fetch your personas' });
  }
});

/**
 * POST /api/personas/publish
 * Protected — publish or update a custom persona.
 */
router.post('/publish', requireAuth, async (req, res) => {
  try {
    const profile = req.body;

    if (!profile || !profile.id || !profile.name || !profile.systemPrompt) {
      return res.status(400).json({ error: 'Invalid persona data: id, name, systemPrompt are required' });
    }

    const published = await publishPersona(profile, req.supabaseUser!.id);
    res.json({ message: 'Persona published successfully', profile: published });
  } catch (error: any) {
    console.error('Error publishing persona:', error);
    res.status(error.message?.includes('Forbidden') ? 403 : 500).json({ error: error.message });
  }
});

/**
 * POST /api/personas/:id/like
 * Protected — toggle like on a persona.
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const result = await toggleLikePersona(req.params.id, req.supabaseUser!.id);
    res.json(result);
  } catch (error: any) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/personas/:id
 * Protected — soft-delete (tombstone) a persona.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await deletePersona(req.params.id, req.supabaseUser!.id);
    res.json({ message: 'Persona deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting persona:', error);
    res.status(error.message?.includes('Forbidden') ? 403 : 500).json({ error: error.message });
  }
});

export default router;
