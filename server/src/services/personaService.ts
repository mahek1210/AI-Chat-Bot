import { supabaseAdmin } from '../utils/supabase';
import { AIProfile } from '../utils/ai-profiles';

/**
 * Converts a DB row to an AIProfile object matching the frontend interface.
 */
function rowToProfile(row: Record<string, unknown>): AIProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: row.emoji as string,
    tagline: row.tagline as string || '',
    systemPrompt: row.system_prompt as string,
    category: row.category as AIProfile['category'],
    isPublished: row.is_published as boolean,
    ownerId: row.author_id as string,
    likesCount: row.likes_count as number || 0,
    isDeleted: row.is_deleted as boolean,
  } as AIProfile;
}

/**
 * Fetch all published, non-deleted personas from the database.
 */
export async function getPublishedPersonas(): Promise<AIProfile[]> {
  const { data, error } = await supabaseAdmin
    .from('personas')
    .select('*')
    .eq('is_published', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch personas: ${error.message}`);
  return (data || []).map(rowToProfile);
}

/**
 * Fetch all personas belonging to the current user (published and drafts).
 */
export async function getUserPersonas(userId: string): Promise<AIProfile[]> {
  const { data, error } = await supabaseAdmin
    .from('personas')
    .select('*')
    .eq('author_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch user personas: ${error.message}`);
  return (data || []).map(rowToProfile);
}

/**
 * Publish (insert or update) a persona linked to the authenticated user.
 */
export async function publishPersona(
  profile: AIProfile,
  userId: string
): Promise<AIProfile> {
  const upsertData = {
    id: profile.id,
    author_id: userId,
    name: profile.name,
    emoji: profile.emoji,
    tagline: profile.tagline || '',
    system_prompt: profile.systemPrompt,
    category: profile.category || 'Custom',
    is_published: true,
    is_deleted: false,
  };

  const { data, error } = await supabaseAdmin
    .from('personas')
    .upsert(upsertData, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to publish persona: ${error.message}`);
  return rowToProfile(data);
}

/**
 * Soft-delete a persona (tombstone) — only the owner can do this.
 */
export async function deletePersona(
  personaId: string,
  userId: string
): Promise<void> {
  // Verify ownership first
  const { data: existing } = await supabaseAdmin
    .from('personas')
    .select('author_id')
    .eq('id', personaId)
    .single();

  if (!existing || existing.author_id !== userId) {
    throw new Error('Forbidden: You do not own this persona');
  }

  const { error } = await supabaseAdmin
    .from('personas')
    .update({ is_deleted: true })
    .eq('id', personaId);

  if (error) throw new Error(`Failed to delete persona: ${error.message}`);
}

/**
 * Toggle like on a persona.
 * Inserts into persona_likes (conflict = already liked → unlike instead).
 */
export async function toggleLikePersona(
  personaId: string,
  userId: string
): Promise<{ liked: boolean }> {
  // Check if already liked
  const { data: existing } = await supabaseAdmin
    .from('persona_likes')
    .select('persona_id')
    .eq('persona_id', personaId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Unlike: remove the row and decrement
    await supabaseAdmin
      .from('persona_likes')
      .delete()
      .eq('persona_id', personaId)
      .eq('user_id', userId);

    await supabaseAdmin.rpc('decrement_likes', { persona_id_input: personaId });
    return { liked: false };
  } else {
    // Like: insert row and increment
    await supabaseAdmin
      .from('persona_likes')
      .insert({ persona_id: personaId, user_id: userId });

    await supabaseAdmin.rpc('increment_likes', { persona_id_input: personaId });
    return { liked: true };
  }
}
