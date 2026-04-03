import {supabase} from './supabase/client';

const PARTICIPANTS_TABLE = 'participants';
const DEFAULT_RECENT_LIMIT = 6;

type ParticipantRow = {
  id: number;
  unique_id: string;
  full_name: string | null;
  society: string | null;
};

type ParticipantMini = {
  unique_id: string | null;
  full_name: string | null;
  society: string | null;
};

export type ChoiceSummary = {
  totalParticipants: number;
  recorded: number;
  pending: number;
};

export type ChoiceRecordResult = {
  status: 'recorded' | 'already';
  uid: string;
  fullName: string;
  society: string;
  choice: string;
  claimedAt: string;
  claimedBy: string;
};

export type RecentChoiceCheck = {
  uid: string;
  fullName: string;
  society: string;
  choice: string;
  claimedAt: string;
  claimedBy: string;
};

const EMPTY_SUMMARY: ChoiceSummary = {
  totalParticipants: 0,
  recorded: 0,
  pending: 0,
};

function getCurrentManilaDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value ?? '1970';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function isMissingTableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('could not find the table') ||
    (normalized.includes('relation') && normalized.includes('does not exist'));
}

function isMissingColumnError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('column') && normalized.includes('does not exist');
}

async function getClaimSource(): Promise<string | null> {
  try {
    const {data, error} = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    return data.session?.user?.email ?? data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getRecentChecks(
  tableName: 'food_choices' | 'bundle_choices',
  date = getCurrentManilaDate(),
  limit = DEFAULT_RECENT_LIMIT,
): Promise<RecentChoiceCheck[]> {
  const readParticipant = (value: ParticipantMini | ParticipantMini[] | null | undefined): ParticipantMini | null => {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  };

  try {
    const {data, error} = await supabase
      .from(tableName)
      .select('choice,claimed_at,claimed_by,created_at,participants(unique_id,full_name,society)')
      .eq('choice_date', date)
      .order('claimed_at', {ascending: false})
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map(row => {
      const participant = readParticipant(row.participants);
      return {
        uid: participant?.unique_id ?? '',
        fullName: participant?.full_name ?? 'Unknown',
        society: participant?.society ?? '',
        choice: row.choice ?? '',
        claimedAt: row.claimed_at ?? row.created_at ?? '',
        claimedBy: row.claimed_by ?? '',
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load checklist.';
    if (!isMissingColumnError(message)) {
      if (isMissingTableError(message)) {
        return [];
      }
      throw new Error(message);
    }

    // Backward compatibility for databases that have not applied claim columns yet.
    const {data: fallbackRows, error: fallbackError} = await supabase
      .from(tableName)
      .select('choice,created_at,participants(unique_id,full_name,society)')
      .eq('choice_date', date)
      .order('created_at', {ascending: false})
      .limit(limit);

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    return (fallbackRows ?? []).map(row => {
      const participant = readParticipant(row.participants);
      return {
        uid: participant?.unique_id ?? '',
        fullName: participant?.full_name ?? 'Unknown',
        society: participant?.society ?? '',
        choice: row.choice ?? '',
        claimedAt: row.created_at ?? '',
        claimedBy: '',
      };
    });
  }
}

async function getChoiceSummary(tableName: 'food_choices' | 'bundle_choices', date = getCurrentManilaDate()): Promise<ChoiceSummary> {
  try {
    const [{count: totalCount, error: totalError}, {data: rows, error: rowsError}] = await Promise.all([
      supabase.from(PARTICIPANTS_TABLE).select('*', {count: 'exact', head: true}),
      supabase
        .from(tableName)
        .select('participant_id')
        .eq('choice_date', date),
    ]);

    if (totalError) {
      throw totalError;
    }

    if (rowsError) {
      throw rowsError;
    }

    const unique = new Set<number>();
    (rows ?? []).forEach(row => {
      if (typeof row.participant_id === 'number') {
        unique.add(row.participant_id);
      }
    });

    const totalParticipants = totalCount ?? 0;
    const recorded = unique.size;

    return {
      totalParticipants,
      recorded,
      pending: Math.max(0, totalParticipants - recorded),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load summary.';
    if (isMissingTableError(message)) {
      return EMPTY_SUMMARY;
    }
    throw new Error(message);
  }
}

async function recordChoiceByUid(
  tableName: 'food_choices' | 'bundle_choices',
  uid: string,
  defaultChoice: string,
  date = getCurrentManilaDate(),
): Promise<ChoiceRecordResult> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error('UID is required.');
  }

  const {data: participant, error: participantError} = await supabase
    .from(PARTICIPANTS_TABLE)
    .select('id,unique_id,full_name,society')
    .eq('unique_id', cleanUid)
    .single<ParticipantRow>();

  if (participantError || !participant) {
    throw new Error(`Participant not found for UID: ${cleanUid}`);
  }

  const {data: existing, error: existingError} = await supabase
    .from(tableName)
    .select('choice,claimed_at,claimed_by,created_at')
    .eq('participant_id', participant.id)
    .eq('choice_date', date)
    .maybeSingle<{choice: string | null; claimed_at: string | null; claimed_by: string | null; created_at: string | null}>();

  if (existingError) {
    const msg = existingError.message;
    if (isMissingTableError(msg)) {
      throw new Error(`Table ${tableName} is not configured yet.`);
    }
    if (!isMissingColumnError(msg)) {
      throw new Error(msg);
    }

    const {data: existingFallback, error: fallbackError} = await supabase
      .from(tableName)
      .select('choice,created_at')
      .eq('participant_id', participant.id)
      .eq('choice_date', date)
      .maybeSingle<{choice: string | null; created_at: string | null}>();

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    if (existingFallback) {
      return {
        status: 'already',
        uid: participant.unique_id,
        fullName: participant.full_name ?? 'Unknown',
        society: participant.society ?? '',
        choice: existingFallback.choice ?? defaultChoice,
        claimedAt: existingFallback.created_at ?? '',
        claimedBy: '',
      };
    }

    const {error: insertFallbackError} = await supabase.from(tableName).insert({
      participant_id: participant.id,
      choice_date: date,
      choice: defaultChoice,
    });

    if (insertFallbackError) {
      throw new Error(insertFallbackError.message);
    }

    return {
      status: 'recorded',
      uid: participant.unique_id,
      fullName: participant.full_name ?? 'Unknown',
      society: participant.society ?? '',
      choice: defaultChoice,
      claimedAt: new Date().toISOString(),
      claimedBy: '',
    };
  }

  if (existing) {
    return {
      status: 'already',
      uid: participant.unique_id,
      fullName: participant.full_name ?? 'Unknown',
      society: participant.society ?? '',
      choice: existing.choice ?? defaultChoice,
      claimedAt: existing.claimed_at ?? existing.created_at ?? '',
      claimedBy: existing.claimed_by ?? '',
    };
  }

  const claimedAt = new Date().toISOString();
  const claimedBy = await getClaimSource();

  const {error: insertError} = await supabase.from(tableName).insert({
    participant_id: participant.id,
    choice_date: date,
    choice: defaultChoice,
    claimed_at: claimedAt,
    claimed_by: claimedBy,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    status: 'recorded',
    uid: participant.unique_id,
    fullName: participant.full_name ?? 'Unknown',
    society: participant.society ?? '',
    choice: defaultChoice,
    claimedAt,
    claimedBy: claimedBy ?? '',
  };
}

export function getFoodSummary(date?: string) {
  return getChoiceSummary('food_choices', date);
}

export function getBundleSummary(date?: string) {
  return getChoiceSummary('bundle_choices', date);
}

export function recordFoodByUid(uid: string, date?: string) {
  return recordChoiceByUid('food_choices', uid, 'Food Verified', date);
}

export function recordBundleByUid(uid: string, date?: string) {
  return recordChoiceByUid('bundle_choices', uid, 'Bundle Verified', date);
}

export function getRecentFoodChecks(date?: string, limit?: number) {
  return getRecentChecks('food_choices', date, limit);
}

export function getRecentBundleChecks(date?: string, limit?: number) {
  return getRecentChecks('bundle_choices', date, limit);
}
