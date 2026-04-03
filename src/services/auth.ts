import type {Session} from '@supabase/supabase-js';
import {supabase} from './supabase/client';

export async function signInAdmin(email: string, password: string): Promise<Session> {
  const {data, error} = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error('No active session returned.');
  }

  return data.session;
}

export async function signOutAdmin(): Promise<void> {
  const {error} = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const {data, error} = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function onAuthSessionChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
