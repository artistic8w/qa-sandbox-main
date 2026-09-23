export type Role = 'admin' | 'accountant';
export type Locale = 'en' | 'nb';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  locale: Locale;
  active: boolean;
}
