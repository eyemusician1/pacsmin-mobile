import {supabase} from './supabase/client';

const PARTICIPANTS_TABLE = 'participants';

type ParticipantRow = {
  id: number;
  unique_id: string;
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
    .select('choice')
    .eq('participant_id', participant.id)
    .eq('choice_date', date)
    .maybeSingle<{choice: string | null}>();

  if (existingError) {
    const msg = existingError.message;
    if (isMissingTableError(msg)) {
      throw new Error(`Table ${tableName} is not configured yet.`);
    }
    throw new Error(msg);
  }

  if (existing) {
    return {
      status: 'already',
      uid: participant.unique_id,
      fullName: participant.full_name ?? 'Unknown',
      society: participant.society ?? '',
      choice: existing.choice ?? defaultChoice,
    };
  }

  const {error: insertError} = await supabase.from(tableName).insert({
    participant_id: participant.id,
    choice_date: date,
    choice: defaultChoice,
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
