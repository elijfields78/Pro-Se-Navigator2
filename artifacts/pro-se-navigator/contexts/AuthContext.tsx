import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './types';

const AUTH_KEY = '@psn:auth';
const USERS_KEY = '@psn:users';

interface StoredUser extends User {
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !password) throw new Error('Email and password are required.');
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users: StoredUser[] = raw ? JSON.parse(raw) : [];
    const found = users.find((u) => u.email === trimmedEmail);
    if (!found) throw new Error('No account found with that email. Please create one.');
    if (found.password !== password) throw new Error('Incorrect password.');
    const { password: _pw, ...userObj } = found;
    setUser(userObj);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userObj));
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !password) throw new Error('Email and password are required.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users: StoredUser[] = raw ? JSON.parse(raw) : [];
    if (users.find((u) => u.email === trimmedEmail)) {
      throw new Error('An account already exists with that email.');
    }
    const newUser: User = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      email: trimmedEmail,
      name: name?.trim() || undefined,
    };
    users.push({ ...newUser, password });
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    setUser(newUser);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
