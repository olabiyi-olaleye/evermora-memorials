-- Evermora — Phase 2 data foundation
-- 0002 · Enumerated types
--
-- Enums are used where the value set is small, closed, and owned by the product.
-- Free-form or provider-driven vocabularies stay as text + CHECK.

-- Memorial lifecycle (§8 of the Phase 2 brief)
create type memorial_status as enum (
  'draft',
  'published',
  'archived',
  'suspended',
  'deleted'
);

-- Funeral planning progress — deliberately independent of memorial_status.
-- A memorial may validly be published + planning.
create type funeral_planning_status as enum (
  'not_started',
  'planning',
  'partially_confirmed',
  'confirmed',
  'completed'
);

-- Memorial-level visibility (§14 privacy model)
create type memorial_visibility as enum (
  'private',
  'anyone_with_link',
  'public'
);

-- Per-section visibility. `inherit` defers to the memorial-level setting.
create type section_visibility as enum (
  'inherit',
  'private',
  'members',
  'public'
);

-- Memorial membership roles (§9)
create type memorial_role as enum (
  'owner',
  'admin',
  'content_editor',
  'tribute_moderator',
  'viewer'
);

create type membership_status as enum (
  'invited',
  'active',
  'suspended',
  'revoked'
);

-- Visitor tribute moderation state (§16)
create type tribute_status as enum (
  'pending',
  'approved',
  'rejected',
  'hidden',
  'reported'
);

-- Generic publication state for editor-authored content
create type publication_status as enum (
  'draft',
  'published',
  'archived'
);

-- Funeral events (§17)
create type funeral_event_type as enum (
  'service_of_songs',
  'wake',
  'viewing',
  'funeral_service',
  'burial',
  'reception',
  'thanksgiving',
  'custom'
);

create type funeral_event_status as enum (
  'draft',
  'published',
  'cancelled',
  'completed'
);

-- Story sections
create type story_section_kind as enum (
  'biography',
  'early_life',
  'family',
  'career',
  'education',
  'faith',
  'achievements',
  'legacy',
  'custom'
);

-- Media
create type media_kind as enum ('image', 'video', 'audio', 'document');
create type media_source as enum ('family', 'tribute', 'admin', 'import');
create type media_processing_status as enum ('pending', 'ready', 'failed');

-- Family updates (§18)
create type update_importance as enum ('normal', 'high', 'urgent');

-- Remembrance actions (§ core entities)
create type remembrance_action_type as enum ('candle', 'flower', 'prayer', 'stone', 'heart');

-- Service requests (§ core entities)
create type service_request_type as enum (
  'funeral_planning',
  'printing',
  'livestream',
  'catering',
  'transport',
  'flowers',
  'other'
);

create type service_request_status as enum (
  'new',
  'in_review',
  'contacted',
  'scheduled',
  'completed',
  'declined',
  'cancelled'
);

-- Notifications (§22) — event vocabulary, provider-agnostic
create type notification_event_type as enum (
  'tribute_submitted',
  'tribute_approved',
  'photo_submitted',
  'admin_invited',
  'funeral_event_published',
  'funeral_event_updated',
  'family_update_published',
  'service_request_received',
  'memorial_reported',
  'anniversary_upcoming'
);

create type notification_channel as enum ('in_app', 'email');

-- Reports (§21 audit / § core entities)
create type report_reason as enum (
  'spam',
  'abuse',
  'impersonation',
  'privacy',
  'inaccurate',
  'other'
);

create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- Audit log actor classification (§21)
create type audit_actor_kind as enum ('user', 'platform_admin', 'system', 'anonymous');
