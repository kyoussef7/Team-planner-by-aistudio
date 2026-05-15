import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  Settings, 
  Users, 
  Printer, 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Moon, 
  Sun, 
  Monitor, 
  QrCode, 
  Calendar, 
  Clock, 
  History, 
  Undo, 
  Redo, 
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  User,
  LogOut,
  RotateCcw,
  Share2,
  X,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format, addDays, startOfWeek, subDays, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp, collection, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth();

import { cn } from './lib/utils';
import { Employee, Day, AppData, AccessRole, AppState } from './types';
import { 
  DEFAULT_EMP, 
  SEED_DATA, 
  DEFAULT_COLORS, 
  MAX_FWD_WEEKS, 
  IDLE_TIMEOUT 
} from './constants';

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  DATA_PREFIX: 'planning_data_',
  EMPLOYEES: 'planning_emp_v1',
  MONDAY: 'planning_monday_v1',
  THEME: 'planning_theme_v1',
  PIN: 'planning_pin_v1',
  STAFF_PIN: 'planning_employee_pin_v1',
  CHANGELOG: 'planning_changelog_v1'
};

const DEFAULT_PIN = '1234';
const DEFAULT_EMPLOYEE_PIN = '0000';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const DayRow = ({ emp, ei, di, isEdit, toggleDayOff, toggleSlot, shift }: any) => {
  const hours = shift.s.reduce((a: number, b: number) => a + (b || 0), 0);
  const ini = emp.name.slice(0, 2).toUpperCase();

  return (
    <div 
      className={cn(
        "flex items-center px-4 lg:px-8 py-2 lg:py-4 transition-all duration-200 border-b border-border2/30 last:border-0", 
        shift.off ? "bg-bg/10" : "hover:bg-card2/30"
      )}
    >
      <div className="flex items-center gap-2 lg:gap-3 w-[80px] lg:w-[150px] flex-shrink-0 pr-2 lg:pr-4 lg:border-r lg:border-border2/50 mr-2 lg:mr-4">
        <div 
          className={cn(
            "w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-display font-bold text-[9px] lg:text-xs transition-all shadow-sm",
            shift.off ? "opacity-30 grayscale" : ""
          )} 
          style={!shift.off ? { backgroundColor: emp.hex + '15', color: emp.hex } : { backgroundColor: 'var(--border2)', color: 'var(--txt3)' }}
          onClick={() => isEdit && toggleDayOff(di, ei)}
        >
          {ini}
        </div>
        <div className="truncate min-w-0 flex-1">
          <p 
            className={cn("font-display font-bold text-[10px] lg:text-sm tracking-tight truncate", shift.off ? "text-txt3" : "")} 
            style={{ color: !shift.off ? emp.hex : undefined }}
            onClick={() => isEdit && toggleDayOff(di, ei)}
          >
            {emp.name}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-11 gap-1 h-8 lg:h-11 relative">
        {shift.off ? (
          <div className="col-span-11 bg-repeating-lines opacity-10 rounded-md flex items-center justify-center border border-border/20">
            <span className="font-mono text-[8px] lg:text-xs tracking-widest text-txt3 uppercase font-black">Day Off</span>
          </div>
        ) : (
          shift.s.map((v: number, si: number) => (
            <div 
              key={si}
              onClick={() => isEdit && toggleSlot(di, ei, si)}
              className={cn(
                "h-full rounded-md border transition-all",
                isEdit ? "cursor-pointer active:scale-95" : "cursor-default",
                v ? "border-white/20 shadow-sm" : "bg-surf/40 border-border/40"
              )}
              style={v ? { backgroundColor: emp.hex } : {}}
            />
          ))
        )}
      </div>

      <div className={cn(
        "w-[35px] lg:w-[60px] flex-shrink-0 text-right font-mono font-bold text-[11px] lg:text-lg ml-2 lg:ml-4 pl-2 lg:pl-4 border-l border-border2/50",
        shift.off ? "text-txt3" : ""
      )} style={{ color: !shift.off ? emp.hex : undefined }}>
        {shift.off ? '—' : `${hours}h`}
      </div>
    </div>
  );
};

const GanttCell = ({ di, ei, emp, shift }: any) => {
  const blocks = useMemo(() => {
    const res = [];
    let cur = null;
    for(let i=0; i<shift.s.length; i++) {
       if(shift.s[i]) {
          if(!cur) cur = { start: i, end: i };
          else cur.end = i;
       } else {
          if(cur) { res.push(cur); cur = null; }
       }
    }
    if(cur) res.push(cur);
    return res;
  }, [shift.s]);

  return (
    <div key={di} className={cn("relative h-14 border-r border-border flex items-center px-1 transition-colors")}>
       {shift.off ? (
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold opacity-10 bg-repeating-lines">OFF</span>
       ) : (
          blocks.map((b, bi) => (
             <div 
                key={bi}
                className="absolute h-8 rounded-lg shadow-sm shadow-black/10 border border-white/10"
                style={{ 
                   left: `${(b.start / 11) * 100}%`, 
                   width: `${((b.end - b.start + 1) / 11) * 100}%`,
                   backgroundColor: emp.hex,
                   zIndex: 10
                }}
                title={`${b.start+10}h - ${b.end+11}h`}
             />
          ))
       )}
    </div>
  );
};

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [data, setData] = useState<AppData>([]);
  const [monday, setMonday] = useState<Date>(new Date());
  const [role, setRole] = useState<AccessRole>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [view, setView] = useState<'dashboard' | 'day' | 'week' | 'gantt'>('day');
  const [theme, setTheme] = useState<'light' | 'dark' | 'simple'>('light');
  
  const [undoStack, setUndoStack] = useState<AppData[]>([]);
  const [redoStack, setRedoStack] = useState<AppData[]>([]);
  
  const [pinModal, setPinModal] = useState<{ open: boolean; role: AccessRole } | null>(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [empModal, setEmpModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [changelogModal, setChangelogModal] = useState(false);
  
  const [employeeIdx, setEmployeeIdx] = useState<number | null>(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const [idleTime, setIdleTime] = useState(0);

  const [selectedDayPopup, setSelectedDayPopup] = useState<number | null>(null);
  const [showTeamWeekPopup, setShowTeamWeekPopup] = useState(false);
  
  const realMonday = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const maxMonday = useMemo(() => addDays(realMonday, MAX_FWD_WEEKS * 7), [realMonday]);

  // --- Auto-lock ---
  useEffect(() => {
    if (!isEdit) return;
    const timer = setInterval(() => {
      setIdleTime(prev => prev + 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, [isEdit]);

  useEffect(() => {
    if (idleTime >= IDLE_TIMEOUT) {
      setIsEdit(false);
      setIdleTime(0);
      // Toast would be nice here
    }
  }, [idleTime]);

  const resetIdle = useCallback(() => {
    setIdleTime(0);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
    };
  }, [resetIdle]);

  // (Internal component implementation continued inside render)

  // --- Static Initial Load ---
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as any;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const savedMonday = localStorage.getItem(STORAGE_KEYS.MONDAY);
    if (savedMonday) {
      setMonday(new Date(savedMonday));
    } else {
      setMonday(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  }, []);

  // --- Auth & Firestore Management ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        if (u.email === 'khalidyoussef7@gmail.com') {
          setRole('manager');
          setIsEdit(true);
        } else {
          setRole(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const weekId = format(monday, 'yyyy-MM-dd');

  useEffect(() => {
    if (authLoading) return;
    const path = `plannings/${weekId}`;
    const unsubscribe = onSnapshot(doc(db, path), (docSnap) => {
      if (docSnap.exists()) {
        const remote = docSnap.data();
        setData(remote.data);
        if (remote.employees) setEmployees(remote.employees);
      } else {
        const savedEmp = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
        const emps = savedEmp ? JSON.parse(savedEmp) : [...DEFAULT_EMP];
        setEmployees(emps);
        setData(getBlankWeek(monday, emps));
      }
    }, (err) => {
      console.error("Firestore Error:", err);
    });
    return () => unsubscribe();
  }, [weekId, authLoading, monday]);

  const getBlankWeek = (m: Date, emps: Employee[]): AppData => {
    const dayNames = [
      { id: 'lun', full: 'LUNDI' },
      { id: 'mar', full: 'MARDI' },
      { id: 'mer', full: 'MERCREDI' },
      { id: 'jeu', full: 'JEUDI' },
      { id: 'ven', full: 'VENDREDI' },
      { id: 'sam', full: 'SAMEDI' },
      { id: 'dim', full: 'DIMANCHE' },
    ];
    return dayNames.map((d, i) => ({
      ...d,
      date: format(addDays(m, i), 'dd/MM'),
      shifts: emps.map(() => ({ off: false, s: new Array(11).fill(0) }))
    }));
  };

  const syncEmployeesInDayData = (dayData: AppData, emps: Employee[]) => {
    dayData.forEach(d => {
      while (d.shifts.length < emps.length) {
        d.shifts.push({ off: false, s: new Array(11).fill(0) });
      }
      if (d.shifts.length > emps.length) {
        d.shifts.splice(emps.length);
      }
    });
  };

  const saveData = async (newData: AppData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEYS.MONDAY, monday.toISOString());
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    
    if (role !== 'manager' || !user) return;

    const path = `plannings/${weekId}`;
    try {
      await setDoc(doc(db, path), {
        monday: monday.toISOString(),
        data: newData,
        employees: employees,
        updatedAt: serverTimestamp()
      });
      setShowSavedBadge(true);
      setTimeout(() => setShowSavedBadge(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const pushState = () => {
    setUndoStack(prev => [...prev.slice(-49), JSON.parse(JSON.stringify(data))]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(prevRedo => [...prevRedo, JSON.parse(JSON.stringify(data))]);
    setUndoStack(prevUndo => prevUndo.slice(0, -1));
    setData(prev);
    saveData(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prevUndo => [...prevUndo, JSON.parse(JSON.stringify(data))]);
    setRedoStack(prevRedo => prevRedo.slice(0, -1));
    setData(next);
    saveData(next);
  };

  // --- UI Handlers ---
  const toggleTheme = (t: 'light' | 'dark' | 'simple') => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEYS.THEME, t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const handleRoleSelect = (selectedRole: AccessRole) => {
    if (selectedRole === 'manager') {
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider).catch(err => {
        console.error("Login Error:", err);
      });
    } else {
      setPinModal({ open: true, role: selectedRole });
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, undoStack, redoStack]); // Re-bind on state change to ensure fresh values

  const handleDaySelect = (idx: number) => {
    setActiveDay(idx);
    if (view !== 'day') setView('day');
  };

  const ManagerDashboard = () => {
    const today = new Date();
    const todayIdx = data.findIndex((_, i) => isSameDay(addDays(monday, i), today));
    const todayData = todayIdx !== -1 ? data[todayIdx] : null;
    const activeStaffCount = todayData ? todayData.shifts.filter(s => !s.off && s.s.some(v => v)).length : 0;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-black tracking-tight text-txt uppercase">Manager Dashboard</h2>
            <p className="text-txt3 text-xs">Aperçu de la gestion d'équipe</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest bg-accent py-1 px-2 rounded text-white">Directeur</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-txt3 mb-4">Aujourd'hui</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <Users size={24} />
              </div>
              <div>
                <p className="text-2xl font-display font-black text-txt">{activeStaffCount}</p>
                <p className="text-[10px] text-txt3 uppercase font-bold">Staff Présent</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-txt3 mb-4">Total Planning</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center text-green">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-2xl font-display font-black text-txt">{grandTotal}h</p>
                <p className="text-[10px] text-txt3 uppercase font-bold">Heures Semaine</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-txt3 mb-4">Alertes</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber/10 flex items-center justify-center text-amber">
                <Shield size={24} />
              </div>
              <div>
                <p className="text-2xl font-display font-black text-txt">{offDays}</p>
                <p className="text-[10px] text-txt3 uppercase font-bold">Repos Semaine</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-card border border-border rounded-3xl p-6">
              <h3 className="font-display font-black text-sm uppercase mb-4 flex items-center gap-2">
                 <Clock size={16} className="text-accent" />
                 Qui est là maintenant ?
              </h3>
              <div className="space-y-2">
                 {todayData ? employees.map((e, ei) => {
                    const sh = todayData.shifts[ei];
                    if(!sh.off && sh.s.some(v => v)) {
                       return (
                          <div key={ei} className="flex items-center justify-between p-3 bg-bg rounded-2xl border border-border2">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: e.hex }} />
                                <span className="font-bold text-sm">{e.name}</span>
                             </div>
                             <span className="text-[10px] font-mono font-bold text-txt3">En poste</span>
                          </div>
                       )
                    }
                    return null;
                 }) : <p className="text-txt3 text-xs italic">Aucune donnée disponible pour aujourd'hui</p>}
              </div>
           </div>

           <div className="bg-card border border-border rounded-3xl p-6">
              <h3 className="font-display font-black text-sm uppercase mb-4 flex items-center gap-2">
                 <LayoutDashboard size={16} className="text-green" />
                 Actions rapides
              </h3>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setView('day')} className="p-4 bg-bg border border-border rounded-2xl hover:border-accent transition-all text-left">
                    <p className="font-bold text-xs">Modifier Jour</p>
                    <p className="text-[9px] text-txt3">Planning quotidien</p>
                 </button>
                 <button onClick={() => setView('week')} className="p-4 bg-bg border border-border rounded-2xl hover:border-accent transition-all text-left">
                    <p className="font-bold text-xs">Vue Semaine</p>
                    <p className="text-[9px] text-txt3">Perspective globale</p>
                 </button>
                 <button onClick={() => setEmpModal(true)} className="p-4 bg-bg border border-border rounded-2xl hover:border-accent transition-all text-left">
                    <p className="font-bold text-xs">Équipe</p>
                    <p className="text-[9px] text-txt3">Gérer l'équipe</p>
                 </button>
                 <button onClick={() => setQrModal(true)} className="p-4 bg-bg border border-border rounded-2xl hover:border-accent transition-all text-left">
                    <p className="font-bold text-xs">Partager</p>
                    <p className="text-[9px] text-txt3">Export PDF/QR</p>
                 </button>
              </div>
           </div>
        </div>
      </motion.div>
    );
  };
  const [managerPinInput, setManagerPinInput] = useState(localStorage.getItem(STORAGE_KEYS.PIN) || DEFAULT_PIN);
  const [employeePinInput, setEmployeePinInput] = useState(localStorage.getItem(STORAGE_KEYS.STAFF_PIN) || DEFAULT_EMPLOYEE_PIN);

  const updatePin = (pinRole: 'manager' | 'employee', val: string) => {
    if (val.length > 4) return;
    if (pinRole === 'manager') {
      setManagerPinInput(val);
      if (val.length === 4) localStorage.setItem(STORAGE_KEYS.PIN, val);
    } else {
      setEmployeePinInput(val);
      if (val.length === 4) localStorage.setItem(STORAGE_KEYS.STAFF_PIN, val);
    }
  };
  const handleUnlock = (success: boolean) => {
    if (success) {
      if (pinModal?.role === 'manager') {
        setIsEdit(true);
        setRole('manager');
        setView('dashboard');
      } else {
        setEmployeeIdx(null); // Clear previous selection
        setRole('employee');
      }
      setPinModal(null);
    }
  };

  const logout = () => {
    signOut(auth).then(() => {
      setRole(null);
      setIsEdit(false);
      setEmployeeIdx(null);
      setUser(null);
    });
  };

  const toggleSlot = (di: number, ei: number, si: number) => {
    if (!isEdit) return;
    pushState();
    const newData = [...data];
    newData[di].shifts[ei].s[si] = newData[di].shifts[ei].s[si] === 1 ? 0 : 1;
    saveData(newData);
  };

  const toggleDayOff = (di: number, ei: number) => {
    if (!isEdit) return;
    pushState();
    const newData = [...data];
    const sh = newData[di].shifts[ei];
    sh.off = !sh.off;
    if (sh.off) sh.s = new Array(11).fill(0);
    saveData(newData);
  };

  const addEmployee = (name: string) => {
    const n = name.trim().toUpperCase();
    if (!n || employees.some(e => e.name === n)) return;
    const newEmp = { name: n, hex: DEFAULT_COLORS[employees.length % DEFAULT_COLORS.length] };
    const newEmps = [...employees, newEmp];
    setEmployees(newEmps);
    const newData = [...data];
    syncEmployeesInDayData(newData, newEmps);
    saveData(newData);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(newEmps));
  };

  const removeEmployee = (idx: number) => {
    if (!window.confirm('Supprimer cet employé ?')) return;
    const newEmps = employees.filter((_, i) => i !== idx);
    setEmployees(newEmps);
    const newData = [...data];
    syncEmployeesInDayData(newData, newEmps);
    saveData(newData);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(newEmps));
  };

  const updateEmpColor = (idx: number, hex: string) => {
    const newEmps = [...employees];
    newEmps[idx].hex = hex;
    setEmployees(newEmps);
  };

  const moveEmployee = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= employees.length) return;
    const newEmps = [...employees];
    [newEmps[idx], newEmps[target]] = [newEmps[target], newEmps[idx]];
    setEmployees(newEmps);
    
    // Sync data row order
    const newData = data.map(d => {
      const newShifts = [...d.shifts];
      [newShifts[idx], newShifts[target]] = [newShifts[target], newShifts[idx]];
      return { ...d, shifts: newShifts };
    });
    saveData(newData);
  };

  const changeWeek = (dir: number) => {
    const newMonday = addDays(monday, dir * 7);
    if (dir > 0 && newMonday > maxMonday) return;
    setMonday(newMonday);
    setUndoStack([]);
    setRedoStack([]);
  };

  const copyDay = (fromIdx: number, toIdx: number) => {
    pushState();
    const newData = [...data];
    newData[toIdx].shifts = JSON.parse(JSON.stringify(newData[fromIdx].shifts));
    saveData(newData);
  };

  const copyPrevWeek = async () => {
    const prevMon = subDays(monday, 7);
    const prevWeekId = format(prevMon, 'yyyy-MM-dd');
    const prevPath = `plannings/${prevWeekId}`;
    try {
      const docSnap = await getDoc(doc(db, prevPath));
      if (!docSnap.exists()) return alert('Aucune donnée pour la semaine précédente');
      if (!window.confirm('Copier toute la semaine précédente ?')) return;
      
      pushState();
      const remote = docSnap.data();
      const newData = data.map((d, i) => {
        if (remote.data[i]) {
          return { ...d, shifts: JSON.parse(JSON.stringify(remote.data[i].shifts)) };
        }
        return d;
      });
      saveData(newData);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, prevPath);
    }
  };

  const resetAll = () => {
    if (!window.confirm('Réinitialiser toutes les données ?')) return;
    localStorage.clear();
    setRole(null);
    setIsEdit(false);
  };

  // --- Calculations ---
  const grandTotal = useMemo(() => {
    return data.reduce((acc, d) => acc + d.shifts.reduce((a, sh) => a + (sh.off ? 0 : sh.s.reduce((x, y) => x + y, 0)), 0), 0);
  }, [data]);

  const avgPerDay = Math.round(grandTotal / 7);

  const offDays = useMemo(() => {
    return data.reduce((acc, d) => acc + d.shifts.filter(sh => sh.off).length, 0);
  }, [data]);

  // --- Rendering Helpers ---
  const currentDayData = data[activeDay];

  if (!role && !pinModal) {
    // ... Splash Screen (already implemented, keeping it there)
  }

  // Inject logic into sub-components for the main return
  // We'll pass these as props or use them in place.

  // --- Actual Return ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!role && !pinModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg p-4 overflow-hidden relative">
        <div className="noise-texture" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl text-center relative z-10"
        >
          <div className="mb-6 relative inline-block">
            <div className="absolute inset-0 rounded-full border-2 border-accent animate-pulse" />
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent relative">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Accès Planning</h1>
          <p className="text-txt3 text-sm mb-8">Choisissez votre mode d'accès pour continuer.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleRoleSelect('manager')}
              className="flex flex-col items-center gap-3 p-4 border border-border2 rounded-xl hover:border-accent hover:-translate-y-1 transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                <Shield size={20} />
              </div>
              <span className="font-display font-bold text-sm">Manager</span>
              <span className="text-[8px] text-txt3 font-bold uppercase tracking-widest -mt-1 opacity-60">Via Google</span>
            </button>
            <button 
              onClick={() => handleRoleSelect('employee')}
              className="flex flex-col items-center gap-3 p-4 border border-border2 rounded-xl hover:border-green hover:-translate-y-1 transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center text-green group-hover:bg-green group-hover:text-white transition-colors">
                <User size={20} />
              </div>
              <span className="font-display font-bold text-sm">Employee</span>
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/40 pt-6">
            <span className="text-[10px] text-txt3 uppercase tracking-widest font-semibold">Thème</span>
            <div className="flex gap-4">
              {[
                { id: 'light', icon: Sun },
                { id: 'dark', icon: Moon },
                { id: 'simple', icon: Monitor }
              ].map((t) => (
                <button 
                  key={t.id}
                  onClick={() => toggleTheme(t.id as any)}
                  className={cn(
                    "p-2 rounded-full transition-all hover:scale-110",
                    theme === t.id ? "text-accent scale-110" : "text-txt3"
                  )}
                >
                  <t.icon size={18} />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Handle Employee Identity Selection
  if (role === 'employee' && employeeIdx === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg p-4 relative">
        <div className="noise-texture" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center z-10"
        >
          <button onClick={() => setRole(null)} className="absolute top-6 left-6 p-2 hover:bg-card2 rounded-lg text-txt3"><ChevronLeft size={18} /></button>
          <div className="mb-6 relative inline-block">
            <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center text-green">
              <User size={32} />
            </div>
          </div>
          <h2 className="text-xl font-display font-bold mb-1">Qui êtes-vous ?</h2>
          <p className="text-txt3 text-xs mb-8">Sélectionnez votre nom pour accéder à votre espace</p>
          
          <div className="space-y-3">
             {employees.map((e, idx) => (
                <button 
                  key={idx}
                  onClick={() => setEmployeeIdx(idx)}
                  className="w-full flex items-center gap-4 p-4 bg-bg border border-border2 rounded-2xl hover:border-green hover:bg-green/5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-xs shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: e.hex + '20', color: e.hex, border: `1px solid ${e.hex}40` }}>
                    {e.name.slice(0, 2)}
                  </div>
                  <span className="font-display font-bold text-sm flex-1">{e.name}</span>
                  <ChevronRight size={16} className="text-txt3 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
             ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Define Personal View for Employees
  const PersonalView = () => {
    if (employeeIdx === null) return null;
    const emp = employees[employeeIdx];
    const weeklyTotal = data.reduce((acc, d) => acc + (d.shifts[employeeIdx].off ? 0 : d.shifts[employeeIdx].s.reduce((a, b: number) => a + (b || 0), 0)), 0);

    // Find next shift
    const today = new Date();
    let nextShiftInfo = "Aucun shift prévu";
    for(let i=0; i<7; i++) {
       const dayDate = addDays(monday, i);
       if(dayDate >= today || isSameDay(dayDate, today)) {
          const sh = data[i].shifts[employeeIdx];
          if(!sh.off && sh.s.some(v => v)) {
             const startHour = sh.s.findIndex(v => v) + 10;
             nextShiftInfo = `${data[i].full} à ${startHour}h`;
             break;
          }
       }
    }

    return (
       <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         className="space-y-4 lg:space-y-6"
       >
         {/* Employee Dashboard Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
               <span className="text-[10px] font-black uppercase tracking-widest text-txt3">Prochain Shift</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                     <Clock size={16} />
                  </div>
                  <span className="font-display font-black text-sm text-txt uppercase">{nextShiftInfo}</span>
               </div>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
               <span className="text-[10px] font-black uppercase tracking-widest text-txt3">Total Heures (Semaine)</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green">
                     <Calendar size={16} />
                  </div>
                  <span className="font-display font-black text-sm text-txt">{weeklyTotal}h</span>
               </div>
            </div>
         </div>

         <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-lg">
            <div className="px-4 lg:px-6 py-3 bg-card2 border-b border-border flex items-center justify-between gap-4 group">
               <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white font-display font-black text-lg lg:text-xl shadow-lg ring-2 ring-white/10" 
                    style={{ backgroundColor: emp.hex }}
                   >
                    {emp.name.slice(0, 1)}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xl lg:text-2xl font-display font-black tracking-tight text-txt uppercase leading-none">{emp.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                       <button onClick={() => changeWeek(-1)} className="text-txt3 hover:text-accent transition-colors active:scale-90"><ChevronLeft size={16} /></button>
                       <span className="font-mono text-[10px] font-bold text-txt3 opacity-60">{format(monday, 'dd MMM')} - {format(addDays(monday, 6), 'dd MMM')}</span>
                       <button onClick={() => changeWeek(1)} className="text-txt3 hover:text-accent transition-colors active:scale-90"><ChevronRight size={16} /></button>
                    </div>
                  </div>
               </div>
            </div>

            <div className="divide-y divide-border/30">
               {/* Time Header for Employees */}
               <div className="grid grid-cols-[80px_1fr_40px] lg:grid-cols-[110px_1fr_60px] items-center px-4 lg:px-6 py-2 bg-card2/30 border-b border-border/50">
                  <div />
                  <div className="grid grid-cols-11 gap-0.5 lg:gap-1 px-1">
                     {Array.from({ length: 11 }).map((_, i) => (
                        <span key={i} className="text-[8px] lg:text-[10px] font-mono font-bold text-txt3 text-center">{i + 10}</span>
                     ))}
                  </div>
                  <div />
               </div>

               {data.map((day, di) => {
                  const sh = day.shifts[employeeIdx!];
                  const h = sh.s.reduce((a, b: number) => a + (b || 0), 0);
                  const isToday = isSameDay(addDays(monday, di), new Date());
                  
                  return (
                    <div 
                      key={di} 
                      className={cn("grid grid-cols-[80px_1fr_40px] lg:grid-cols-[110px_1fr_60px] items-center p-3 lg:p-6 transition-colors", sh.off ? "bg-bg/20 opacity-70" : isToday ? "bg-accent/5 border-l-2 border-l-accent" : "hover:bg-card2/50")}
                    >
                        <div className="flex flex-col gap-0.5 overflow-hidden pr-2">
                           <span className={cn("text-[10px] lg:text-sm font-display font-black uppercase tracking-widest truncate", isToday ? "text-accent" : "text-txt")}>{day.id}</span>
                           <span className="text-[8px] lg:text-[10px] text-txt3 font-mono opacity-60">{day.date}</span>
                        </div>

                        <div className="min-w-0">
                           {sh.off ? (
                              <div className="h-8 lg:h-12 bg-bg/40 rounded-lg flex items-center justify-center border border-border/50 border-dashed">
                                 <span className="text-[8px] lg:text-xs font-bold uppercase tracking-[0.2em] text-txt3 opacity-40">Repos</span>
                              </div>
                           ) : h > 0 ? (
                              <div className="flex flex-col gap-2">
                                 <div className="grid grid-cols-11 gap-0.5 lg:gap-1.5 h-8 lg:h-12">
                                    {sh.s.map((v, i) => (
                                       <div 
                                          key={i} 
                                          className={cn("rounded-[3px] lg:rounded-xl transition-all", v ? "shadow-md border border-white/10" : "bg-bg/40 border border-border/30")}
                                          style={{ backgroundColor: v ? emp.hex : undefined }}
                                       />
                                    ))}
                                 </div>
                              </div>
                           ) : (
                              <div className="h-8 lg:h-12 rounded-lg flex items-center justify-center border border-border/30 border-dashed">
                                 <span className="text-[8px] lg:text-xs text-txt3 font-mono opacity-30">Non planifié</span>
                              </div>
                           )}
                        </div>

                        <div className="text-right flex flex-col items-end">
                           <span className={cn("text-xs lg:text-xl font-mono font-black", sh.off ? "text-txt3 opacity-40" : "text-accent")}>{sh.off ? '—' : h + 'h'}</span>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-2 lg:gap-4 px-2 lg:px-0">
            <button onClick={() => setShowTeamWeekPopup(true)} className="flex-1 bg-accent/10 border border-accent/20 text-accent py-3 lg:py-4 rounded-2xl font-display font-bold text-[10px] lg:text-xs hover:bg-accent/20 transition-all flex items-center justify-center gap-2">
               <Calendar size={14} />
               Planning Complet Équipe
            </button>
            <button onClick={logout} className="flex-1 bg-card border border-border py-3 lg:py-4 rounded-2xl font-display font-bold text-[10px] lg:text-xs text-red hover:bg-red-l transition-all">Déconnexion</button>
         </div>
       </motion.div>
    );
  };

  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-surf border-t border-border flex justify-around p-2 pb-[env(safe-area-inset-bottom)] z-[60] shadow-lg overflow-x-auto">
      {[
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'day', label: 'Jour', icon: Clock },
        { id: 'week', label: 'Semaine', icon: Calendar },
        { id: 'gantt', label: 'Gantt', icon: Users }
      ].map(item => (
        <button
          key={item.id}
          onClick={() => setView(item.id as any)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-shrink-0",
            view === item.id ? "text-accent" : "text-txt3"
          )}
        >
          <item.icon size={20} />
          <span className="text-[10px] font-bold uppercase">{item.label}</span>
        </button>
      ))}
        {isEdit && (
          <>
            <button onClick={copyPrevWeek} className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-txt3 flex-shrink-0">
              <Copy size={20} />
              <span className="text-[10px] font-bold uppercase">Init.</span>
            </button>
            <button onClick={() => setEmpModal(true)} className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-txt3 flex-shrink-0">
              <Users size={20} />
              <span className="text-[10px] font-bold uppercase">Équipe</span>
            </button>
            <button onClick={() => setSettingsModal(true)} className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-txt3 flex-shrink-0">
              <MoreHorizontal size={20} />
              <span className="text-[10px] font-bold uppercase">Options</span>
            </button>
            <button onClick={handleUndo} disabled={undoStack.length === 0} className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-txt3 flex-shrink-0 disabled:opacity-30">
              <RotateCcw size={20} />
              <span className="text-[10px] font-bold uppercase">Undo</span>
            </button>
            <button onClick={() => setQrModal(true)} className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-txt3 flex-shrink-0">
              <QrCode size={20} />
              <span className="text-[10px] font-bold uppercase">Partager</span>
            </button>
          </>
        )}
    </nav>
  );

  return (
    <div className="h-screen flex flex-col bg-bg relative overflow-hidden">
      <div className="noise-texture" />
          
          {/* --- Header --- */}
          <header className="flex-shrink-0 bg-surf border-b border-border px-4 lg:px-8">
        <div className="h-12 lg:h-16 flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 lg:gap-4 truncate">
            <div className="flex-shrink-0">
               <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Lee_cooper_logo.png" alt="Lee Cooper" className="h-6 lg:h-8 w-auto invert dark:invert-0" />
            </div>
            <div className="hidden sm:block border-l border-border h-6 mx-1 lg:mx-2" />
            <div className="truncate">
              <h1 className="font-display font-bold text-sm lg:text-base leading-none truncate">LCK TARGA</h1>
              <p className="text-[10px] lg:text-xs text-txt3 font-mono mt-1">Planning Hebdomadaire</p>
            </div>
          </div>

          {/* Quick Emp Summary (Manager Only) */}
          {isEdit && (
            <div className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar max-w-sm">
              {employees.map((e, i) => {
                const hours = data.reduce((acc, d) => {
                  const sh = d.shifts[i];
                  return acc + (sh.off ? 0 : sh.s.reduce((a, b) => a + b, 0));
                }, 0);
                return (
                  <div key={e.name} className="flex items-center gap-1.5 px-2 py-1 bg-card2 border border-border rounded-lg text-[10px] font-mono whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.hex }} />
                    <span className="font-bold">{e.name.slice(0, 2)}</span>
                    <span className="text-accent">{hours}h</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 lg:gap-3 ml-auto">
            <AnimatePresence>
              {showSavedBadge && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="hidden md:flex items-center gap-1.5 text-green font-mono text-[10px] lg:text-xs font-bold"
                >
                  <CheckCircle2 size={12} />
                  <span>Sauvegardé</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => isEdit ? setIsEdit(false) : handleRoleSelect('manager')}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full text-[9px] lg:text-xs font-display font-bold border transition-all",
                isEdit 
                  ? "bg-green-l border-green text-green" 
                  : "bg-amber-l border-amber text-amber"
              )}
            >
              <div className={cn("w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full", isEdit ? "bg-green" : "bg-amber")} />
              <span>{isEdit ? 'Édition' : 'Consultation'}</span>
            </button>

            <div className="hidden lg:flex items-center gap-1 ml-2">
              <button disabled={!isEdit || undoStack.length === 0} onClick={handleUndo} className="p-2 border border-border bg-card2 rounded-lg text-txt3 hover:text-txt disabled:opacity-30 transition-all">
                <Undo size={16} />
              </button>
              <button disabled={!isEdit || redoStack.length === 0} onClick={handleRedo} className="p-2 border border-border bg-card2 rounded-lg text-txt3 hover:text-txt disabled:opacity-30 transition-all">
                <Redo size={16} />
              </button>
            </div>

            <button onClick={() => setQrModal(true)} className="p-2 border border-border bg-card2 rounded-lg text-txt3 hover:text-txt transition-all ml-1">
              <QrCode size={16} />
            </button>

            <button onClick={logout} className="p-2 border border-border bg-card2 rounded-lg text-red hover:bg-red-l transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <BottomNav />

      {/* --- Main Content --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-1 lg:p-8 flex flex-col min-h-0 space-y-1 lg:space-y-8 pb-24">
        
        {/* Header Stats bar */}
        <div className={cn("flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6", view === 'day' && "hidden sm:grid")}>
          {[
            { label: 'Total Semaine', value: `${grandTotal}h`, sub: 'Heures planifiées', icon: Calendar, color: 'text-accent' },
            { label: 'Moyenne / Jour', value: `${avgPerDay}h`, sub: 'Par journée', icon: Clock, color: 'text-txt' },
            { label: 'Effectif', value: employees.length, sub: 'Agents actifs', icon: Users, color: 'text-txt' },
            { label: 'Jours Repos', value: offDays, sub: 'Temps libre', icon: Moon, color: 'text-txt' }
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border px-5 py-4 lg:py-6 rounded-2xl shadow-sm relative overflow-hidden group transition-all duration-300 hover:border-accent/40">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon size={48} />
              </div>
              <p className="text-[10px] font-sans font-bold text-txt3 uppercase tracking-[0.1em] mb-1.5">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl lg:text-3xl font-bold tracking-tighter", stat.color)}>{stat.value}</span>
              </div>
              <p className="text-[9px] text-txt3 font-mono mt-2 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Week Selection & View Controls */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-3 lg:gap-4 bg-card border border-border p-2 lg:p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button onClick={() => changeWeek(-1)} className="p-2 border border-border rounded-xl text-txt3 hover:text-accent hover:bg-accent-l transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 text-center sm:min-w-[180px] px-4">
              <span className="font-mono font-bold text-xs lg:text-sm text-txt">
                {weekLabel(monday)}
              </span>
            </div>
            <button 
              onClick={() => changeWeek(1)} 
              disabled={monday >= maxMonday}
              className="p-2 border border-border rounded-xl text-txt3 hover:text-accent hover:bg-accent-l transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-txt3"
            >
              <ChevronRight size={18} />
            </button>
            <button 
              onClick={() => {
                if (!isSameDay(monday, realMonday)) {
                  setMonday(realMonday);
                  const dataKey = `${STORAGE_KEYS.DATA_PREFIX}${format(realMonday, 'yyyy_MM_dd')}`;
                  const savedData = localStorage.getItem(dataKey);
                  if (savedData) {
                    setData(JSON.parse(savedData));
                  } else {
                    const initial = getBlankWeek(realMonday, employees);
                    setData(initial);
                    localStorage.setItem(dataKey, JSON.stringify(initial));
                  }
                  setUndoStack([]);
                  setRedoStack([]);
                }
              }}
              className="p-2 border border-border rounded-xl text-txt3 hover:text-accent hover:bg-accent-l transition-all"
              title="Aujourd'hui"
            >
              <History size={16} />
            </button>
          </div>
        </div>

        {/* Day Totals Bar */}
        <div className={cn("flex-shrink-0 grid grid-cols-7 gap-1.5 lg:gap-4 overflow-x-auto no-scrollbar", view === 'day' && "lg:grid")}>
          {data.map((day, idx) => {
            const isToday = isSameDay(addDays(monday, idx), new Date());
            const total = day.shifts.reduce((acc, sh) => acc + (sh.off ? 0 : sh.s.reduce((a, b: number) => a + (b || 0), 0)), 0);
            return (
              <button 
                key={day.id}
                onClick={() => handleDaySelect(idx)}
                className={cn(
                  "flex flex-col items-center py-2 lg:py-5 border rounded-xl transition-all duration-300 group",
                  activeDay === idx 
                    ? "bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-105" 
                    : isToday 
                      ? "bg-amber-l border-amber/40 hover:border-amber" 
                      : "bg-card border-border hover:border-txt3"
                )}
              >
                <span className={cn(
                  "text-[9px] lg:text-xs font-bold uppercase tracking-widest",
                  activeDay === idx ? "text-white/80" : isToday ? "text-amber" : "text-txt3"
                )}>{day.id}</span>
                <span className={cn(
                  "text-xs lg:text-xl font-bold mt-0.5 lg:mt-1",
                  activeDay === idx ? "text-white" : isToday ? "text-amber" : "text-txt"
                )}>{total}h</span>
              </button>
            );
          })}
        </div>

        {/* --- Area Specific Content --- */}
        <AnimatePresence mode="wait">
          {view === 'dashboard' && role === 'manager' && (
            <ManagerDashboard />
          )}

          {view === 'dashboard' && role === 'employee' && (
            <PersonalView />
          )}

          {view === 'day' && (
            <motion.div 
              key="day"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-h-0 flex flex-col"
            >
               {/* Day Card */}
              {data[activeDay] && (
                <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl lg:rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col relative">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,transparent_100%)] pointer-events-none" />
                  
                   <div className="flex-shrink-0 p-4 lg:p-10 bg-surf/80 backdrop-blur-md border-b border-border flex items-center justify-between z-10">
                     <div className="flex items-center gap-4 lg:gap-8">
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-accent/5 border border-accent/20 rounded-[1.25rem] lg:rounded-[2rem] flex items-center justify-center text-accent font-display font-black text-xl lg:text-5xl shadow-inner">
                          {data[activeDay].full.slice(0, 1)}
                        </div>
                        <div>
                          <h2 className="text-xl lg:text-4xl font-display font-bold tracking-tight text-txt uppercase">{data[activeDay].full}</h2>
                          <div className="flex items-center gap-2 mt-1 lg:mt-3">
                            <span className="text-[10px] lg:text-base text-txt3 font-mono tracking-widest uppercase bg-card2/50 px-2 lg:px-4 py-0.5 lg:py-1 rounded-full border border-border">{data[activeDay].date}</span>
                          </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-2 lg:gap-4">
                       <div className="flex items-center gap-3">
                          <div className="hidden lg:block w-32 h-2.5 bg-border/40 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_15px_rgba(230,57,70,0.3)]" 
                               style={{ width: `${Math.min(100, (data[activeDay].shifts.reduce((a, sh) => a + (sh.off ? 0 : sh.s.reduce((va, vb) => va + vb, 0)), 0) / (employees.length * 11)) * 100)}%` }}
                             />
                          </div>
                          <span className="text-3xl lg:text-6xl font-display font-black text-accent tracking-tighter leading-none">
                            {data[activeDay].shifts.reduce((acc, sh) => acc + (sh.off ? 0 : sh.s.reduce((a, b) => a + b, 0)), 0)}<small className="text-xs lg:text-2xl font-bold ml-1 opacity-40 uppercase">h</small>
                          </span>
                       </div>
                       <span className="text-[9px] lg:text-xs text-txt3 uppercase font-bold tracking-[0.2em] bg-accent/5 px-3 py-1 rounded-full border border-accent/10">COUVERTURE TOTALE</span>
                     </div>
                   </div>

                   <div className="flex-1 min-h-0 min-w-0 overflow-x-auto no-scrollbar bg-card2/20">
                      <div className="min-w-[480px] lg:min-w-[900px] h-full flex flex-col pt-4 lg:pt-8 px-4 lg:px-10 pb-20">
                        {/* Time Ruler */}
                        <div className="flex-shrink-0 flex items-center px-4 lg:px-8 py-3 lg:py-6 bg-surf border border-border shadow-sm rounded-xl lg:rounded-2xl mb-4 lg:mb-8 sticky top-0 z-20">
                          <div className="w-[80px] lg:w-[150px] shrink-0 text-[10px] lg:text-xs font-display font-black text-txt3 tracking-[0.15em] uppercase mr-2 lg:mr-4">Équipe</div>
                          <div className="flex-1 grid grid-cols-11 gap-1">
                            {Array.from({ length: 11 }).map((_, i) => {
                               const hour = i + 10;
                               const isNow = new Date().getHours() === hour;
                               return (
                                 <div key={i} className="text-center group">
                                   <div className="flex flex-col items-center">
                                     <span className={cn(
                                       "text-[9px] lg:text-sm font-mono font-bold transition-colors",
                                       isNow ? "text-accent scale-110" : "text-txt group-hover:text-accent"
                                     )}>{hour}</span>
                                     <span className={cn(
                                       "text-[7px] lg:text-[10px] font-mono opacity-40 uppercase",
                                       isNow ? "text-accent opacity-100 font-bold" : "text-txt3"
                                     )}>{hour >= 12 ? 'pm' : 'am'}</span>
                                   </div>
                                 </div>
                               );
                            })}
                          </div>
                          <div className="w-[35px] lg:w-[60px] shrink-0 text-right text-[10px] lg:text-xs font-display font-black text-txt3 tracking-[0.15em] uppercase ml-2 lg:ml-4">Total</div>
                        </div>

                        <div className="bg-surf border border-border rounded-xl lg:rounded-[2.5rem] shadow-sm divide-y divide-border/30 overflow-hidden">
                           {employees.map((emp, ei) => (
                             <DayRow 
                               key={emp.name} 
                               emp={emp} 
                               ei={ei} 
                               di={activeDay} 
                               isEdit={isEdit} 
                               toggleDayOff={toggleDayOff}
                               toggleSlot={toggleSlot}
                               shift={data[activeDay].shifts[ei]}
                             />
                           ))}
                        </div>
                      </div>
                    </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'week' && (
             <motion.div 
               key="week"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="bg-card border border-border rounded-3xl p-4 lg:p-8 shadow-lg flex flex-col"
             >
                {/* Weekly Goal Indicator */}
                <div className="mb-6 lg:mb-8 flex items-center justify-between pb-4 lg:pb-6 border-b border-border">
                  <div>
                    <h3 className="font-display font-black text-base lg:text-lg tracking-tight uppercase">Récapitulatif Hebdomadaire</h3>
                    <p className="text-[10px] lg:text-xs text-txt3">Aperçu global de la distribution des heures</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl lg:text-2xl font-display font-black text-accent leading-none">{grandTotal}h</span>
                    <p className="text-[8px] lg:text-[10px] text-txt3 uppercase font-bold tracking-widest leading-none mt-1">Total Magasin</p>
                  </div>
                </div>

                {grandTotal === 0 && isEdit && (
                   <div className="mb-8 p-12 flex flex-col items-center justify-center text-center space-y-4 bg-bg/20 border-2 border-dashed border-border rounded-3xl">
                      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <Copy size={32} />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-lg uppercase text-txt">Semaine non planifiée</h4>
                        <p className="text-xs text-txt3 mt-2 max-w-sm">Vous pouvez commencer de zéro ou gagner du temps en copiant l'horaire de la semaine passée.</p>
                      </div>
                      <button 
                        onClick={copyPrevWeek}
                        className="flex items-center gap-3 px-8 py-4 bg-accent text-white rounded-2xl font-display font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <RotateCcw size={18} />
                        Copier la semaine précédente
                      </button>
                   </div>
                )}

                {/* Mobile View Card List */}
                <div className="lg:hidden space-y-4">
                  {employees.map((emp, ei) => {
                    const weeklyTotal = data.reduce((acc, d) => acc + (d.shifts[ei].off ? 0 : d.shifts[ei].s.reduce((a, b) => a + (b || 0), 0)), 0);
                    return (
                      <div key={emp.name} className="bg-bg/30 border border-border rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-[10px] border border-border" style={{ backgroundColor: emp.hex + '10', color: emp.hex }}>
                              {emp.name.slice(0, 2)}
                            </div>
                            <div>
                               <p className="font-display font-bold text-sm tracking-tight leading-none">{emp.name}</p>
                               <p className="text-[8px] text-txt3 font-mono opacity-60 mt-1 uppercase">Poste Actif</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                                <span className="text-sm font-mono font-black text-accent">{weeklyTotal}h</span>
                             </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 h-20">
                           {data.map((d, di) => {
                              const sh = d.shifts[ei];
                              const h = sh.s.reduce((a, b) => a + (b || 0), 0);
                              return (
                                 <div key={di} className="flex flex-col gap-1.5">
                                    <div className="text-[7px] font-mono font-bold text-txt3 uppercase text-center leading-none">{d.id}</div>
                                    <div className="flex-1 min-h-0 bg-surf border border-border/50 rounded-md overflow-hidden flex flex-col gap-[0.5px] p-[0.5px]">
                                       {sh.off ? (
                                          <div className="flex-1 flex items-center justify-center opacity-10">
                                            <div className="w-1 h-1 rounded-full bg-txt3" />
                                          </div>
                                       ) : (
                                          sh.s.map((v, i) => (
                                             <div 
                                                key={i} 
                                                className="flex-1 rounded-[1px]" 
                                                style={{ backgroundColor: v ? emp.hex : undefined }} 
                                             />
                                          ))
                                       )}
                                    </div>
                                    <div className={cn("text-[7px] font-mono font-bold text-center leading-none", h > 0 ? "text-accent" : "text-txt3 opacity-30")}>{h || '—'}</div>
                                 </div>
                              );
                           })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto no-scrollbar">
                   <table className="w-full min-w-[900px] border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="text-left py-4 font-display font-bold text-xs text-txt3 tracking-widest uppercase pb-6 border-b border-border">Agent</th>
                          {data.map(d => (
                            <th key={d.id} className="py-4 font-display font-bold text-xs text-txt3 tracking-widest uppercase pb-6 border-b border-border">
                                {d.id}<br/>
                                <span className="font-mono text-[9px] opacity-60 normal-case">{d.date}</span>
                            </th>
                          ))}
                          <th className="text-right py-4 font-display font-bold text-xs text-txt3 tracking-widest uppercase pb-6 border-b border-border">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {employees.map((emp, ei) => {
                          const weeklyTotal = data.reduce((acc, d) => acc + (d.shifts[ei].off ? 0 : d.shifts[ei].s.reduce((a, b) => a + (b || 0), 0)), 0);
                          return (
                            <tr key={emp.name} className="hover:bg-bg/40 transition-colors group">
                              <td className="py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-[10px] shadow-sm transform group-hover:scale-110 transition-transform" style={{ backgroundColor: emp.hex + '15', color: emp.hex, border: `1px solid ${emp.hex}30` }}>
                                    {emp.name.slice(0, 2)}
                                  </div>
                                  <span className="font-display font-bold text-sm tracking-tight">{emp.name}</span>
                                </div>
                              </td>
                              {data.map((d, di) => {
                                const sh = d.shifts[ei];
                                const h = sh.s.reduce((a, b) => a + (b || 0), 0);
                                return (
                                  <td key={di} className="text-center py-5 px-1">
                                    {sh.off ? (
                                      <span className="text-[10px] text-txt3 font-mono font-bold opacity-30">OFF</span>
                                    ) : (
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="text-sm font-mono font-black text-txt">{h || '-'}</span>
                                        <div className="grid grid-cols-11 gap-px w-[66px] h-3 bg-surf border border-border/40 rounded-[2px] p-[1px]">
                                          {sh.s.map((v, i) => (
                                             <div key={i} className="h-full rounded-[1px]" style={{ backgroundColor: v ? emp.hex : undefined }} />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                )
                              })}
                              <td className="text-right py-5 pr-1">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-accent font-mono font-black text-base shadow-inner">
                                  {weeklyTotal}h
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
                </div>

                {/* Legend */}
                <div className="mt-8 flex flex-wrap items-center gap-6 p-6 bg-card2/50 rounded-2xl border border-dashed border-border">
                  {employees.map(e => (
                    <div key={e.name} className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: e.hex }} />
                       <span className="text-[10px] font-display font-bold uppercase tracking-widest text-txt2">{e.name}</span>
                    </div>
                  ))}
                </div>
             </motion.div>
          )}

          {view === 'gantt' && (
             <motion.div 
               key="gantt"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="bg-card border border-border rounded-3xl p-6 shadow-lg"
             >
                <div className="flex items-center justify-between mb-8">
                   <h3 className="font-display font-black text-lg tracking-tight uppercase">Vue Gantt</h3>
                   <p className="text-xs text-txt3">Distribution temporelle des shifts</p>
                </div>
                
                <div className="overflow-x-auto no-scrollbar">
                  <div className="min-w-[1000px] border border-border rounded-2xl overflow-hidden shadow-inner">
                     {/* Gantt Header */}
                     <div className="grid grid-cols-[120px_repeat(7,1fr)_100px] bg-card2 border-b border-border">
                        <div className="p-4 text-[10px] font-display font-bold text-txt3 uppercase tracking-widest border-r border-border">Agent</div>
                        {data.map(d => (
                           <div key={d.id} className="p-4 text-center border-r border-border last:border-r-0">
                              <span className="block text-[10px] font-display font-bold uppercase text-txt3 opacity-60 leading-none">{d.id}</span>
                              <span className="text-xs font-mono font-black text-txt leading-none mt-1">{d.date}</span>
                           </div>
                        ))}
                        <div className="p-4 text-right text-[10px] font-display font-bold text-txt3 uppercase tracking-widest">Total</div>
                     </div>

                     {/* Gantt Body */}
                     <div className="divide-y divide-border/30">
                        {employees.map((emp, ei) => {
                           const weeklyTotal = data.reduce((acc, d) => acc + (d.shifts[ei].off ? 0 : d.shifts[ei].s.reduce((a, b: number) => a + (b || 0), 0)), 0);
                           return (
                              <div key={emp.name} className="grid grid-cols-[120px_repeat(7,1fr)_100px] hover:bg-bg/20 transition-colors">
                                 <div className="p-4 border-r border-border flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center font-display font-bold text-[10px]" style={{ color: emp.hex }}>{emp.name.slice(0, 2)}</div>
                                    <span className="font-display font-bold text-xs tracking-tight truncate">{emp.name}</span>
                                 </div>
                                 {data.map((d, di) => (
                                   <GanttCell 
                                     key={di} 
                                     di={di} 
                                     ei={ei} 
                                     emp={emp} 
                                     shift={d.shifts[ei]} 
                                     isEdit={isEdit} 
                                   />
                                 ))}
                                 <div className="p-4 text-right flex items-center justify-end">
                                    <span className="font-mono font-black text-xs text-accent">{weeklyTotal}h</span>
                                 </div>
                               </div>
                           );
                        })}
                     </div>
                  </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>


      </main>

      {/* --- Day Team Popup --- */}
      <AnimatePresence>
        {selectedDayPopup !== null && (
          <Modal title={`Équipe — ${data[selectedDayPopup].full}`} onClose={() => setSelectedDayPopup(null)}>
            <div className="p-4 lg:p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-txt3 uppercase tracking-widest">{data[selectedDayPopup].date}</span>
                <span className="text-sm font-display font-black text-accent">{data[selectedDayPopup].shifts.reduce((acc, sh) => acc + (sh.off ? 0 : sh.s.reduce((a, b) => a + b, 0)), 0)}h total</span>
              </div>
              <div className="space-y-3">
                {employees.map((emp, ei) => {
                  const shift = data[selectedDayPopup].shifts[ei];
                  const hours = shift.s.reduce((a, b) => a + (b || 0), 0);
                  return (
                    <div key={emp.name} className={cn("flex items-center gap-4 p-3 rounded-2xl border transition-all", shift.off ? "bg-bg/40 border-border/30 opacity-60" : "bg-card2 border-border/50 shadow-sm")}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-black text-[10px]" style={{ backgroundColor: emp.hex }}>
                        {emp.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-xs truncate">{emp.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {shift.off ? (
                            <span className="text-[8px] font-black uppercase text-txt3 tracking-widest">En repos</span>
                          ) : hours > 0 ? (
                            <div className="flex gap-0.5 h-2 w-full max-w-[100px]">
                              {shift.s.map((v, si) => (
                                <div key={si} className="flex-1 rounded-sm" style={{ backgroundColor: v ? emp.hex : 'rgba(0,0,0,0.05)' }} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[8px] font-bold text-txt3 opacity-40">Non planifié</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-black text-txt">{shift.off ? '—' : hours + 'h'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* --- Full Team Week Popup --- */}
      <AnimatePresence>
        {showTeamWeekPopup && (
          <Modal title="Planning Complet Équipe" onClose={() => setShowTeamWeekPopup(false)}>
            <div className="p-4 lg:p-6 overflow-x-auto no-scrollbar">
              <div className="min-w-[500px]">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="text-left text-[9px] font-black uppercase tracking-widest text-txt3 px-2 pb-2">Agent</th>
                      {data.map(d => (
                        <th key={d.id} className="text-center text-[9px] font-black uppercase tracking-widest text-txt3 pb-2">{d.id}</th>
                      ))}
                      <th className="text-right text-[9px] font-black uppercase tracking-widest text-txt3 px-2 pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, ei) => {
                      const weeklyTotal = data.reduce((acc, d) => acc + (d.shifts[ei].off ? 0 : d.shifts[ei].s.reduce((a, b) => a + (b || 0), 0)), 0);
                      return (
                        <tr key={emp.name} className="bg-bg/40">
                          <td className="px-2 py-3 rounded-l-xl border-y border-l border-border/50">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-display font-black text-[8px]" style={{ backgroundColor: emp.hex }}>
                                {emp.name.slice(0, 2)}
                              </div>
                              <span className="font-display font-bold text-[10px] truncate max-w-[80px]">{emp.name.split(' ')[0]}</span>
                            </div>
                          </td>
                          {data.map((d, di) => {
                            const sh = d.shifts[ei];
                            const h = sh.s.reduce((a, b) => a + (b || 0), 0);
                            return (
                              <td key={di} className="text-center py-3 border-y border-border/50">
                                <span className={cn("text-[10px] font-mono font-black", sh.off ? "text-txt3 opacity-20" : h > 0 ? "text-accent" : "text-txt3 opacity-40")}>
                                  {sh.off ? '—' : h || '·'}
                                </span>
                              </td>
                            )
                          })}
                          <td className="px-2 py-3 text-right rounded-r-xl border-y border-r border-border/50">
                            <span className="text-[10px] font-mono font-black text-txt bg-card px-2 py-1 rounded-lg border border-border/50">{weeklyTotal}h</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-8px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        .bg-repeating-lines {
          background-image: repeating-linear-gradient(45deg, var(--border2), var(--border2) 1px, transparent 1px, transparent 10px);
        }
      ` }} />

      {/* --- Pin Modal --- */}
      <AnimatePresence>
        {pinModal?.open && (
           <PinModal 
              role={pinModal.role} 
              onUnlock={handleUnlock} 
              onClose={() => setPinModal(null)} 
           />
        )}
      </AnimatePresence>

      {/* --- Employee Modal --- */}
      {empModal && (
        <Modal title="Gestion de l'Équipe" onClose={() => setEmpModal(false)}>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              {employees.map((emp, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-bg border border-border rounded-2xl group">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: emp.hex }} />
                  <span className="font-display font-bold flex-1">{emp.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveEmployee(i, -1)} className="p-1.5 hover:bg-card2 rounded-lg text-txt3"><ArrowUp size={14} /></button>
                    <button onClick={() => moveEmployee(i, 1)} className="p-1.5 hover:bg-card2 rounded-lg text-txt3"><ArrowDown size={14} /></button>
                    <button onClick={() => removeEmployee(i)} className="p-1.5 hover:bg-red-l text-red rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-border">
               <label className="text-[10px] text-txt3 uppercase font-black tracking-widest mb-2 block">Nouvel Agent</label>
               <div className="flex gap-2">
                 <input 
                   id="new-emp-name"
                   type="text" 
                   placeholder="NOM"
                   className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-sm font-display font-bold outline-none focus:border-accent transition-all"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       addEmployee((e.target as HTMLInputElement).value);
                       (e.target as HTMLInputElement).value = '';
                     }
                   }}
                 />
                 <button 
                   onClick={() => {
                     const input = document.getElementById('new-emp-name') as HTMLInputElement;
                     addEmployee(input.value);
                     input.value = '';
                   }}
                   className="bg-accent text-white px-6 rounded-xl font-display font-bold text-xs"
                 >
                   Ajouter
                 </button>
               </div>
            </div>
          </div>
        </Modal>
      )}

      {/* --- Settings Modal --- */}
      {settingsModal && (
        <Modal title="Paramètres & Sécurité" onClose={() => setSettingsModal(false)}>
          <div className="p-6 space-y-8">
            <section className="space-y-4">
              <h3 className="text-[10px] text-txt3 uppercase font-black tracking-widest flex items-center gap-2">
                <Lock size={12} />
                Sécurité
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-txt3 font-bold px-1">PIN Manager</label>
                  <input 
                    type="password" 
                    value={managerPinInput}
                    onChange={(e) => updatePin('manager', e.target.value)}
                    placeholder="••••" 
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-accent" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-txt3 font-bold px-1">PIN Employé</label>
                  <input 
                    type="password" 
                    value={employeePinInput}
                    onChange={(e) => updatePin('employee', e.target.value)}
                    placeholder="••••" 
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-green" 
                  />
                </div>
              </div>
            </section>

             <section className="space-y-4">
              <h3 className="text-[10px] text-txt3 uppercase font-black tracking-widest flex items-center gap-2">
                <Monitor size={12} />
                Apparence
              </h3>
              <div className="flex gap-2">
                {['light', 'dark', 'simple'].map((t) => (
                  <button 
                    key={t}
                    onClick={() => toggleTheme(t as any)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border font-display font-bold text-xs transition-all capitalize",
                      theme === t ? "bg-accent border-accent text-white" : "bg-bg border-border text-txt2 hover:border-txt3"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            <section className="pt-8 border-t border-border flex flex-col gap-3">
               <button className="flex items-center justify-center gap-2 w-full bg-card2 border border-border py-4 rounded-2xl font-display font-bold text-sm hover:bg-bg transition-all">
                  <FileJson size={18} />
                  Exporter en JSON
               </button>
               <button onClick={resetAll} className="flex items-center justify-center gap-2 w-full bg-red-l border border-red/20 py-4 rounded-2xl font-display font-bold text-sm text-red hover:bg-red/10 transition-all">
                  <Trash2 size={18} />
                  Réinitialiser l'application
               </button>
            </section>
          </div>
        </Modal>
      )}

      {/* --- QR Modal --- */}
      {qrModal && <Modal title="Partager" onClose={() => setQrModal(false)}>
        <div className="flex flex-col items-center gap-6 p-4">
          <div className="bg-white p-4 rounded-3xl border border-border shadow-inner">
            <QRCodeSVG value={JSON.stringify(data)} size={200} level="M" />
          </div>
          <p className="text-xs text-txt3 text-center leading-relaxed">
            Scannez ce code pour synchroniser ce planning sur un autre appareil.
          </p>
          <button className="flex items-center gap-2 w-full justify-center bg-accent text-white py-4 rounded-2xl font-display font-black text-sm hover:scale-[1.02] active:scale-95 transition-all">
            <Download size={18} />
            Télécharger l'image
          </button>
        </div>
      </Modal>}
      </div>
    );
  }

const weekLabel = (m: Date) => {
  const end = addDays(m, 6);
  const fmt = (d: Date) => format(d, 'dd/MM/yy');
  return `${fmt(m)} → ${fmt(end)}`;
};

// --- Sub-components ---

function PinModal({ role, onUnlock, onClose }: { role: AccessRole, onUnlock: (s: boolean) => void, onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const expectedPin = localStorage.getItem(role === 'manager' ? STORAGE_KEYS.PIN : STORAGE_KEYS.STAFF_PIN) || (role === 'manager' ? DEFAULT_PIN : DEFAULT_EMPLOYEE_PIN);

  const handleInput = (val: string) => {
    if (val.length > 4) return;
    setPin(val);
    setError(false);
    if (val.length === 4) {
      if (val === expectedPin) {
        onUnlock(true);
      } else {
        setError(true);
        setPin('');
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-overlay backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-2xl relative z-10 text-center",
          error ? "animate-shake" : ""
        )}
      >
        <div className="mb-6 relative inline-block">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/30">
            {role === 'manager' ? <Lock size={28} /> : <User size={28} />}
          </div>
        </div>
        <h2 className="text-xl font-display font-bold mb-1">Accès {role === 'manager' ? 'Manager' : 'Employé'}</h2>
        <p className="text-txt3 text-xs mb-8">Entrez votre code secret à 4 chiffres</p>

        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map(idx => (
            <div 
              key={idx} 
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-300",
                pin.length > idx ? "bg-accent border-accent scale-125 shadow-[0_0_12px_rgba(198,40,40,0.4)]" : "border-border2"
              )} 
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Cancel', 0, 'DEL'].map((k, i) => (
            <button 
              key={i}
              onClick={() => {
                if (k === 'DEL') setPin(pin.slice(0, -1));
                else if (k === 'Cancel') onClose();
                else handleInput(pin + k);
              }}
              className={cn(
                "h-14 rounded-2xl flex items-center justify-center font-display font-black text-lg transition-all active:scale-90",
                typeof k === 'number' ? "bg-bg border border-border hover:bg-card2" : "text-txt3 text-xs uppercase"
              )}
            >
              {k === 'DEL' ? <History size={20} /> : k}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-red text-xs font-bold uppercase tracking-wider">PIN Incorrect</p>}
      </motion.div>
    </motion.div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay/80 backdrop-blur-xl" onClick={onClose} />
      <motion.div 
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden flex flex-col"
      >
        <div className="flex-shrink-0 px-8 py-6 border-b border-border bg-surf flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 border border-border rounded-xl text-txt3 hover:text-accent transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar max-h-[70vh]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
