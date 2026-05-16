import { AppData, Employee } from './types';

export const DEFAULT_COLORS = [
  '#e85555', '#d49a4a', '#a07a5a', '#6a9a88',
  '#c4848a', '#8a7a9a', '#4a9ad4', '#5a8a7a',
  '#c47a4a', '#7a8ac4', '#d4a04a', '#8a6a7a'
];

export const DEFAULT_EMP: Employee[] = [
  { name: 'YOUSEF', hex: '#e85555', pin: '0001', skills: ['Kitchen', 'Manager'] },
  { name: 'AMINE', hex: '#d49a4a', pin: '0002', skills: ['Delivery', 'Cashier'] },
  { name: 'SOUFIAN', hex: '#a07a5a', pin: '0003', skills: ['Kitchen', 'Delivery'] },
  { name: 'HIBA', hex: '#6a9a88', pin: '0004', skills: ['Cashier', 'Service'] },
  { name: 'HIND', hex: '#c4848a', pin: '0005', skills: ['Service', 'Kitchen'] },
  { name: 'ASMA', hex: '#8a7a9a', pin: '0006', skills: ['Manager', 'Cashier'] },
];

export const LABELS = ['10-11', '11-12', '12-13', '13-14', '14-15', '15-16', '16-17', '17-18', '18-19', '19-20', '20-21', '21-22'];
export const HOURS = Array.from({ length: 12 }, (_, i) => i + 10);

export const SEED_DATA: AppData = [
  { id: 'lun', full: 'LUNDI', date: '04/05', shifts: [{ off: false, s: [1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: true, s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { off: false, s: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0] }] },
  { id: 'mar', full: 'MARDI', date: '05/05', shifts: [{ off: true, s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { off: false, s: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: true, s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }] },
  { id: 'mer', full: 'MERCREDI', date: '06/05', shifts: [{ off: false, s: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0] }, { off: true, s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { off: true, s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { off: false, s: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }] },
  { id: 'jeu', full: 'JEUDI', date: '07/05', shifts: [{ off: false, s: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: true, s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0] }, { off: false, s: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] }] },
  { id: 'ven', full: 'VENDREDI', date: '08/05', shifts: [{ off: false, s: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0] }, { off: false, s: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }] },
  { id: 'sam', full: 'SAMEDI', date: '09/05', shifts: [{ off: false, s: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }] },
  { id: 'dim', full: 'DIMANCHE', date: '10/05', shifts: [{ off: false, s: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0] }, { off: false, s: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] }, { off: false, s: [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0] }] },
];

export const MAX_FWD_WEEKS = 4;
export const IDLE_TIMEOUT = 300000;
