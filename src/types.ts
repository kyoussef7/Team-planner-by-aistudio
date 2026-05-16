export interface Employee {
  name: string;
  hex: string;
  pin?: string; // e.g. "0001"
  skills?: string[]; // e.g., ['Kitchen', 'Delivery', 'Cashier']
  preferences?: {
    preferredHours?: number;
    avoidDays?: string[];
  };
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
  requirements?: {
    minStaff?: number;
    skillTags?: string[];
  };
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
