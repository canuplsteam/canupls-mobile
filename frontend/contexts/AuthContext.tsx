import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';

// Ensure the web browser prompt is dismissed on return
WebBrowser.maybeCompleteAuthSession();

type UserRole = 'requester' | 'helper' | 'both';

interface Profile {
  id: string;
  user_role: UserRole;
  full_name: string;
  phone?: string;
  address?: string;
  address_lat?: number;
  address_lng?: number;
  avatar_url?: string;
  rating: number;
  completed_tasks: number;
  is_available: boolean;
  stripe_customer_id?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: string,
    addressLat: number | null,
    addressLng: number | null
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Build the redirect URI for OAuth
  const redirectUri = makeRedirectUri({
    scheme: 'canupls',
    path: 'auth/callback',
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for deep link auth callbacks (when OAuth redirects back)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url && url.includes('auth/callback')) {
        await extractSessionFromUrl(url);
      }
    };

    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('auth/callback')) {
        extractSessionFromUrl(url);
      }
    });

    return () => {
      linkingSub.remove();
    };
  }, []);

  const extractSessionFromUrl = async (url: string) => {
    try {
      // Parse the URL fragment (#access_token=...&refresh_token=...)
      const hashPart = url.split('#')[1];
      if (!hashPart) return;

      const params = new URLSearchParams(hashPart);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Error setting session from URL:', error);
        }
      }
    } catch (error) {
      console.error('Error extracting session from URL:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet — create a default one
        // This handles OAuth users who don't go through the signup form
        const currentUser = (await supabase.auth.getUser()).data.user;
        const meta = currentUser?.user_metadata || {};
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            user_role: 'both',
            full_name: meta.full_name || meta.name || currentUser?.email?.split('@')[0] || 'New User',
            phone: meta.phone || '',
            address: meta.address || '',
            rating: 0,
            completed_tasks: 0,
            is_available: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          setProfile(newProfile);
        }
      } else if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: string,
    addressLat: number | null,
    addressLng: number | null
  ) => {
    try {
      setLoading(true);

      // Sign up with user metadata (so profile trigger/auto-create can use it)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            address: address,
            address_lat: addressLat,
            address_lng: addressLng,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Try to create the profile immediately
        // If email confirmation is required, this may fail due to RLS
        // In that case, the profile will be created when the user confirms and logs in
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              user_role: 'both',
              full_name: fullName,
              phone: phone,
              address: address,
              address_lat: addressLat,
              address_lng: addressLng,
              rating: 0,
              completed_tasks: 0,
              is_available: true,
            });

          if (profileError) {
            console.log('Profile will be created after email confirmation:', profileError.message);
          }
        } catch (profileErr) {
          console.log('Profile creation deferred to login');
        }

        // Check if the session was created (no email confirmation required)
        if (data.session) {
          // User is logged in immediately
          Alert.alert('Welcome!', 'Your account has been created successfully.');
        } else {
          // Email confirmation is required
          Alert.alert(
            'Check Your Email',
            'We sent a confirmation link to ' + email + '. Please verify your email to sign in.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Signup Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open the OAuth page in the system browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success' && result.url) {
          await extractSessionFromUrl(result.url);
        }
      }
    } catch (error: any) {
      Alert.alert('Google Sign In', error.message || 'Failed to sign in with Google. Please ensure Google OAuth is enabled in your Supabase project.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: 'email profile openid',
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success' && result.url) {
          await extractSessionFromUrl(result.url);
        }
      }
    } catch (error: any) {
      Alert.alert('Outlook Sign In', error.message || 'Failed to sign in with Outlook. Please ensure Azure OAuth is enabled in your Supabase project.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile
      await fetchProfile(user.id);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithMicrosoft,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
