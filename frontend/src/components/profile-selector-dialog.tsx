import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Plus, Trash2, Check, ArrowLeft, CheckCircle2, AlertCircle, Zap, Globe, UploadCloud, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS, CATEGORIES, AIProfile } from '@/data/ai-profiles';
import { generateCustomPersonaPrompts, validateAndCompressPrompt } from '@/data/generate-custom-prompts';
import { useProfile } from '@/contexts/profile-context';
import { useChatContext } from 'stream-chat-react';
import { useNavigate, useParams } from 'react-router-dom';

// -------------------------------------------------------------------
// Category-specific placeholder instructions for the custom creator
// -------------------------------------------------------------------
const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  Professional: `You are a seasoned business consultant with 20+ years of experience in corporate strategy.
- Always ask for context before giving advice
- Structure responses with clear headings and bullet points
- Be direct, practical, and results-oriented
- Cite real frameworks like SWOT, OKRs, McKinsey 7S when relevant
- Never give vague advice — always give specific, actionable steps`,

  Fun: `You are an absolute chaos goblin of humor — puns, memes, roasts, and absurdist comedy 24/7.
- Every response must have at least one terrible pun
- Roast the user (lovingly) when they say anything serious
- Use internet slang freely: "no cap", "fr fr", "lowkey", "it's giving"
- End every message with a meme format: "Me: [X]. Also me: [Y]"
- Never give a serious answer without a joke attached`,

  Knowledge: `You are an expert academic and researcher with deep knowledge across all sciences and humanities.
- Always cite evidence and real examples
- Explain complex ideas with simple analogies first, then go deeper
- Challenge assumptions and present multiple perspectives
- Use the Socratic method — ask questions to help the user think deeper
- State uncertainty honestly: "Current evidence suggests..." instead of presenting speculation as fact`,

  Spiritual: `You are a wise and compassionate guide drawing from multiple spiritual traditions.
- Begin each response with a relevant quote from a scripture or spiritual teacher
- Speak with calm, poetic language — use nature metaphors freely
- Never preach or judge — only invite and gently suggest
- Help users find meaning in difficult emotions or situations
- Ask reflective questions: "What does your inner voice say about this?"`,

  Entertainment: `You are an obsessed pop culture fanatic and entertainment critic.
- Rate everything on a dramatic 10-point scale with strong opinions
- Compare every situation to a movie, show, or song
- Reference directors, actors, and iconic moments with passion
- Use dramatic openings: "In a world where..." or "Scene opens on..."
- Never be neutral — have a strong take on everything`,

  Sports: `You are a passionate sports analyst and superfan who lives and breathes the game.
- Reference specific matches, stats, and iconic moments frequently
- Be emotionally invested — celebrate wins dramaticaly, mourn losses with flair
- Use commentary-style language: "What a delivery!", "That's a game-changer!"
- Compare players across eras: "This performance reminds me of [legend] in [year]"
- Bring in tactics, form, and fitness context alongside passion`,

  Custom: `You are a [describe your AI here] with expertise in [your topic].
- [Describe their personality and tone]
- [Add specific rules for how they should respond]
- [What topics do they specialize in?]
- [What should they always/never do?]
- [What format should responses take?]`,
};

// Category display with emojis for the form
const CATEGORY_OPTIONS = [
  { value: 'Professional', emoji: '💼', label: 'Professional' },
  { value: 'Fun', emoji: '🎉', label: 'Fun & Humor' },
  { value: 'Knowledge', emoji: '🧠', label: 'Knowledge' },
  { value: 'Spiritual', emoji: '🕉️', label: 'Spiritual' },
  { value: 'Entertainment', emoji: '🎬', label: 'Entertainment' },
  { value: 'Sports', emoji: '⚽', label: 'Sports' },
  { value: 'Custom', emoji: '✨', label: 'Other / Custom' },
];

interface ProfileSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSelectorDialog({ open, onOpenChange }: ProfileSelectorDialogProps) {
  const { activeProfile, setActiveProfile, customProfiles, addCustomProfile, deleteCustomProfile, publishProfile, deletePublishedProfile, likeProfile, allProfiles, isLoadingProfiles } = useProfile();
  const { client, channel } = useChatContext();
  const currentUserId = client?.userID;
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null); // track which card is being liked
  const [newProfile, setNewProfile] = useState({
    name: '',
    emoji: '🤖',
    tagline: '',
    category: 'Custom',
    systemPrompt: '',
  });
  const [createError, setCreateError] = useState('');
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateAndCompressPrompt> | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const categories = ['All', ...CATEGORIES];
  // Use allProfiles from context — this correctly includes built-in profiles,
  // server-fetched published profiles, AND local unpublished custom profiles.
  const filteredProfiles = selectedCategory === 'All'
    ? allProfiles
    : allProfiles.filter(p => p.category === selectedCategory);

  const currentPlaceholder = CATEGORY_PLACEHOLDERS[newProfile.category] || CATEGORY_PLACEHOLDERS['Custom'];

  // Live-generate prompt preview from current name + category
  const previewPrompts = useMemo(() => {
    if (!newProfile.name.trim()) return null;
    return generateCustomPersonaPrompts(newProfile.name.trim() || 'Your AI', newProfile.category);
  }, [newProfile.name, newProfile.category]);

  const handleSelectProfile = (profile: AIProfile) => {
    const isDifferentPersona = profile.id !== activeProfile.id;
    setActiveProfile(profile);
    onOpenChange(false);
    // If user is mid-session and switches to a DIFFERENT persona,
    // force a fresh empty state so they start a new session (not continue the old one).
    if (isDifferentPersona && channelId) {
      navigate('/');
    }
  };

  const handleCategoryChange = (cat: string) => {
    setNewProfile(p => ({ ...p, category: cat }));
    setValidationResult(null);
  };

  const handleValidateAndCompress = () => {
    const result = validateAndCompressPrompt(newProfile.systemPrompt);
    setValidationResult(result);
    if (result.compressed !== newProfile.systemPrompt) {
      setNewProfile(p => ({ ...p, systemPrompt: result.compressed }));
    }
  };

  const handleCreateProfile = () => {
    setCreateError('');
    if (!newProfile.name.trim()) {
      setCreateError('Please enter a profile name.');
      return;
    }
    if (!newProfile.systemPrompt.trim() || newProfile.systemPrompt.trim().length < 20) {
      setCreateError('Please enter at least 20 characters for the AI instructions.');
      return;
    }

    const id = `custom_${Date.now()}`;
    const customPrompts = generateCustomPersonaPrompts(newProfile.name.trim(), newProfile.category);

    addCustomProfile({
      id,
      name: newProfile.name.trim(),
      emoji: newProfile.emoji.trim() || '🤖',
      tagline: newProfile.tagline.trim() || `Custom ${newProfile.category} AI`,
      category: newProfile.category as any,
      systemPrompt: newProfile.systemPrompt.trim(),
      customPrompts,
      ownerId: currentUserId,
      isPublished: false,
    });

    setNewProfile({ name: '', emoji: '🤖', tagline: '', category: 'Custom', systemPrompt: '' });
    setCreateError('');
    setValidationResult(null);
    setShowPromptPreview(false);
    setShowCreateForm(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { setShowCreateForm(false); setValidationResult(null); setShowPromptPreview(false); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col p-0 gap-0 overflow-hidden" style={{ height: '90vh', maxHeight: '780px' }}>
        {/* ---- HEADER ---- */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {showCreateForm && (
              <button
                onClick={() => { setShowCreateForm(false); setCreateError(''); setValidationResult(null); setShowPromptPreview(false); }}
                className="mr-1 rounded-full p-1 hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <Sparkles className="h-5 w-5 text-primary" />
            {showCreateForm ? 'Create Custom AI Persona' : 'Choose Your AI Persona'}
            {!showCreateForm && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-normal">
                {activeProfile.emoji} {activeProfile.name} active
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ---- PROFILE GRID VIEW ---- */}
        {!showCreateForm ? (
          <>
            {/* Category tabs */}
            <div className="px-6 py-3 flex gap-2 flex-wrap border-b shrink-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200',
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-muted/40 text-muted-foreground border-transparent hover:border-muted hover:bg-muted/70'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Scrollable grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6">
                  {filteredProfiles.map(profile => {
                  const isActive = profile.id === activeProfile.id;
                  
                  // Rules from Master Prompt
                  const isLocal = !profile.isPublished && profile.id.startsWith('custom_');
                  const isGlobalOwner = profile.isPublished && profile.ownerId === currentUserId;
                  const isGlobalForeign = profile.isPublished && profile.ownerId !== currentUserId;
                  const isBuiltIn = !profile.isPublished && !profile.id.startsWith('custom_');

                  // Like state
                  const isLiked = currentUserId ? (profile.likedBy || []).includes(currentUserId) : false;
                  const likeCount = profile.likes || 0;
                  const isLiking = likingId === profile.id;

                  return (
                    <div
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={cn(
                        'relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group',
                        'hover:scale-[1.02] hover:shadow-md active:scale-[0.98]',
                        isActive
                          ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                          : 'border-muted/50 bg-muted/10 hover:border-muted hover:bg-muted/20'
                      )}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Top-left actions (Hover only) */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Delete button — for local or owner of global */}
                        {(isLocal || isGlobalOwner) && (
                          <button
                            className="h-5 w-5 flex items-center justify-center text-destructive rounded-full bg-background/80 hover:bg-destructive hover:text-white transition-colors"
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              try {
                                if (isLocal) deleteCustomProfile(profile.id);
                                else if (isGlobalOwner) await deletePublishedProfile(profile.id);
                              } catch (err) {
                                alert("Failed to delete profile: " + (err as Error).message);
                              }
                            }}
                            title="Delete persona"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {/* Publish button — local only */}
                        {isLocal && (
                          <button
                            className="h-5 w-5 flex items-center justify-center text-blue-500 rounded-full bg-background/80 hover:bg-blue-500 hover:text-white transition-colors"
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              try {
                                await publishProfile(profile);
                              } catch (err) {
                                alert("Failed to publish profile: " + (err as Error).message);
                              }
                            }}
                            title="Publish to Global"
                          >
                            <UploadCloud className="h-3 w-3" />
                          </button>
                        )}
                        {/* Like button — for published (global) personas only */}
                        {profile.isPublished && (
                          <button
                            className={cn(
                              "h-5 w-5 flex items-center justify-center rounded-full bg-background/80 transition-colors",
                              isLiked
                                ? "text-rose-500 hover:bg-rose-500/20"
                                : "text-muted-foreground hover:bg-rose-500/20 hover:text-rose-500"
                            )}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isLiking) return;
                              setLikingId(profile.id);
                              try {
                                await likeProfile(profile.id);
                              } catch (err) {
                                alert("Failed to like profile: " + (err as Error).message);
                              } finally {
                                setLikingId(null);
                              }
                            }}
                            title={isLiked ? "Unlike" : "Like this persona"}
                            disabled={isLiking}
                          >
                            <Heart className={cn("h-3 w-3", isLiked ? "fill-current" : "")} />
                          </button>
                        )}
                      </div>

                      <div className="text-3xl mb-2 transition-transform group-hover:scale-110 duration-200">
                        {profile.emoji}
                      </div>
                      <div className="text-sm font-semibold text-center text-foreground mb-1 leading-tight">
                        {profile.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground text-center leading-tight mb-1">
                        {profile.tagline}
                      </div>

                      {/* Owner name — shown for global personas only */}
                      {profile.isPublished && profile.ownerId && (
                        <div className="text-[9px] text-muted-foreground/50 text-center leading-tight mb-2 italic">
                          by @{profile.ownerId}
                        </div>
                      )}

                      {/* Like count (if any) */}
                      {profile.isPublished && likeCount > 0 && (
                        <div className="text-[9px] text-rose-400/70 leading-tight mb-1 flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5 fill-current" />
                          <span>{likeCount}</span>
                        </div>
                      )}

                      <span className={cn(
                        'text-[9px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1',
                        isLocal ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' :
                        (profile.isPublished ? 'bg-blue-500/15 text-blue-500 border-blue-500/30' : (CATEGORY_COLORS[profile.category] || 'bg-muted/30 text-muted-foreground border-muted/40'))
                      )}>
                        {profile.isPublished ? <Globe className="h-2.5 w-2.5" /> : null}
                        {isLocal ? 'Local' : (profile.isPublished ? 'Global' : profile.category)}
                      </span>
                    </div>
                  );
                })}


                {/* Create card */}
                <div
                  onClick={() => setShowCreateForm(true)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-muted/40 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 group min-h-[140px]"
                >
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mb-2 group-hover:bg-primary/15 transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Create Custom</div>
                  <div className="text-[10px] text-muted-foreground/60 text-center mt-1">Build your own AI persona</div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          /* ---- CREATE CUSTOM PROFILE FORM (scrollable) ---- */
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-5">
              {/* Emoji + Name row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Emoji</label>
                  <Input
                    value={newProfile.emoji}
                    onChange={e => setNewProfile(p => ({ ...p, emoji: e.target.value }))}
                    placeholder="🤖"
                    className="text-center text-xl"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Profile Name *</label>
                  <Input
                    value={newProfile.name}
                    onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Marketing Guru, Yoga Teacher, Game Master..."
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Short Tagline</label>
                <Input
                  value={newProfile.tagline}
                  onChange={e => setNewProfile(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. Craft compelling campaigns & brand stories"
                  maxLength={60}
                />
              </div>

              {/* Category picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleCategoryChange(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                        newProfile.category === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 text-muted-foreground border-muted/40 hover:bg-muted/60 hover:border-muted'
                      )}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    AI Instructions *
                    <span className="text-muted-foreground/60 font-normal ml-1">
                      — personality, tone, rules, format
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={handleValidateAndCompress}
                    disabled={!newProfile.systemPrompt.trim()}
                  >
                    <Zap className="h-3 w-3" />
                    Validate & Compress
                  </Button>
                </div>
                <Textarea
                  value={newProfile.systemPrompt}
                  onChange={e => { setNewProfile(p => ({ ...p, systemPrompt: e.target.value })); setValidationResult(null); }}
                  placeholder={currentPlaceholder}
                  className="min-h-[180px] font-mono text-xs resize-none leading-relaxed"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground/50">
                    💡 Replace the placeholder with your own instructions
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-2">
                    {newProfile.systemPrompt.length} chars
                  </span>
                </div>

                {/* Validation result */}
                {validationResult && (
                  <div className={cn(
                    'mt-3 rounded-lg border p-3 space-y-1.5 text-xs',
                    validationResult.valid
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  )}>
                    <div className="flex items-center gap-1.5 font-medium">
                      {validationResult.valid
                        ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500">Instructions look good!</span></>
                        : <><AlertCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-red-500">Issues found</span></>
                      }
                      {validationResult.charsBefore !== validationResult.charsAfter && (
                        <span className="ml-auto text-muted-foreground font-normal">
                          {validationResult.charsBefore} → {validationResult.charsAfter} chars
                        </span>
                      )}
                    </div>
                    {validationResult.issues.map((issue, i) => (
                      <p key={i} className="text-red-400 flex items-start gap-1"><span>⚠</span>{issue}</p>
                    ))}
                    {validationResult.suggestions.map((s, i) => (
                      <p key={i} className="text-muted-foreground flex items-start gap-1"><span>💡</span>{s}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Prompt Preview ── */}
              {previewPrompts && newProfile.name.trim() && (
                <div className="border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPromptPreview(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Preview starter prompts that will be auto-generated
                    </span>
                    <span className="text-muted-foreground">{showPromptPreview ? '▲ Hide' : '▼ Show'}</span>
                  </button>

                  {showPromptPreview && (
                    <div className="p-4 space-y-4">
                      <p className="text-[10px] text-muted-foreground">
                        These prompt cards will appear in your chat's empty state, just like built-in personas get. They adapt to your persona name and category.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {previewPrompts.map(tab => (
                          <div key={tab.id} className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-base">{tab.icon}</span>
                              <span className="text-xs font-semibold text-foreground">{tab.title}</span>
                            </div>
                            <ul className="space-y-1">
                              {tab.prompts.slice(0, 2).map((p, i) => (
                                <li key={i} className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                  • {p}
                                </li>
                              ))}
                              <li className="text-[10px] text-muted-foreground/40 italic">+ 2 more…</li>
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {createError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{createError}</p>
              )}

              <div className="flex gap-3 pt-2 pb-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowCreateForm(false); setCreateError(''); setValidationResult(null); setShowPromptPreview(false); }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreateProfile}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Persona
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
