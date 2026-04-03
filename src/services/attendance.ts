import {supabase} from './supabase/client';

const PARTICIPANTS_TABLE = 'participants';
const ATTENDANCE_TABLE_CANDIDATES = ['attendance_records', 'attendance'] as const;
let resolvedAttendanceTable: string | null = null;

type ParticipantRow = {
  id: number;
  unique_id: string;
  full_name: string | null;
  society: string | null;
};

export type AttendanceSummary = {
  totalParticipants: number;
  present: number;
  absent: number;
  morning: number;
  afternoon: number;
};

export type ScanResult = {
  status: 'recorded' | 'already';
  uid: string;
  fullName: string;
  society: string;
  session: 'morning' | 'afternoon';
};

const EMPTY_SUMMARY: AttendanceSummary = {
  totalParticipants: 0,
  present: 0,
  absent: 0,
  morning: 0,
  afternoon: 0,
};

function isMissingTableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('could not find the table') || normalized.includes('relation') && normalized.includes('does not exist');
}

function normalizeServiceError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : 'Unknown error.';

  if (isMissingTableError(raw)) {
    return new Error('Attendance table is not configured in Supabase yet.');
  }

  return new Error(raw);
}

async function resolveAttendanceTableName(): Promise<string> {
  if (resolvedAttendanceTable) {
    return resolvedAttendanceTable;
  }

  for (const tableName of ATTENDANCE_TABLE_CANDIDATES) {
    const {error} = await supabase.from(tableName).select('participant_id', {head: true, count: 'exact'}).limit(1);
    if (!error) {
      resolvedAttendanceTable = tableName;
      return tableName;
    }

    if (!isMissingTableError(error.message)) {
      throw normalizeServiceError(error);
    }
  }

  throw new Error('Attendance table is not configured in Supabase yet.');
}

function getManilaDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value ?? '1970';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';

  return {year, month, day};
}

function getCurrentManilaDate() {
  const {year, month, day} = getManilaDateParts();
  return `${year}-${month}-${day}`;
}

function getCurrentManilaTime() {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  return formatted;
}

function extractHour(timeIn: string): number {
  const hhmmss = timeIn.match(/(\d{2}):(\d{2})(?::\d{2})?/);
  if (hhmmss?.[1]) {
    return Number(hhmmss[1]);
  }

  const parsed = new Date(timeIn);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getHours();
  }

  return 0;
}

function resolveSessionFromTime(timeIn: string): 'morning' | 'afternoon' {
  return extractHour(timeIn) < 12 ? 'morning' : 'afternoon';
}

export function resolveUidFromScan(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    const uid = url.searchParams.get('uid');
    return (uid ?? value).trim();
  } catch {
    return value;
  }
}

export async function getAttendanceSummary(date = getCurrentManilaDate()): Promise<AttendanceSummary> {
  try {
    const attendanceTable = await resolveAttendanceTableName();
    const [{count: totalCount, error: totalError}, {data: records, error: recordsError}] =
      await Promise.all([
        supabase.from(PARTICIPANTS_TABLE).select('*', {count: 'exact', head: true}),
        supabase
          .from(attendanceTable)
          .select('participant_id,time_in')
          .eq('attendance_date', date),
      ]);

    if (totalError) {
      throw totalError;
    }

    if (recordsError) {
      throw recordsError;
    }

    const uniquePresent = new Set<number>();
    let morning = 0;
    let afternoon = 0;

    (records ?? []).forEach(row => {
      if (typeof row.participant_id === 'number') {
        uniquePresent.add(row.participant_id);
      }

      if (typeof row.time_in === 'string') {
        if (resolveSessionFromTime(row.time_in) === 'morning') {
          morning += 1;
        } else {
          afternoon += 1;
        }
      }
    });

    const totalParticipants = totalCount ?? 0;
    const present = uniquePresent.size;
    const absent = Math.max(0, totalParticipants - present);

    return {
      totalParticipants,
      present,
      absent,
      morning,
      afternoon,
    };
  } catch (error) {
    const normalized = normalizeServiceError(error);
    if (normalized.message === 'Attendance table is not configured in Supabase yet.') {
      return EMPTY_SUMMARY;
    }
    throw normalized;
  }
}

export async function recordAttendanceByUid(
  uid: string,
  date = getCurrentManilaDate(),
): Promise<ScanResult> {
  try {
    const cleanUid = uid.trim();

    if (!cleanUid) {
      throw new Error('UID is required.');
    }

    const attendanceTable = await resolveAttendanceTableName();
    const {data: participant, error: participantError} = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('id,unique_id,full_name,society')
      .eq('unique_id', cleanUid)
      .single<ParticipantRow>();

    if (participantError || !participant) {
      throw new Error(`Participant not found for UID: ${cleanUid}`);
    }

    const {data: existing, error: existingError} = await supabase
      .from(attendanceTable)
      .select('time_in')
      .eq('participant_id', participant.id)
      .eq('attendance_date', date)
      .maybeSingle<{time_in: string}>();

    if (existingError) {
      throw existingError;
    }

    if (existing?.time_in) {
      return {
        status: 'already',
        uid: participant.unique_id,
        fullName: participant.full_name ?? 'Unknown',
        society: participant.society ?? '',
        session: resolveSessionFromTime(existing.time_in),
      };
    }

    const timeIn = getCurrentManilaTime();
    const {error: insertError} = await supabase.from(attendanceTable).insert({
      participant_id: participant.id,
      attendance_date: date,
      time_in: timeIn,
    });

    if (insertError) {
      throw insertError;
    }

    return {
      status: 'recorded',
      uid: participant.unique_id,
      fullName: participant.full_name ?? 'Unknown',
      society: participant.society ?? '',
      session: resolveSessionFromTime(timeIn),
    };
  } catch (error) {
    throw normalizeServiceError(error);
  }
}
