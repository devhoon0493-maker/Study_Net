import type { User } from "firebase/auth";

export const isPasswordProviderUser = (user: User | null) =>
  user?.providerData.some((provider) => provider.providerId === "password") ??
  false;

export const requiresEmailVerification = (user: User | null) =>
  isPasswordProviderUser(user) && !user?.emailVerified;
