export interface Employee {
  name: string;
  hex: string;
}

export interface Shift {
  off: boolean;
  s: number[]; // 1 or 0
}

export interface Day {
  id: string; // lun, mar, etc.
  full: string; // LUNDI
  date: string; // DD/MM
  shifts: Shift[];
}

export type AppData = Day[];

export type AccessRole = 'manager' | 'employee' | null;

export interface AppState {
  data: AppData;
  employees: Employee[];
  monday: Date;
  role: AccessRole;
  isEdit: boolean;
  theme: 'light' | 'dark' | 'simple';
}
