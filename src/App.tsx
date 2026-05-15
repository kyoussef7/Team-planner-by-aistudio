import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  LayoutDashboard,
  MoreVertical,
  MessageCircle,
  Image as ImageIcon,
  Send,
  RefreshCw,
  UserCircle,
  FileText,
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import {
  format,
  addDays,
  startOfWeek,
  subDays,
  isSameDay,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  getDoc,
  getDocFromServer,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth();

import { cn } from "./lib/utils";
import { ChatView } from "./ChatView";
import { Employee, Day, AppData, AccessRole, AppState } from "./types";
import {
  DEFAULT_EMP,
  SEED_DATA,
  DEFAULT_COLORS,
  MAX_FWD_WEEKS,
  IDLE_TIMEOUT,
} from "./constants";

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  DATA_PREFIX: "planning_data_",
  EMPLOYEES: "planning_emp_v1",
  MONDAY: "planning_monday_v1",
  THEME: "planning_theme_v1",
  PIN: "planning_pin_v1",
  STAFF_PIN: "planning_employee_pin_v1",
  CHANGELOG: "planning_changelog_v1",
};

const DEFAULT_PIN = "1234";
const DEFAULT_EMPLOYEE_PIN = "0000";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const DayRow = ({
  emp,
  ei,
  di,
  isEdit,
  toggleDayOff,
  toggleSlot,
  shift,
  loggedInEmployeeIdx,
}: any) => {
  const hours = shift.s.reduce((a: number, b: number) => a + (b || 0), 0);
  const isMe = loggedInEmployeeIdx === ei;

  return (
    <div
      className={cn(
        "flex items-center px-4 lg:px-10 py-2 lg:py-3 transition-all duration-200 border-b border-border/10 last:border-0 group relative",
        shift.off ? "bg-bg/5" : "hover:bg-accent/[0.02]",
      )}
    >
      <div className="flex items-center gap-3 lg:gap-6 w-[85px] lg:w-[220px] shrink-0 pr-4">
        <motion.div
          whileTap={isEdit ? { scale: 0.9 } : {}}
          className={cn(
            "w-7 h-7 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex-shrink-0 flex items-center justify-center font-display font-black text-[10px] lg:text-lg transition-all shadow-sm",
            shift.off ? "opacity-20 grayscale" : "shadow-accent/10",
          )}
          style={
            !shift.off
              ? { backgroundColor: isMe ? "var(--me)" : "var(--accent)", color: "white" }
              : { backgroundColor: "var(--card2)", color: "var(--txt3)" }
          }
          onClick={() => isEdit && toggleDayOff(di, ei)}
        >
          {emp.name.slice(0, 1).toUpperCase()}
        </motion.div>
        <div className="truncate min-w-0 flex-1 hidden sm:block">
          <p
            className={cn(
              "font-display font-black text-[10px] lg:text-base tracking-tighter truncate uppercase leading-tight transition-colors",
              shift.off ? "text-txt3 opacity-40" : isMe ? "text-me" : "text-txt opacity-70",
            )}
            onClick={() => isEdit && toggleDayOff(di, ei)}
          >
            {emp.name}
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-1 lg:gap-2 h-6 lg:h-9 relative">
        {shift.off ? (
          <div
            onClick={() => isEdit && toggleDayOff(di, ei)}
            className="col-span-12 bg-card2/30 backdrop-blur-sm rounded-md lg:rounded-lg flex items-center justify-center border border-dashed border-border/40 cursor-pointer group-hover:border-accent/40 transition-all"
          >
            <span className="font-display text-[7px] lg:text-[9px] tracking-[0.4em] text-txt3 uppercase font-black opacity-20 group-hover:opacity-50 transition-opacity">
              Repos
            </span>
          </div>
        ) : (
          shift.s.map((v: number, si: number) => (
            <motion.div
              key={si}
              whileTap={isEdit ? { scale: 0.95 } : {}}
              onClick={() => isEdit && toggleSlot(di, ei, si)}
              className={cn(
                "h-full rounded-[2px] lg:rounded-[4px] border transition-all duration-300",
                isEdit ? "cursor-pointer" : "cursor-default",
                v ? "border-white/10 shadow-sm" : "bg-surf/40 border-border/20",
              )}
              style={{
                backgroundColor: v ? (isMe ? "var(--me)" : "var(--accent)") : undefined,
                opacity: v ? 1 : 0.3,
              }}
            />
          ))
        )}
      </div>

      <div className="w-12 lg:w-28 shrink-0 text-right pl-4">
        <span
          className={cn(
            "text-sm lg:text-2xl font-display font-black tracking-tighter leading-none",
            shift.off ? "text-txt3 opacity-20" : isMe ? "text-me" : "text-accent",
          )}
        >
          {shift.off ? "—" : `${hours}h`}
        </span>
      </div>
    </div>
  );
};

const GanttCell = ({ di, ei, emp, shift, loggedInEmployeeIdx }: any) => {
  const isMe = loggedInEmployeeIdx === ei;
  const blocks = useMemo(() => {
    const res = [];
    let cur = null;
    for (let i = 0; i < shift.s.length; i++) {
      if (shift.s[i]) {
        if (!cur) cur = { start: i, end: i };
        else cur.end = i;
      } else {
        if (cur) {
          res.push(cur);
          cur = null;
        }
      }
    }
    if (cur) res.push(cur);
    return res;
  }, [shift.s]);

  return (
    <div
      key={di}
      className={cn(
        "relative h-14 border-r border-border flex items-center px-1 transition-colors",
      )}
    >
      {shift.off ? (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold opacity-10 bg-repeating-lines">
          OFF
        </span>
      ) : (
        blocks.map((b, bi) => (
          <div
            key={bi}
            className="absolute h-8 rounded-lg shadow-sm shadow-black/10 border border-white/10"
            style={{
              left: `${(b.start / 12) * 100}%`,
              width: `${((b.end - b.start + 1) / 12) * 100}%`,
              backgroundColor: isMe ? "var(--me)" : "var(--accent)",
              zIndex: 10,
            }}
            title={`${b.start + 10}h - ${b.end + 12}h`}
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

  const [view, setView] = useState<
    "dashboard" | "day" | "week" | "gantt" | "chat" | "settings"
  >("day");
  const [theme, setTheme] = useState<"light" | "dark" | "simple">("light");
  
  const [lastSeenChat, setLastSeenChat] = useState(() => Number(localStorage.getItem('lastSeenChat')) || Date.now());
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  const [undoStack, setUndoStack] = useState<AppData[]>([]);
  const [redoStack, setRedoStack] = useState<AppData[]>([]);

  const [pinModal, setPinModal] = useState<{
    open: boolean;
    role: AccessRole;
  } | null>(null);
  const [empModal, setEmpModal] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    layout: "weekly",
    dateRange: "current",
    selectedEmployees: [] as string[], // empty for all
  });
  const [changelogModal, setChangelogModal] = useState(false);

  const [employeeIdx, setEmployeeIdx] = useState<number | null>(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const [idleTime, setIdleTime] = useState(0);

  const [selectedDayPopup, setSelectedDayPopup] = useState<number | null>(null);
  const [showTeamWeekPopup, setShowTeamWeekPopup] = useState(false);

  const realMonday = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    [],
  );
  const maxMonday = useMemo(
    () => addDays(realMonday, MAX_FWD_WEEKS * 7),
    [realMonday],
  );

  // --- Auto-lock ---
  useEffect(() => {
    if (!isEdit) return;
    const timer = setInterval(() => {
      setIdleTime((prev) => prev + 1000);
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
    if (view === "chat") {
      const now = Date.now();
      setLastSeenChat(now);
      localStorage.setItem("lastSeenChat", now.toString());
      setHasUnreadChat(false);
    }
  }, [view]);

  useEffect(() => {
    if (view === "chat" || !db) return;
    const q = query(collection(db, "chat", "general", "messages"), orderBy("timestamp", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const msg = snap.docs[0].data();
        if (msg.timestamp) {
          const msgTime = msg.timestamp.toMillis ? msg.timestamp.toMillis() : Date.now();
          if (msgTime > lastSeenChat) {
            setHasUnreadChat(true);
          }
        }
      }
    });
    return () => unsub();
  }, [db, view, lastSeenChat]);

  useEffect(() => {
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
    };
  }, [resetIdle]);

  // (Internal component implementation continued inside render)

  // --- Static Initial Load ---
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as any;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
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
        if (u.email === "khalidyoussef7@gmail.com") {
          setRole("manager");
          setIsEdit(true);
        } else {
          setRole(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const weekId = format(monday, "yyyy-MM-dd");

  useEffect(() => {
    if (authLoading) return;
    const path = `plannings/${weekId}`;
    const unsubscribe = onSnapshot(
      doc(db, path),
      (docSnap) => {
        if (docSnap.exists()) {
          const remote = docSnap.data();
          const emps = remote.employees || [...DEFAULT_EMP];
          const dayData = remote.data;

          // Normalize dayData array lengths
          dayData.forEach((d: any) => {
            d.shifts.forEach((shift: any) => {
              if (!shift.s) shift.s = new Array(12).fill(0);
              while (shift.s.length < 12) shift.s.push(0);
              if (shift.s.length > 12) shift.s.splice(12);
            });
          });

          setData(dayData);
          if (remote.employees) setEmployees(remote.employees);
        } else {
          const savedEmp = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
          const emps = savedEmp ? JSON.parse(savedEmp) : [...DEFAULT_EMP];
          setEmployees(emps);
          setData(getBlankWeek(monday, emps));
        }
      },
      (err) => {
        console.error("Firestore Error:", err);
      },
    );
    return () => unsubscribe();
  }, [weekId, authLoading, monday]);

  // --- Seed Data for Testing ---
  useEffect(() => {
    if (authLoading || role !== "manager" || !user) return;

    const checkAndSeed = async () => {
      try {
        const weeksToSeed = [realMonday, subDays(realMonday, 7)];

        for (const m of weeksToSeed) {
          const wId = format(m, "yyyy-MM-dd");
          const docRef = doc(db, `plannings/${wId}`);
          const snap = await getDoc(docRef);

          if (!snap.exists()) {
            const emps = employees.length > 0 ? employees : [...DEFAULT_EMP];
            const testData = getBlankWeek(m, emps).map((day, di) => {
              const seedDay = SEED_DATA[di];
              return {
                ...day,
                shifts: emps.map((_, ei) => {
                  if (seedDay && seedDay.shifts[ei])
                    return JSON.parse(JSON.stringify(seedDay.shifts[ei]));
                  // Fallback for extra employees or missing seed data
                  const isOff = (di + ei) % 5 === 0;
                  return {
                    off: isOff,
                    s: new Array(12)
                      .fill(0)
                      .map((_, si) => (!isOff && si >= 3 && si < 8 ? 1 : 0)),
                  };
                }),
              };
            });

            await setDoc(docRef, {
              monday: m.toISOString(),
              data: testData,
              employees: emps,
              updatedAt: serverTimestamp(),
            });
            console.log(`Successfully seeded test data for ${wId}`);
          }
        }
      } catch (err) {
        console.error("Error seeding test data:", err);
      }
    };

    checkAndSeed();
  }, [authLoading, role, user, employees, realMonday]);

  const getBlankWeek = (m: Date, emps: Employee[]): AppData => {
    const dayNames = [
      { id: "lun", full: "LUNDI" },
      { id: "mar", full: "MARDI" },
      { id: "mer", full: "MERCREDI" },
      { id: "jeu", full: "JEUDI" },
      { id: "ven", full: "VENDREDI" },
      { id: "sam", full: "SAMEDI" },
      { id: "dim", full: "DIMANCHE" },
    ];
    return dayNames.map((d, i) => ({
      ...d,
      date: format(addDays(m, i), "dd/MM"),
      shifts: emps.map((emp, ei) => {
        const hash = i * 7 + ei * 3;
        const isOff = hash % 7 < 2;
        const start = hash % 5;
        const length = 5 + (hash % 4);
        return {
          off: isOff,
          s: new Array(12)
            .fill(0)
            .map((_, si) =>
              !isOff && si >= start && si < start + length ? 1 : 0,
            ),
        };
      }),
    }));
  };

  const syncEmployeesInDayData = (dayData: AppData, emps: Employee[]) => {
    dayData.forEach((d) => {
      while (d.shifts.length < emps.length) {
        d.shifts.push({ off: false, s: new Array(12).fill(0) });
      }
      if (d.shifts.length > emps.length) {
        d.shifts.splice(emps.length);
      }
      d.shifts.forEach((shift) => {
        if (!shift.s) shift.s = new Array(12).fill(0);
        while (shift.s.length < 12) shift.s.push(0);
        if (shift.s.length > 12) shift.s.splice(12);
      });
    });
  };

  const saveData = async (newData: AppData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEYS.MONDAY, monday.toISOString());
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    if (role !== "manager" || !user) return;

    const path = `plannings/${weekId}`;
    try {
      await setDoc(doc(db, path), {
        monday: monday.toISOString(),
        data: newData,
        employees: employees,
        updatedAt: serverTimestamp(),
      });
      setShowSavedBadge(true);
      setTimeout(() => setShowSavedBadge(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const pushState = () => {
    setUndoStack((prev) => [
      ...prev.slice(-49),
      JSON.parse(JSON.stringify(data)),
    ]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((prevRedo) => [...prevRedo, JSON.parse(JSON.stringify(data))]);
    setUndoStack((prevUndo) => prevUndo.slice(0, -1));
    setData(prev);
    saveData(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prevUndo) => [...prevUndo, JSON.parse(JSON.stringify(data))]);
    setRedoStack((prevRedo) => prevRedo.slice(0, -1));
    setData(next);
    saveData(next);
  };

  // --- UI Handlers ---
  const toggleTheme = (t: "light" | "dark" | "simple") => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEYS.THEME, t);
    document.documentElement.setAttribute("data-theme", t);
  };

  const handleRoleSelect = (selectedRole: AccessRole) => {
    if (selectedRole === "manager") {
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider).catch((err) => {
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
        if (e.key === "z") {
          e.preventDefault();
          handleUndo();
        } else if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data, undoStack, redoStack]); // Re-bind on state change to ensure fresh values

  const handleDaySelect = (idx: number) => {
    setActiveDay(idx);
    if (view !== "day") setView("day");
  };

  const renderManagerDashboard = () => {
    const today = new Date();
    const todayIdx = data.findIndex((_, i) =>
      isSameDay(addDays(monday, i), today),
    );
    const todayData = todayIdx !== -1 ? data[todayIdx] : null;
    const activeStaffCount = todayData
      ? todayData.shifts.filter((s) => !s.off && s.s.some((v) => v)).length
      : 0;

    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-32"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-display font-black tracking-tighter text-txt uppercase leading-none">
              Console Manager
            </h2>
            <p className="text-txt3 text-sm font-medium mt-1">Gérez votre équipe en temps réel</p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-2xl text-accent"
          >
            <Shield size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Premium Access</span>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Aujourd'hui", val: activeStaffCount, sub: "Staff Présent", icon: Users, color: "text-accent", bg: "bg-accent/10" },
            { label: "Total Planning", val: `${grandTotal}h`, sub: "Heures Semaine", icon: Calendar, color: "text-green", bg: "bg-green/10" },
            { label: "Repos", val: offDays, sub: "Repos Actifs", icon: Moon, color: "text-amber", bg: "bg-amber/10" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="bg-card border border-border p-8 rounded-[3rem] shadow-sm relative overflow-hidden group transition-all"
            >
              <div className={cn("absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl opacity-20", stat.bg)} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-txt3 mb-6">{stat.label}</p>
              <div className="flex items-center gap-5">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
                  <stat.icon size={28} />
                </div>
                <div>
                  <p className="text-3xl font-display font-black text-txt leading-none">{stat.val}</p>
                  <p className="text-[10px] text-txt3 uppercase font-bold mt-1">{stat.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-[3rem] p-8 shadow-sm">
            <h3 className="font-display font-black text-xs uppercase mb-8 tracking-[0.2em] flex items-center gap-2 underline decoration-accent/30 decoration-4 underline-offset-4">
              <Clock size={16} className="text-accent" />
              État de présence
            </h3>
            <div className="space-y-3">
              {todayData ? (
                employees.map((e, ei) => {
                  const sh = todayData.shifts[ei];
                  const isActive = !sh.off && sh.s.some((v) => v);
                  return (
                    <div key={ei} className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                      isActive ? "bg-bg border-border" : "opacity-20 grayscale"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-black text-lg shadow-sm" style={{ backgroundColor: ei === employeeIdx ? "var(--me)" : "var(--accent)" }}>
                          {e.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className={cn(
                            "font-display font-black text-sm uppercase leading-tight",
                            ei === employeeIdx ? "text-accent" : "text-txt opacity-70"
                          )}>
                            {e.name}
                          </p>
                          <p className="text-[9px] text-txt3 font-mono font-bold">{isActive ? "En poste" : "Absent"}</p>
                        </div>
                      </div>
                      {isActive && <div className="w-2.5 h-2.5 rounded-full bg-green animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]" />}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 opacity-30">
                  <Monitor size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Aucune donnée</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-card border border-border rounded-[3rem] p-8 shadow-sm">
            <h3 className="font-display font-black text-xs uppercase mb-8 tracking-[0.2em] flex items-center gap-2 underline decoration-green/30 decoration-4 underline-offset-4">
              <LayoutDashboard size={16} className="text-green" />
              Contrôle Rapide
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "day", t: "Modifier Jour", s: "Focus quotidien", icon: Clock },
                { id: "week", t: "Vue Semaine", s: "Grille globale", icon: Calendar },
                { id: "emp", t: "Équipe", s: "Rôles & Staff", icon: Users, modal: true },
                { id: "qr", t: "Exporter", s: "PDF & QR Code", icon: QrCode, modal: true }
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => btn.modal ? (btn.id === 'emp' ? setEmpModal(true) : setQrModal(true)) : setView(btn.id as any)}
                  className="p-6 bg-bg border border-border rounded-[2rem] hover:border-accent hover:shadow-xl hover:shadow-accent/5 transition-all text-left flex flex-col justify-between group h-32 active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-txt3 group-hover:text-accent group-hover:border-accent transition-colors">
                    <btn.icon size={20} />
                  </div>
                  <div>
                    <p className="font-display font-black text-sm uppercase leading-none">{btn.t}</p>
                    <p className="text-[9px] text-txt3 font-bold mt-1 opacity-60">{btn.s}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };
  const [managerPinInput, setManagerPinInput] = useState(
    localStorage.getItem(STORAGE_KEYS.PIN) || DEFAULT_PIN,
  );
  const [employeePinInput, setEmployeePinInput] = useState(
    localStorage.getItem(STORAGE_KEYS.STAFF_PIN) || DEFAULT_EMPLOYEE_PIN,
  );

  const updatePin = (pinRole: "manager" | "employee", val: string) => {
    if (val.length > 4) return;
    if (pinRole === "manager") {
      setManagerPinInput(val);
      if (val.length === 4) localStorage.setItem(STORAGE_KEYS.PIN, val);
    } else {
      setEmployeePinInput(val);
      if (val.length === 4) localStorage.setItem(STORAGE_KEYS.STAFF_PIN, val);
    }
  };
  const handleUnlock = (success: boolean) => {
    if (success) {
      if (pinModal?.role === "manager") {
        setIsEdit(true);
        setRole("manager");
        setView("dashboard");
      } else {
        setEmployeeIdx(null); // Clear previous selection
        setRole("employee");
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
    const newData = JSON.parse(JSON.stringify(data));
    newData[di].shifts[ei].s[si] = newData[di].shifts[ei].s[si] === 1 ? 0 : 1;
    saveData(newData);
  };

  const toggleDayOff = (di: number, ei: number) => {
    if (!isEdit) return;
    pushState();
    const newData = JSON.parse(JSON.stringify(data));
    const sh = newData[di].shifts[ei];
    sh.off = !sh.off;
    if (sh.off) sh.s = new Array(12).fill(0);
    saveData(newData);
  };

  const addEmployee = (name: string) => {
    const n = name.trim().toUpperCase();
    if (!n || employees.some((e) => e.name === n)) return;
    const newEmp = {
      name: n,
      hex: DEFAULT_COLORS[employees.length % DEFAULT_COLORS.length],
    };
    const newEmps = [...employees, newEmp];
    setEmployees(newEmps);
    const newData = [...data];
    syncEmployeesInDayData(newData, newEmps);
    saveData(newData);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(newEmps));
  };

  const removeEmployee = (idx: number) => {
    if (!window.confirm("Supprimer cet employé ?")) return;
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
    const newData = data.map((d) => {
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
    const prevWeekId = format(prevMon, "yyyy-MM-dd");
    const prevPath = `plannings/${prevWeekId}`;
    try {
      const docSnap = await getDoc(doc(db, prevPath));
      if (!docSnap.exists())
        return alert("Aucune donnée pour la semaine précédente");
      if (!window.confirm("Copier toute la semaine précédente ?")) return;

      pushState();
      const remote = docSnap.data();
      const newData = data.map((d, i) => {
        if (remote.data[i]) {
          return {
            ...d,
            shifts: JSON.parse(JSON.stringify(remote.data[i].shifts)),
          };
        }
        return d;
      });
      saveData(newData);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, prevPath);
    }
  };

  const resetAll = () => {
    if (!window.confirm("Réinitialiser toutes les données ?")) return;
    localStorage.clear();
    setRole(null);
    setIsEdit(false);
  };

  // --- Calculations ---
  const grandTotal = useMemo(() => {
    return data.reduce(
      (acc, d) =>
        acc +
        d.shifts.reduce(
          (a, sh) => a + (sh.off ? 0 : sh.s.reduce((x, y) => x + y, 0)),
          0,
        ),
      0,
    );
  }, [data]);

  const avgPerDay = Math.round(grandTotal / 7);

  const offDays = useMemo(() => {
    return data.reduce(
      (acc, d) => acc + d.shifts.filter((sh) => sh.off).length,
      0,
    );
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
        
        {/* Dynamic background shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green/5 rounded-full blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card/70 backdrop-blur-xl border border-white/20 rounded-[3rem] p-10 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] text-center relative z-10"
        >
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-[-10px] rounded-full border border-accent/20 animate-spin-slow" />
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent relative">
              <Lock size={36} />
            </div>
          </div>

          <h1 className="text-3xl font-display font-black mb-2 uppercase tracking-tight">
            Planning<br/>Central
          </h1>
          <p className="text-txt3 text-sm mb-10 font-medium">
            Portail de gestion d'équipe
          </p>

          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.15,
                },
              },
            }}
            initial="hidden"
            animate="show"
          >
            <motion.button
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRoleSelect("manager")}
              className="flex flex-col items-center gap-4 p-6 bg-surf border border-border rounded-3xl hover:border-accent hover:shadow-[0_10px_30px_-10px_rgba(230,57,70,0.3)] transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
                <Shield size={24} />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-display font-black text-sm uppercase">Manager</span>
                <span className="text-[8px] text-txt3 font-bold uppercase tracking-widest opacity-60">
                  Accès Total
                </span>
              </div>
            </motion.button>

            <motion.button
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRoleSelect("employee")}
              className="flex flex-col items-center gap-4 p-6 bg-surf border border-border rounded-3xl hover:border-green hover:shadow-[0_10px_30px_-10px_rgba(34,197,94,0.3)] transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center text-green group-hover:bg-green group-hover:text-white transition-all duration-300">
                <User size={24} />
              </div>
              <div className="flex flex-col items-center">
                <span className="font-display font-black text-sm uppercase">Employé</span>
                <span className="text-[8px] text-txt3 font-bold uppercase tracking-widest opacity-60">
                  Vue Perso
                </span>
              </div>
            </motion.button>
          </motion.div>

          {/* Theme Switcher in Splash */}
          <div className="mt-12 flex flex-col items-center gap-4 border-t border-border/50 pt-8">
            <span className="text-[10px] text-txt3 uppercase tracking-[0.2em] font-black">
              Thème
            </span>
            <div className="flex gap-6">
              {[
                { id: "light", icon: Sun, label: "Clair" },
                { id: "dark", icon: Moon, label: "Sombre" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTheme(t.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 transition-all duration-300",
                    theme === t.id ? "text-accent" : "text-txt3 hover:text-txt"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl border transition-all",
                    theme === t.id ? "bg-accent/5 border-accent shadow-[0_0_15px_rgba(230,57,70,0.1)]" : "border-transparent bg-transparent"
                  )}>
                    <t.icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Handle Employee Identity Selection
  if (role === "employee" && employeeIdx === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg p-4 relative">
        <div className="noise-texture" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center z-10"
        >
          <button
            onClick={() => setRole(null)}
            className="absolute top-6 left-6 p-2 hover:bg-card2 rounded-lg text-txt3"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="mb-6 relative inline-block">
            <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center text-green">
              <User size={32} />
            </div>
          </div>
          <h2 className="text-xl font-display font-bold mb-1">
            Qui êtes-vous ?
          </h2>
          <p className="text-txt3 text-xs mb-8">
            Sélectionnez votre nom pour accéder à votre espace
          </p>

          <div className="space-y-3">
            {employees.map((e, idx) => (
              <button
                key={idx}
                onClick={() => setEmployeeIdx(idx)}
                className="w-full flex items-center gap-4 p-4 bg-bg border border-border2 rounded-2xl hover:border-green hover:bg-green/5 transition-all text-left group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-xs shadow-sm group-hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: e.hex + "20",
                    color: e.hex,
                    border: `1px solid ${e.hex}40`,
                  }}
                >
                  {e.name.slice(0, 2)}
                </div>
                <span className="font-display font-bold text-sm flex-1">
                  {e.name}
                </span>
                <ChevronRight
                  size={16}
                  className="text-txt3 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Define Personal View for Employees
  const renderPersonalView = () => {
    if (employeeIdx === null) return null;
    const emp = employees[employeeIdx];
    const weeklyTotal = data.reduce(
      (acc, d) =>
        acc +
        (d.shifts[employeeIdx].off
          ? 0
          : d.shifts[employeeIdx].s.reduce((a, b: number) => a + (b || 0), 0)),
      0,
    );

    // Find next shift
    const today = new Date();
    const todayIdx = data.findIndex((_, i) =>
      isSameDay(addDays(monday, i), today),
    );
    const todayData = todayIdx !== -1 ? data[todayIdx] : null;

    let nextShiftInfo = "Aucun shift prévu";
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(monday, i);
      if (dayDate >= today || isSameDay(dayDate, today)) {
        const sh = data[i].shifts[employeeIdx];
        if (!sh.off && sh.s.some((v) => v)) {
          const startHour = sh.s.findIndex((v) => v) + 10;
          nextShiftInfo = `${data[i].full} à ${startHour}h`;
          break;
        }
      }
    }

    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-24"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-black tracking-tighter text-txt uppercase leading-none">
              Mon Espace
            </h2>
            <p className="text-txt3 text-xs font-medium mt-1">
              Bonjour <span className="text-accent">{emp.name}</span>, voici ton planning
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-12 h-12 lg:w-16 lg:h-16 rounded-[1.25rem] lg:rounded-2xl shadow-xl shadow-accent/20 flex items-center justify-center text-white font-display font-black text-xl lg:text-3xl"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {emp.name.slice(0, 1)}
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
          <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-txt3">Prochain Shift</span>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <Clock size={24} />
              </div>
              <div>
                <span className="font-display font-black text-lg lg:text-2xl text-txt uppercase block">{nextShiftInfo}</span>
                <span className="text-[9px] font-bold text-txt3 uppercase tracking-widest leading-none">Perspective Hebdomadaire</span>
              </div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-green/5 rounded-full blur-2xl group-hover:bg-green/10 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-txt3">Total Semaine</span>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center text-green">
                <Calendar size={24} />
              </div>
              <div>
                <span className="font-display font-black text-2xl lg:text-3xl text-txt block">{weeklyTotal}h</span>
                <span className="text-[9px] font-bold text-txt3 uppercase tracking-widest leading-none">Total validé</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="font-display font-black text-xs uppercase mb-8 tracking-[0.2em] flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              Tes Horaires
            </h3>
            <div className="space-y-4">
              {data.map((d, i) => {
                const shift = d.shifts[employeeIdx!];
                const active = !shift.off && shift.s.some(v => v);
                return (
                  <div key={i} className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all hover:border-accent/30 group",
                    active ? "bg-bg border-border" : "opacity-30 border-dashed"
                  )}>
                    <div className="flex flex-col">
                      <span className="font-display font-black text-sm uppercase group-hover:text-accent transition-colors">{d.full}</span>
                      <span className="text-[10px] text-txt3 font-bold">{d.date}</span>
                    </div>
                    {active ? (
                      <div className="text-right">
                        <span className="text-base font-display font-black text-accent">{shift.s.reduce((a: number,b: number)=>a+b,0)}h</span>
                        <p className="text-[9px] text-txt3 font-mono font-bold">Début à {shift.s.findIndex(v=>v)+10}h</p>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-txt3">Repos</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="font-display font-black text-xs uppercase mb-8 tracking-[0.2em] flex items-center gap-2">
              <Users size={16} className="text-green" />
              Sur place aujourd'hui
            </h3>
            <div className="space-y-3">
              {todayData ? (
                employees.map((e, ei) => {
                  if (ei === employeeIdx) return null;
                  const sh = todayData.shifts[ei];
                  if (!sh.off && sh.s.some((v) => v)) {
                    return (
                      <div key={ei} className="flex items-center justify-between p-4 bg-bg rounded-2xl border border-border/50 group hover:border-accent/40 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-display font-black text-lg shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: "var(--accent)" }}>
                            {e.name.slice(0, 1)}
                          </div>
                          <div>
                            <p className="font-display font-black text-sm uppercase text-txt opacity-70">{e.name}</p>
                            <p className="text-[9px] text-txt3 font-mono font-bold">Actuellement en poste</p>
                          </div>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                      </div>
                    );
                  }
                  return null;
                })
              ) : (
                <div className="text-center py-12 opacity-30">
                  <Monitor size={48} className="mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Aucune donnée</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        
        <motion.div variants={itemVariants} className="flex gap-4">
          <button
            onClick={() => setShowTeamWeekPopup(true)}
            className="flex-1 bg-accent/10 border border-accent/20 text-accent py-4 rounded-xl font-display font-black text-[10px] uppercase tracking-widest hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={14} />
            Planning Complet Équipe
          </button>
          <button
            onClick={logout}
            className="flex-1 bg-card border border-border py-4 rounded-xl font-display font-black text-[10px] uppercase tracking-widest text-red hover:bg-red hover:text-white transition-all shadow-sm"
          >
            DÉCONNEXION
          </button>
        </motion.div>
      </motion.div>
    );
  };


  const renderSettingsView = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-32"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-display font-black tracking-tighter text-txt uppercase leading-none">
            Paramètres
          </h2>
          <p className="text-txt3 text-sm font-medium mt-1">Personnalisez votre expérience</p>
        </div>
      </div>

      <div className="space-y-8">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.1 } },
          }}
          className="space-y-8"
        >
          {/* Actions Rapides */}
          <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="space-y-4">
            <h3 className="text-xs text-txt3 uppercase font-black tracking-widest px-1">Actions Rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="flex items-center gap-4 bg-card border border-border p-5 rounded-2xl hover:border-accent hover:bg-accent/5 transition-all group text-left">
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-txt3 group-hover:text-accent group-hover:border-accent transition-colors shadow-sm">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">Changement de ligne</p>
                  <p className="text-[10px] text-txt3 font-bold uppercase tracking-widest opacity-60">Synchronisation</p>
                </div>
              </button>
              <button
                onClick={() => { setPinModal({ open: true, role: "employee" }); }}
                className="flex items-center gap-4 bg-card border border-border p-5 rounded-xl hover:border-accent hover:bg-accent/5 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-txt3 group-hover:text-accent group-hover:border-accent transition-colors shadow-sm">
                  <UserCircle size={24} />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">Changer de Profil</p>
                  <p className="text-[10px] text-txt3 font-bold uppercase tracking-widest opacity-60">Session Employé</p>
                </div>
              </button>
              {isEdit && (
                <>
                  <button
                    onClick={() => { setEmpModal(true); }}
                    className="flex items-center gap-4 bg-card border border-border p-5 rounded-xl hover:border-accent hover:bg-accent/5 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-txt3 group-hover:text-accent group-hover:border-accent transition-colors shadow-sm">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm">Gérer l'Équipe</p>
                      <p className="text-[10px] text-txt3 font-bold uppercase tracking-widest opacity-60">Rôles & Staff</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { copyPrevWeek(); }}
                    className="flex items-center gap-4 bg-card border border-border p-5 rounded-xl hover:border-accent hover:bg-accent/5 transition-all group text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-txt3 group-hover:text-accent group-hover:border-accent transition-colors shadow-sm">
                      <Copy size={24} />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm">Initialiser Semaine</p>
                      <p className="text-[10px] text-txt3 font-bold uppercase tracking-widest opacity-60">Depuis Semaine -1</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </motion.section>

          {/* Apparence */}
          <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="space-y-4">
            <h3 className="text-xs text-txt3 uppercase font-black tracking-widest px-1 flex items-center gap-2"><Monitor size={14}/> Apparence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["light", "dark", "simple"].map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTheme(t as any)}
                  className={cn(
                    "py-5 rounded-xl border font-display font-black text-xs transition-all uppercase tracking-widest",
                    theme === t ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" : "bg-card border-border text-txt2 hover:border-txt3"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.section>

          {/* Export & Partage */}
          <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="space-y-4">
            <h3 className="text-xs text-txt3 uppercase font-black tracking-widest px-1 flex items-center gap-2"><FileText size={14}/> Export & Partage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => { setQrModal(true); }} className="flex items-center gap-4 bg-card border border-border p-5 rounded-xl hover:bg-bg transition-all hover:border-accent group">
                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all"><QrCode size={24} /></div>
                <div className="text-left"><p className="font-display font-bold text-sm">Partager & Sync</p><p className="text-[10px] text-txt3 font-bold uppercase tracking-widest opacity-60">QR Code</p></div>
              </button>
              <button onClick={() => { setQrModal(true); }} className="flex items-center gap-4 bg-card border border-border p-5 rounded-xl hover:bg-bg transition-all hover:border-blue-500 group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all"><FileText size={24} /></div>
                <div className="text-left"><p className="font-display font-bold text-sm">Export PDF</p><p className="text-[10px] text-txt3 font-bold uppercase tracking-widest opacity-60">Téléchargement</p></div>
              </button>
            </div>
          </motion.section>

          {/* Sécurité Manager */}
          {isEdit && (
            <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="space-y-4 pt-8 border-t border-border">
              <h3 className="text-xs text-txt3 uppercase font-black tracking-widest px-1 flex items-center gap-2"><Lock size={14}/> Sécurité & Danger Zone</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-txt3 font-black uppercase tracking-widest px-1">PIN Manager</label>
                  <input type="password" value={managerPinInput} onChange={(e) => updatePin("manager", e.target.value)} placeholder="••••" className="w-full bg-card border border-border rounded-xl px-5 py-4 text-sm font-mono outline-none focus:border-accent shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-txt3 font-black uppercase tracking-widest px-1">PIN Employé</label>
                  <input type="password" value={employeePinInput} onChange={(e) => updatePin("employee", e.target.value)} placeholder="••••" className="w-full bg-card border border-border rounded-xl px-5 py-4 text-sm font-mono outline-none focus:border-green shadow-sm" />
                </div>
              </div>
              <button onClick={resetAll} className="flex items-center justify-center gap-3 w-full bg-red-l border border-red/20 py-5 rounded-xl font-display font-black text-sm uppercase tracking-widest text-red hover:bg-red hover:text-white transition-all shadow-sm">
                <Trash2 size={20} />
                Réinitialiser l'application
              </button>
            </motion.section>
          )}
        </motion.div>
      </div>
    </motion.div>
  );

  const renderBottomNav = () => (
    <nav
      className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] bg-surf/70 backdrop-blur-2xl border border-border/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex justify-around px-2 pt-1 pb-0.5 lg:pt-1.5 lg:pb-0.5 z-[70]"
    >
      {[
        { id: "dashboard", label: "Home", icon: LayoutDashboard },
        { id: "day", label: "Day", icon: Clock },
        { id: "week", label: "Week", icon: Calendar },
        {id: "chat", label: "Staff", icon: MessageCircle, hasBadge: hasUnreadChat},
        {id: "settings", label: "Settings", icon: Settings},
      ].map((item: any) => {
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id as any);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-500 relative group active:scale-90",
              isActive 
                ? "text-accent" 
                : "text-txt3 hover:text-accent"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="nav-glow"
                className="absolute inset-0 bg-accent/10 rounded-lg -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon size={isActive ? 24 : 22} className={cn("transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300",
              isActive ? "opacity-100 translate-y-0" : "opacity-40"
            )}>
              {item.label}
            </span>
            {item.hasBadge && (
              <span className="absolute top-3 right-4 w-2 h-2 bg-red rounded-full border-2 border-surf animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="h-screen flex flex-col bg-bg relative overflow-hidden">
      <div className="noise-texture" />

      {/* --- Header --- */}
      <header className="flex-shrink-0 bg-surf/80 backdrop-blur-xl border-b border-border sticky top-0 z-[60]">
        <div className="h-14 lg:h-20 flex items-center justify-between gap-4 max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex-shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/archive/e/e6/20161208013146%21Lee_cooper_logo.svg"
                alt="Lee Cooper"
                className="h-10 lg:h-16 w-auto"
              />
            </div>
            <div>
              <h1 className="font-display font-black text-xs lg:text-3xl lg:tracking-tighter uppercase leading-none">
                LCK TARGA
              </h1>
              <p className="text-[8px] lg:text-xs text-txt3 font-bold uppercase tracking-widest mt-0.5 opacity-60">
                Planning Hebdomadaire
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 ml-auto">
            <AnimatePresence>
              {showSavedBadge && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/20 rounded-full text-green text-[10px] font-bold uppercase tracking-widest"
                >
                  <CheckCircle2 size={12} />
                  <span>Sauvegardé</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => isEdit ? setIsEdit(false) : handleRoleSelect("manager")}
              className={cn(
                "hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all active:scale-95",
                isEdit 
                  ? "bg-green text-white border-green shadow-[0_8px_20px_-4px_rgba(34,197,94,0.4)]" 
                  : "bg-amber text-white border-amber shadow-[0_8px_20px_-4px_rgba(245,158,11,0.4)]"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full bg-white", isEdit ? "animate-pulse" : "")} />
              {isEdit ? "Mode Édition" : "Mode Consultation"}
            </button>

            <div className="flex items-center bg-card2/50 border border-border p-1 rounded-xl">
              <button
                disabled={!isEdit || undoStack.length === 0}
                onClick={handleUndo}
                className="p-2 text-txt3 hover:text-accent disabled:opacity-20 transition-all active:scale-90"
              >
                <Undo size={18} />
              </button>
              <button
                disabled={!isEdit || redoStack.length === 0}
                onClick={handleRedo}
                className="p-2 text-txt3 hover:text-accent disabled:opacity-20 transition-all active:scale-90"
              >
                <Redo size={18} />
              </button>
            </div>

            <button
              onClick={logout}
              className="p-2 lg:p-3 border border-border bg-card hover:bg-red-l rounded-xl text-red transition-all group active:scale-95"
            >
              <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {renderBottomNav()}

      {/* --- Main Content --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-8 flex flex-col min-h-0 space-y-4 lg:space-y-8 pb-32 lg:pb-12 relative z-0">
        {view !== "chat" && view !== "settings" && (
          <div
            className={cn(
              "flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6",
              (view === "day" || view === "week") && "hidden sm:grid",
            )}
          >
          {[
            {
              label: "Total Semaine",
              value: `${grandTotal}h`,
              sub: "Heures planifiées",
              icon: Calendar,
              color: "text-accent",
            },
            {
              label: "Moyenne / Jour",
              value: `${avgPerDay}h`,
              sub: "Par journée",
              icon: Clock,
              color: "text-txt",
            },
            {
              label: "Effectif",
              value: employees.length,
              sub: "Agents actifs",
              icon: Users,
              color: "text-txt",
            },
            {
              label: "Jours Repos",
              value: offDays,
              sub: "Temps libre",
              icon: Moon,
              color: "text-txt",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-card border border-border px-5 py-4 lg:py-6 rounded-xl shadow-sm relative overflow-hidden group transition-all duration-300 hover:border-accent/40"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon size={48} />
              </div>
              <p className="text-[10px] font-sans font-bold text-txt3 uppercase tracking-[0.1em] mb-1.5">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-2xl lg:text-3xl font-bold tracking-tighter",
                    stat.color,
                  )}
                >
                  {stat.value}
                </span>
              </div>
              <p className="text-[9px] text-txt3 font-mono mt-2 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                {stat.sub}
              </p>
            </div>
          ))}
          </div>
        )}

        {/* Week Selection & View Controls */}
        {view !== "chat" && view !== "settings" && (
          <>
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-3 lg:gap-4 bg-card border border-border p-2 lg:p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => changeWeek(-1)}
              className="p-2 border border-border rounded-xl text-txt3 hover:text-accent hover:bg-accent-l transition-all"
            >
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
                  const dataKey = `${STORAGE_KEYS.DATA_PREFIX}${format(realMonday, "yyyy_MM_dd")}`;
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
        <div
          className={cn(
            "flex-shrink-0 grid grid-cols-7 gap-1.5 lg:gap-4 overflow-x-auto no-scrollbar",
            view === "day" && "lg:grid",
          )}
        >
          {data.map((day, idx) => {
            const isToday = isSameDay(addDays(monday, idx), new Date());
            const total = day.shifts.reduce(
              (acc, sh) =>
                acc +
                (sh.off ? 0 : sh.s.reduce((a, b: number) => a + (b || 0), 0)),
              0,
            );
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
                      : "bg-card border-border hover:border-txt3",
                )}
              >
                <span
                  className={cn(
                    "text-[9px] lg:text-xs font-bold uppercase tracking-widest",
                    activeDay === idx
                      ? "text-white/80"
                      : isToday
                        ? "text-amber"
                        : "text-txt3",
                  )}
                >
                  {day.id}
                </span>
                <span
                  className={cn(
                    "text-xs lg:text-xl font-bold mt-0.5 lg:mt-1",
                    activeDay === idx
                      ? "text-white"
                      : isToday
                        ? "text-amber"
                        : "text-txt",
                  )}
                >
                  {total}h
                </span>
              </button>
            );
          })}
        </div>
          </>
        )}

        {/* --- Area Specific Content --- */}
        <AnimatePresence mode="wait">
          {view === "dashboard" && role === "manager" && renderManagerDashboard()}

          {view === "dashboard" && role === "employee" && renderPersonalView()}

          {view === "day" && (
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
                <div className="flex-1 min-h-0 bg-card sm:border sm:border-border sm:rounded-3xl lg:rounded-[3rem] shadow-xl overflow-hidden flex flex-col relative">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,transparent_100%)] pointer-events-none" />

                  <div className="flex-shrink-0 p-4 lg:p-10 bg-surf/80 backdrop-blur-md border-b border-border flex items-center justify-between z-10">
                    <div className="flex items-center gap-4 lg:gap-8">
                      <div className="w-12 h-12 lg:w-24 lg:h-24 bg-accent/5 border border-accent/20 rounded-[1.25rem] lg:rounded-[2rem] flex items-center justify-center text-accent font-display font-black text-xl lg:text-5xl shadow-inner">
                        {data[activeDay].full.slice(0, 1)}
                      </div>
                      <div>
                        <h2 className="text-xl lg:text-4xl font-display font-bold tracking-tight text-txt uppercase">
                          {data[activeDay].full}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 lg:mt-3">
                          <span className="text-[10px] lg:text-base text-txt3 font-mono tracking-widest uppercase bg-card2/50 px-2 lg:px-4 py-0.5 lg:py-1 rounded-full border border-border">
                            {data[activeDay].date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 lg:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="hidden lg:block w-32 h-2.5 bg-border/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_15px_rgba(230,57,70,0.3)]"
                            style={{
                              width: `${Math.min(100, (data[activeDay].shifts.reduce((a, sh) => a + (sh.off ? 0 : sh.s.reduce((va, vb) => va + vb, 0)), 0) / (employees.length * 12)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-3xl lg:text-6xl font-display font-black text-accent tracking-tighter leading-none">
                          {data[activeDay].shifts.reduce(
                            (acc, sh) =>
                              acc +
                              (sh.off ? 0 : sh.s.reduce((a, b) => a + b, 0)),
                            0,
                          )}
                          <small className="text-xs lg:text-2xl font-bold ml-1 opacity-40 uppercase">
                            h
                          </small>
                        </span>
                      </div>
                      <span className="text-[9px] lg:text-xs text-txt3 uppercase font-bold tracking-[0.2em] bg-accent/5 px-3 py-1 rounded-full border border-accent/10">
                        COUVERTURE TOTALE
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar bg-card2/20">
                    <div className="w-full flex flex-col pt-4 lg:pt-8 px-2 lg:px-10 pb-48">
                      {/* Time Ruler */}
                      <div className="flex-shrink-0 flex items-center px-2 lg:px-8 py-3 lg:py-6 bg-surf border border-border shadow-sm rounded-xl lg:rounded-2xl mb-4 lg:mb-8 sticky top-0 z-20">
                        <div className="w-[65px] lg:w-[150px] shrink-0 text-[8px] lg:text-xs font-display font-black text-txt3 tracking-[0.1em] uppercase mr-1.5 lg:mr-4">
                          Équipe
                        </div>
                        <div className="flex-1 grid grid-cols-12 gap-1 lg:gap-2">
                          {Array.from({ length: 12 }).map((_, i) => {
                            const hour = i + 10;
                            const isNow = new Date().getHours() === hour;
                            return (
                              <div key={i} className="text-center group">
                                <div className="flex flex-col items-center">
                                  <span
                                    className={cn(
                                      "text-[9px] lg:text-sm font-mono font-bold transition-colors",
                                      isNow
                                        ? "text-accent scale-110"
                                        : "text-txt group-hover:text-accent",
                                    )}
                                  >
                                    {hour}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[7px] lg:text-[10px] font-mono opacity-40 uppercase",
                                      isNow
                                        ? "text-accent opacity-100 font-bold"
                                        : "text-txt3",
                                    )}
                                  >
                                    {hour >= 12 ? "pm" : "am"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="w-[30px] lg:w-[60px] shrink-0 text-right text-[8px] lg:text-xs font-display font-black text-txt3 tracking-[0.1em] uppercase ml-1.5 lg:mr-4">
                          Total
                        </div>
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
                            loggedInEmployeeIdx={employeeIdx}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === "week" && (
            <motion.div
              key="week"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-0 overflow-y-auto no-scrollbar bg-card border border-border rounded-xl lg:rounded-3xl p-2 lg:p-6 shadow-lg flex flex-col pb-32"
            >
              {/* Main Content Area */}
              <div className="space-y-4 lg:space-y-6">
                {data.map((day, di) => {
                  const dayTotalHours = day.shifts.reduce(
                    (acc, sh) =>
                      acc +
                      (sh.off ? 0 : sh.s.reduce((a, b) => a + (b || 0), 0)),
                    0,
                  );

                  return (
                    <div
                      key={day.id}
                      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col"
                    >
                      {/* Day Card Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-surf/50 border-b border-border">
                        <h3 className="font-display font-black text-lg tracking-tight uppercase text-txt">
                          {day.full}
                        </h3>
                        <div className="flex items-center gap-3 text-txt font-mono font-bold text-sm">
                          <span className="opacity-40">{day.date}</span>
                          <span className="text-accent text-lg font-black">
                            {dayTotalHours}h
                          </span>
                        </div>
                      </div>

                      {/* Day Card Body / Timeline */}
                      <div className="p-3 lg:p-4 pb-0">
                        {/* Timeline Header */}
                        <div className="flex items-center pb-2 border-b border-border/50 mb-3">
                          <div className="w-8 lg:w-12 shrink-0 text-center text-[9px] uppercase font-bold text-txt3 tracking-widest">
                            h
                          </div>
                          <div className="flex-1 grid grid-cols-12 gap-1 lg:gap-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const hour = i + 10;
                              return (
                                <div
                                  key={i}
                                  className="text-left text-[8px] lg:text-[9px] font-mono opacity-40 text-txt3"
                                >
                                  {hour === 12
                                    ? "12pm"
                                    : hour > 12
                                      ? `${hour - 12}pm`
                                      : `${hour}am`}
                                </div>
                              );
                            })}
                          </div>
                          <div className="w-8 lg:w-10 shrink-0"></div>
                        </div>

                        {/* Employee Rows */}
                        <div className="space-y-2">
                          {employees.map((emp, ei) => {
                            const shift = day.shifts[ei];
                            const hours = shift.s.reduce(
                              (a, b) => a + (b || 0),
                              0,
                            );

                            return (
                              <div
                                key={emp.name}
                                className="flex items-center h-5 lg:h-6"
                              >
                                <div
                                  className={cn(
                                    "w-8 lg:w-12 shrink-0 flex items-center justify-center font-display font-black text-xs transition-colors",
                                    isEdit
                                      ? "cursor-pointer hover:opacity-75"
                                      : "",
                                    ei === employeeIdx ? "text-me" : "text-txt3"
                                  )}
                                  onClick={() => isEdit && toggleDayOff(di, ei)}
                                >
                                  {emp.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 h-full min-w-0">
                                  {shift.off ? (
                                    <div
                                      className={cn(
                                        "w-full h-full flex items-center justify-center",
                                        isEdit
                                          ? "cursor-pointer hover:bg-border/20 rounded-md"
                                          : "",
                                      )}
                                      onClick={() =>
                                        isEdit && toggleDayOff(di, ei)
                                      }
                                    >
                                      <span className="text-[9px] font-mono tracking-[0.2em] text-txt3 opacity-40 uppercase font-bold">
                                        Repos
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full grid grid-cols-12 gap-1 lg:gap-2">
                                      {shift.s.map((v, i) => (
                                        <div
                                          key={i}
                                          onClick={() =>
                                            isEdit && toggleSlot(di, ei, i)
                                          }
                                          className={cn(
                                            "h-full rounded-[2px] transition-all",
                                            isEdit
                                              ? "cursor-pointer active:scale-95 hover:brightness-110"
                                              : "",
                                          )}
                                          style={{
                                            backgroundColor: v
                                              ? (ei === employeeIdx ? "var(--me)" : "var(--accent)")
                                              : "var(--border2)",
                                            opacity: v ? 0.9 : 0.3,
                                          }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div
                                  className={cn(
                                    "w-10 lg:w-12 shrink-0 text-right pr-1 font-display font-black text-[10px] lg:text-xs transition-colors",
                                    shift.off ? "text-txt3 opacity-40" : ei === employeeIdx ? "text-me font-black" : "text-txt opacity-70"
                                  )}
                                >
                                  {shift.off ? "—" : `${hours}h`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Day Card Footer */}
                      <div className="flex items-center justify-between px-4 py-2 bg-accent/10 mt-3 text-accent">
                        <span className="font-display font-bold text-sm">
                          Total
                        </span>
                        <span className="font-mono font-black text-sm">
                          {dayTotalHours}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="my-8 flex flex-wrap items-center gap-6 p-6 bg-card2/50 rounded-2xl border border-dashed border-border">
                {employees.map((e, ei) => (
                  <div key={e.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: ei === employeeIdx ? "var(--me)" : "var(--accent)" }}
                    />
                    <span className={cn(
                      "text-[10px] font-display font-black uppercase tracking-widest transition-colors",
                      ei === employeeIdx ? "text-me" : "text-txt2 opacity-70"
                    )}>
                      {e.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Weekly Goal Indicator (Moved to bottom) */}
              <div className="mt-auto flex items-center justify-between pt-6 border-t border-border">
                <div>
                  <h3 className="font-display font-black text-base lg:text-lg tracking-tight uppercase">
                    Récapitulatif Hebdomadaire
                  </h3>
                  <p className="text-[10px] lg:text-xs text-txt3">
                    Aperçu global de la distribution des heures
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl lg:text-2xl font-display font-black text-accent leading-none">
                    {grandTotal}h
                  </span>
                  <p className="text-[8px] lg:text-[10px] text-txt3 uppercase font-bold tracking-widest leading-none mt-1">
                    Total Magasin
                  </p>
                </div>
              </div>

              {grandTotal === 0 && isEdit && (
                <div className="mt-8 p-12 flex flex-col items-center justify-center text-center space-y-4 bg-bg/20 border-2 border-dashed border-border rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <Copy size={32} />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-lg uppercase text-txt">
                      Semaine non planifiée
                    </h4>
                    <p className="text-xs text-txt3 mt-2 max-w-sm">
                      Vous pouvez commencer de zéro ou gagner du temps en
                      copiant l'horaire de la semaine passée.
                    </p>
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
            </motion.div>
          )}

          {view === "chat" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 min-h-0"
            >
              <ChatView
                db={db}
                role={role}
                employeeIdx={employeeIdx}
                employees={employees}
              />
            </motion.div>
          )}

          {view === "settings" && renderSettingsView()}
        </AnimatePresence>
      </main>

      {/* --- Day Team Popup --- */}
      <AnimatePresence>
        {selectedDayPopup !== null && (
          <Modal
            title={`Équipe — ${data[selectedDayPopup].full}`}
            onClose={() => setSelectedDayPopup(null)}
          >
            <div className="p-4 lg:p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono font-bold text-txt3 uppercase tracking-widest">
                  {data[selectedDayPopup].date}
                </span>
                <span className="text-sm font-display font-black text-accent">
                  {data[selectedDayPopup].shifts.reduce(
                    (acc, sh) =>
                      acc + (sh.off ? 0 : sh.s.reduce((a, b) => a + b, 0)),
                    0,
                  )}
                  h total
                </span>
              </div>
              <div className="space-y-3">
                {employees.map((emp, ei) => {
                  const shift = data[selectedDayPopup].shifts[ei];
                  const hours = shift.s.reduce((a, b) => a + (b || 0), 0);
                  return (
                    <div
                      key={emp.name}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-2xl border transition-all",
                        shift.off
                          ? "bg-bg/40 border-border/30 opacity-60"
                          : "bg-card2 border-border/50 shadow-sm",
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-black text-[10px]"
                        style={{ backgroundColor: ei === employeeIdx ? "var(--me)" : "var(--accent)" }}
                      >
                        {emp.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-display font-black text-xs truncate uppercase tracking-tight",
                          ei === employeeIdx ? "text-me" : "text-txt opacity-70"
                        )}>
                          {emp.name}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {shift.off ? (
                            <span className="text-[8px] font-black uppercase text-txt3 tracking-widest">
                              En repos
                            </span>
                          ) : hours > 0 ? (
                            <div className="flex gap-0.5 h-2 w-full max-w-[100px]">
                              {shift.s.map((v, si) => (
                                <div
                                  key={si}
                                  className="flex-1 rounded-sm"
                                  style={{
                                    backgroundColor: v
                                      ? (ei === employeeIdx ? "var(--me)" : "var(--accent)")
                                      : "rgba(0,0,0,0.05)",
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-[8px] font-bold text-txt3 opacity-40">
                              Non planifié
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-black text-txt">
                          {shift.off ? "—" : hours + "h"}
                        </span>
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
          <Modal
            title="Planning Complet Équipe"
            onClose={() => setShowTeamWeekPopup(false)}
          >
            <div className="p-4 lg:p-6 overflow-x-auto no-scrollbar">
              <div className="min-w-[500px]">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="text-left text-[9px] font-black uppercase tracking-widest text-txt3 px-2 pb-2">
                        Agent
                      </th>
                      {data.map((d) => (
                        <th
                          key={d.id}
                          className="text-center text-[9px] font-black uppercase tracking-widest text-txt3 pb-2"
                        >
                          {d.id}
                        </th>
                      ))}
                      <th className="text-right text-[9px] font-black uppercase tracking-widest text-txt3 px-2 pb-2">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, ei) => {
                      const weeklyTotal = data.reduce(
                        (acc, d) =>
                          acc +
                          (d.shifts[ei].off
                            ? 0
                            : d.shifts[ei].s.reduce((a, b) => a + (b || 0), 0)),
                        0,
                      );
                      return (
                        <tr key={emp.name} className="bg-bg/40">
                          <td className="px-2 py-3 rounded-l-xl border-y border-l border-border/50">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-display font-black text-[8px]"
                                style={{ backgroundColor: ei === employeeIdx ? "var(--me)" : "var(--accent)" }}
                              >
                                {emp.name.slice(0, 2)}
                              </div>
                              <span className={cn(
                                "font-display font-black text-[10px] truncate max-w-[80px] transition-colors",
                                ei === employeeIdx ? "text-me" : "text-txt opacity-70"
                              )}>
                                {emp.name.split(" ")[0]}
                              </span>
                            </div>
                          </td>
                          {data.map((d, di) => {
                            const sh = d.shifts[ei];
                            const h = sh.s.reduce((a, b) => a + (b || 0), 0);
                            return (
                              <td
                                key={di}
                                className="text-center py-3 border-y border-border/50"
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-mono font-black",
                                    sh.off
                                      ? "text-txt3 opacity-20"
                                      : h > 0
                                        ? "text-accent"
                                        : "text-txt3 opacity-40",
                                  )}
                                >
                                  {sh.off ? "—" : h || "·"}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-3 text-right rounded-r-xl border-y border-r border-border/50">
                            <span className="text-[10px] font-mono font-black text-txt bg-card px-2 py-1 rounded-lg border border-border/50">
                              {weeklyTotal}h
                            </span>
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />

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
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-bg border border-border rounded-2xl group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: i === employeeIdx ? "var(--me)" : "var(--accent)" }}
                  />
                  <span className={cn(
                    "font-display font-black flex-1 uppercase tracking-tight",
                    i === employeeIdx ? "text-me" : "text-txt opacity-70"
                  )}>
                    {emp.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveEmployee(i, -1)}
                      className="p-1.5 hover:bg-card2 rounded-lg text-txt3"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveEmployee(i, 1)}
                      className="p-1.5 hover:bg-card2 rounded-lg text-txt3"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => removeEmployee(i)}
                      className="p-1.5 hover:bg-red-l text-red rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border">
              <label className="text-[10px] text-txt3 uppercase font-black tracking-widest mb-2 block">
                Nouvel Agent
              </label>
              <div className="flex gap-2">
                <input
                  id="new-emp-name"
                  type="text"
                  placeholder="NOM"
                  className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-sm font-display font-bold outline-none focus:border-accent transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addEmployee((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "new-emp-name",
                    ) as HTMLInputElement;
                    addEmployee(input.value);
                    input.value = "";
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

      {/* --- QR Modal --- */}
      {qrModal && (
        <Modal title="Partager / Export" onClose={() => setQrModal(false)}>
          <div className="flex flex-col gap-6 p-4">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-4 rounded-3xl border border-border shadow-inner">
                <QRCodeSVG value={JSON.stringify(data)} size={150} level="M" />
              </div>
              <p className="text-xs text-txt3 text-center">Sync Planning</p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-sm mb-4">Export PDF</h4>

              <div className="mb-4">
                <label className="text-xs font-bold text-txt3 mb-1 block">
                  Layout
                </label>
                <select
                  value={pdfOptions.layout}
                  onChange={(e) =>
                    setPdfOptions((prev) => ({
                      ...prev,
                      layout: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-sm bg-bg"
                >
                  <option value="weekly">Weekly Plan</option>
                  <option value="daily">Daily Detail</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-txt3 mb-1 block">
                  Date Range
                </label>
                <select
                  value={pdfOptions.dateRange}
                  onChange={(e) =>
                    setPdfOptions((prev) => ({
                      ...prev,
                      dateRange: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg text-sm bg-bg"
                >
                  <option value="current">Current Week</option>
                  <option value="last">Last Week</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-txt3 mb-1 block">
                  Employees
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() =>
                      setPdfOptions((prev) => ({
                        ...prev,
                        selectedEmployees: [],
                      }))
                    }
                    className={cn(
                      "px-2 py-1 rounded-full",
                      pdfOptions.selectedEmployees.length === 0
                        ? "bg-accent text-white"
                        : "bg-bg border border-border",
                    )}
                  >
                    All
                  </button>
                  {employees.map((e) => (
                    <button
                      key={e.id}
                      onClick={() =>
                        setPdfOptions((prev) => {
                          const selected = prev.selectedEmployees.includes(e.id)
                            ? prev.selectedEmployees.filter((id) => id !== e.id)
                            : [...prev.selectedEmployees, e.id];
                          return { ...prev, selectedEmployees: selected };
                        })
                      }
                      className={cn(
                        "px-2 py-1 rounded-full",
                        pdfOptions.selectedEmployees.includes(e.id)
                          ? "bg-accent text-white"
                          : "bg-bg border border-border",
                      )}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  const doc = new jsPDF();
                  doc.setFontSize(18);
                  doc.text(`Planning Export - ${pdfOptions.layout}`, 10, 20);
                  doc.setFontSize(12);
                  doc.text(`Date Range: ${pdfOptions.dateRange}`, 10, 30);

                  const emps =
                    pdfOptions.selectedEmployees.length === 0
                      ? employees
                      : employees.filter((e) =>
                          pdfOptions.selectedEmployees.includes(e.id),
                        );

                  let y = 40;
                  emps.forEach((emp) => {
                    doc.text(`Employee: ${emp.name}`, 10, y);
                    y += 10;
                    y += 5;
                  });

                  doc.save(
                    `planning_${pdfOptions.layout}_${pdfOptions.dateRange}.pdf`,
                  );
                }}
                className="flex items-center gap-2 w-full justify-center bg-accent text-white py-4 rounded-2xl font-display font-black text-sm hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Download size={18} />
                Export PDF
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const weekLabel = (m: Date) => {
  const end = addDays(m, 6);
  const fmt = (d: Date) => format(d, "dd/MM/yy");
  return `${fmt(m)} → ${fmt(end)}`;
};

// --- Sub-components ---

function PinModal({
  role,
  onUnlock,
  onClose,
}: {
  role: AccessRole;
  onUnlock: (s: boolean) => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const expectedPin =
    localStorage.getItem(
      role === "manager" ? STORAGE_KEYS.PIN : STORAGE_KEYS.STAFF_PIN,
    ) || (role === "manager" ? DEFAULT_PIN : DEFAULT_EMPLOYEE_PIN);

  const handleInput = (val: string) => {
    if (val.length > 4) return;
    setPin(val);
    setError(false);
    if (val.length === 4) {
      if (val === expectedPin) {
        onUnlock(true);
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay/20 backdrop-blur-sm"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={cn(
          "w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10 text-center",
          error ? "animate-shake border-red/50 shadow-[0_0_40px_rgba(230,57,70,0.2)]" : "",
        )}
      >
        <div className="mb-6 relative inline-block">
          <motion.div 
            animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-300",
              error ? "bg-red shadow-red/30" : "bg-accent shadow-accent/30"
            )}
          >
            {role === "manager" ? <Lock size={28} /> : <User size={28} />}
          </motion.div>
        </div>
        <h2 className="text-2xl font-display font-black mb-1">
          {role === "manager" ? "Manager" : "Employé"}
        </h2>
        <p className="text-txt3 text-xs mb-8 font-medium">
          Saisir le code d'accès
        </p>

        <div className="flex justify-center gap-4 mb-10">
          {[0, 1, 2, 3].map((idx) => (
            <motion.div
              key={idx}
              initial={false}
              animate={{
                scale: pin.length > idx ? 1.2 : 1,
                backgroundColor: pin.length > idx ? "var(--accent)" : "transparent",
                borderColor: pin.length > idx ? "var(--accent)" : "var(--border2)",
              }}
              className={cn(
                "w-3.5 h-3.5 rounded-full border-2 transition-all duration-200",
                pin.length > idx && "shadow-[0_0_15px_rgba(230,57,70,0.4)]"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "clear", 0, "back"].map((k, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05, backgroundColor: "var(--card2)" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (k === "back") setPin(pin.slice(0, -1));
                else if (k === "clear") setPin("");
                else handleInput(pin + k);
              }}
              className={cn(
                "h-16 rounded-full flex flex-col items-center justify-center transition-all",
                typeof k === "number"
                  ? "bg-bg/50 border border-border/50 text-xl font-display font-black"
                  : "text-txt3 text-[10px] uppercase font-bold tracking-widest"
              )}
            >
              {k === "back" ? <RotateCcw size={18} /> : 
               k === "clear" ? "Effacer" : k}
            </motion.button>
          ))}
        </div>

        {error && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-red text-[10px] font-black uppercase tracking-[0.2em]"
          >
            Code Incorrect
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-overlay/80 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden flex flex-col"
      >
        <div className="flex-shrink-0 w-full flex flex-col items-center">
          {/* Grab Handle */}
          <div className="w-12 h-1 bg-border rounded-full mt-4 flex-shrink-0 opacity-40" />
          
          <div className="w-full px-8 py-6 border-b border-border bg-surf/50 backdrop-blur-md flex items-center justify-between">
            <h2 className="text-xl font-display font-black tracking-tight uppercase">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 border border-border rounded-xl text-txt3 hover:text-accent hover:bg-card2 transition-all active:scale-90"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar max-h-[75vh] p-1">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
