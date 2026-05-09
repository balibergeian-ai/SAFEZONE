import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User,
  signOut 
} from 'firebase/auth';
import { 
  getDoc,
  setDoc,
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Map as MapIcon, 
  Info, 
  History, 
  Settings, 
  LogOut, 
  Send,
  Navigation,
  CheckCircle2,
  Bell,
  BarChart3,
  Users,
  Phone,
  ChevronRight,
  ExternalLink,
  Flag,
  Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Role = 'ADMIN' | 'STAFF' | 'STUDENT' | 'STAKEHOLDER';

interface Alert {
  id: string;
  type: 'EMERGENCY' | 'WEATHER' | 'EARTHQUAKE' | 'DRILL' | 'INFO';
  severity: 'CRITICAL' | 'WARNING' | 'MODERATE' | 'LOW';
  title: string;
  description: string;
  campusId: string;
  authorId: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  campusId?: string;
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-slate-900 text-white hover:bg-slate-800',
      secondary: 'bg-blue-600 text-white hover:bg-blue-700',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; key?: any; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn('bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm', className)}
  >
    {children}
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'map' | 'guidance' | 'benchmark' | 'admin'>('alerts');
  const [loading, setLoading] = useState(true);
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  const [selectedGuidance, setSelectedGuidance] = useState<any>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string, type: 'ALERT' | 'USER' } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch or create profile
        const userDocRef = doc(db, 'users', u.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            // New user - default to STUDENT for now, ADMIN if email matches
            const role: Role = u.email === 'balibergeian@gmail.com' ? 'ADMIN' : 'STUDENT';
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'User',
              email: u.email || '',
              role
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (e) {
          console.error("Error setting up profile", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Alert[];
      setAlerts(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alerts');
    });
    return unsub;
  }, []);

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: auth.currentUser?.uid,
        targetId: reportTarget.id,
        targetType: reportTarget.type,
        reason: reportReason,
        createdAt: serverTimestamp()
      });
      setReportTarget(null);
      setReportReason('');
      alert("Report submitted successfully for review.");
    } catch (e) {
      console.error(e);
      alert("Failed to submit report. Please try again.");
    }
    setSubmittingReport(false);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-4"
        >
          <ShieldAlert className="w-12 h-12 text-slate-800" />
          <p className="text-slate-500 font-medium">SafeZone Securing...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="space-y-4">
            <div className="inline-flex p-4 bg-slate-900 rounded-2xl shadow-xl">
              <ShieldAlert className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">SafeZone</h1>
            <p className="text-slate-500">
              Real-time, campus-specific emergency alerts and disaster response platform.
            </p>
          </div>
          
          <Button onClick={handleLogin} className="w-full py-4 text-lg">
            Sign in with Campus Email
          </Button>
          
          <p className="text-xs text-slate-400">
            Secure authentication provided for university communities.
          </p>
        </motion.div>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.isActive);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col gap-8 z-50">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold tracking-tight">SafeZone</span>
        </div>

        <div className="flex-1 space-y-2">
          <NavItem active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<Bell />} label="Live Alerts" count={activeAlerts.length} />
          <NavItem active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapIcon />} label="Campus Map" />
          <NavItem active={activeTab === 'guidance'} onClick={() => setActiveTab('guidance')} icon={<Info />} label="Safety Protocol" />
          <NavItem active={activeTab === 'benchmark'} onClick={() => setActiveTab('benchmark')} icon={<BarChart3 />} label="Benchmarking" />
          {(profile?.role === 'ADMIN' || profile?.role === 'STAFF') && (
            <NavItem active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings />} label="Control Center" />
          )}
        </div>

        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} referrerPolicy="no-referrer" alt="" /> : <Users className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate lowercase">{profile?.role}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-2 text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 md:hidden z-50">
        <MobileNavItem active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<Bell />} label="Alerts" />
        <MobileNavItem active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapIcon />} label="Map" />
        <MobileNavItem active={activeTab === 'guidance'} onClick={() => setActiveTab('guidance')} icon={<Info />} label="Safety" />
        <MobileNavItem active={activeTab === 'benchmark'} onClick={() => setActiveTab('benchmark')} icon={<BarChart3 />} label="Data" />
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'alerts' && (
            <AlertsView 
              alerts={alerts} 
              key="alerts" 
              onAction={() => setActiveTab('map')} 
              onReport={(id, type) => setReportTarget({ id, type })}
            />
          )}
          {activeTab === 'map' && <MapView key="map" />}
          {activeTab === 'guidance' && <GuidanceView key="guidance" onSelect={setSelectedGuidance} />}
          {activeTab === 'benchmark' && <BenchmarkView key="benchmark" />}
          {activeTab === 'admin' && <AdminView key="admin" alerts={alerts} />}
        </AnimatePresence>
      </main>

      {/* Speed Dial / Emergency Contacts */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-[60]">
        <AnimatePresence>
          {showSpeedDial && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="absolute bottom-16 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-red-600 p-4 text-white">
                <h3 className="font-bold flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Emergency Speed Dial
                </h3>
              </div>
              <div className="p-2 space-y-1">
                <EmergencyContact label="Emergency Services" number="911" color="text-red-600" />
                <EmergencyContact label="Campus Police" number="+15550001234" />
                <EmergencyContact label="Health Services" number="+15550005678" />
                <EmergencyContact label="Campus Security" number="+15550009012" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setShowSpeedDial(!showSpeedDial)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90",
            showSpeedDial ? "bg-slate-800 rotate-45" : "bg-red-600 hover:bg-red-700"
          )}
        >
          <Bell className={cn("w-6 h-6 text-white transition-opacity", showSpeedDial ? "opacity-0" : "opacity-100")} />
          <Settings className={cn("w-6 h-6 text-white absolute transition-opacity", showSpeedDial ? "opacity-100" : "opacity-0")} />
        </button>
      </div>

      {/* Guidance Modal */}
      <AnimatePresence>
        {selectedGuidance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuidance(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className={cn("p-6 text-white", `bg-${selectedGuidance.color}-600`)}>
                <h3 className="text-2xl font-bold">{selectedGuidance.title}</h3>
                <p className="text-white/80 text-sm">Official Campus Protocol</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Action Checklist
                  </h4>
                  <ul className="space-y-3">
                    {selectedGuidance.checklist.map((item: string, i: number) => (
                      <li key={i} className="flex gap-3 text-slate-600">
                        <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button onClick={() => setSelectedGuidance(null)} className="w-full">Understood</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportTarget(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-slate-900 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-500" /> Report Content
                </h3>
                <p className="text-slate-400 text-sm">Help us keep SafeZone secure and accurate.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Reason for Report</label>
                  <textarea
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe why this content is inappropriate or inaccurate..."
                    className="w-full border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 border min-h-[100px]"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setReportTarget(null)} className="flex-1">Cancel</Button>
                  <Button 
                    disabled={submittingReport || !reportReason.trim()} 
                    onClick={submitReport} 
                    className="flex-1" 
                    variant="danger"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subviews ---

function AlertsView({ alerts, onAction, onReport }: { alerts: Alert[]; onAction: () => void; onReport: (id: string, type: 'ALERT' | 'USER') => void; key?: string }) {
  const active = alerts.filter(a => a.isActive);
  const past = alerts.filter(a => !a.isActive);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Emergency Feed</h2>
        <p className="text-slate-500">Verified campus alerts updated in real-time.</p>
      </header>

      {active.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-red-600 font-bold uppercase tracking-wider text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            Active Alerts
          </div>
          {active.map(alert => <AlertCard key={alert.id} alert={alert} onAction={onAction} onReport={onReport} />)}
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <History className="w-5 h-5" />
          Recent Updates
        </h3>
        {past.length === 0 && <p className="text-slate-400 italic py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">No recent alerts.</p>}
        {past.map(alert => <AlertCard key={alert.id} alert={alert} onAction={onAction} onReport={onReport} />)}
      </section>
    </motion.div>
  );
}

function MapView() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const sites = {
    sv: { 
      name: 'St. Vincent (SV) Site', 
      buildings: ['SV Building', 'Gymnasium', 'Covered Court', 'SV Hall', 'Church'], 
      color: 'bg-blue-600', 
      borderColor: 'border-blue-700',
      tag: 'NORTH CAMPUS'
    },
    st: { 
      name: 'St. Theresa (ST) Site', 
      buildings: ['ST Building', 'LM Building', 'Theater'], 
      color: 'bg-green-600', 
      borderColor: 'border-green-700',
      tag: 'SOUTH SITE'
    },
    oz: { 
      name: 'Ozanam (OZ) Site', 
      buildings: ['OZ Building', 'Engineering Labs', 'Canteen'], 
      color: 'bg-emerald-600', 
      borderColor: 'border-emerald-700',
      tag: 'SOUTH SITE'
    },
    csbed: { 
      name: 'Cardinal Santos / BED', 
      buildings: ['CS Building', 'CS Annex', 'JP Building', 'FRC Building', 'BED Bldg'], 
      color: 'bg-red-600', 
      borderColor: 'border-red-700',
      tag: 'EAST CAMPUS'
    },
    ct: {
      name: 'CT Building',
      buildings: ['Technology Hall', 'Laboratories'],
      color: 'bg-indigo-600',
      borderColor: 'border-indigo-700',
      tag: 'CAMPUS SOUTH'
    },
    oz_parking: {
      name: 'OZ Parking Hub',
      buildings: ['Parking Area', 'Assembly Zone'],
      color: 'bg-amber-500',
      borderColor: 'border-amber-600',
      tag: 'ASSEMBLY HUB'
    }
  };

  const getRouteDetails = (id: string) => {
    switch(id) {
      case 'sv':
        return {
          title: "Intra-Site Evacuation (SV)",
          steps: [
            "Exit your current building via the nearest safety stairwell.",
            "Identify the SV Covered Courts (Area 2 on official map).",
            "Maintain distance from the SV Hall glass facade.",
            "Report to the assembly officer at the Gymnasium entrance."
          ],
          color: "blue"
        };
      case 'oz_parking':
        return {
          title: "HUB EVACUATION (OZ PARKING)",
          steps: [
            "Proceed to the Ground Level Parking area behind OZ Building.",
            "Stay clear of the OZ engineering workshops.",
            "Assemble at the designated yellow markers.",
            "Await instruction from the South Campus Safety Team."
          ],
          color: "amber"
        };
      case 'st':
      case 'oz':
      case 'ct':
        return {
          title: `Campus Evacuation (${id.toUpperCase()})`,
          steps: [
            `Evacuate the ${id.toUpperCase()} building via the nearest exit.`,
            "Check if OZ Parking Hub is designated as your nearest assembly point.",
            "If directed, proceed toward the ST Pedestrian Gate on San Marcelino St.",
            "Cross to SV Site Covered Court for primary registration."
          ],
          color: id === 'st' ? "green" : id === 'oz' ? "emerald" : "indigo"
        };
      case 'csbed':
        return {
          title: "East Campus Evacuation (CS/BED)",
          steps: [
            "Exit via the CS/BED Main Lobby or Service Gate.",
            "Cross Falcon Bridge towards the Ozanam/ST Site.",
            "Follow the ST walkway to the San Marcelino exit.",
            "Cross to SV Site and register at the Evacuation Hub."
          ],
          color: "red"
        };
      default:
        return null;
    }
  };

  const activeRoute = selectedRoute ? getRouteDetails(selectedRoute) : null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Campus Safety Map</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-widest">Adamson University</span>
          </div>
          <p className="text-slate-500 text-sm">Real-time schematic of Site locations, safety beacons, and evacuation paths.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          System Status: Optimal
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="relative bg-[#f8fafc] p-6 lg:p-8 min-h-[550px] flex flex-col border-2 border-slate-200 overflow-hidden shadow-xl ring-1 ring-slate-200/50">
            <div className="relative flex-1 rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 group">
              
              {/* Detailed Grid Overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
              </div>

              {/* Legend Box */}
              <div className="absolute top-6 right-6 z-30 bg-white/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-lg space-y-3 hidden xl:block transition-all hover:shadow-xl">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-100 pb-2 mb-2">Legend</h5>
                <LegendItem color="blue" label="SV Site" />
                <LegendItem color="green" label="ST Site" />
                <LegendItem color="emerald" label="OZ Site" />
                <LegendItem color="red" label="CS/BED Site" />
                <LegendItem color="indigo" label="CTIR Site" />
                <LegendItem color="amber" label="OZ Parking Hub" />
                <LegendItem color="cyan" label="Esteros de Balete" dotted />
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                    <Navigation className="w-3 h-3" /> Assembly Point
                  </div>
                </div>
              </div>

              {/* Geographic Landmarks */}
              <div className="absolute top-[38%] left-0 right-0 h-14 bg-slate-100/50 flex items-center justify-center border-y-2 border-slate-200/40 z-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[1em] ml-[1em] select-none">San Marcelino Street</span>
              </div>
              
              {/* River (Esteros de Balete) between ST and CS */}
              <div className="absolute top-[42%] bottom-0 left-[58%] w-10 bg-cyan-50/40 flex items-center justify-center z-0">
                <div className="h-full w-4 bg-cyan-200/20 rotate-6" />
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-14 h-6 bg-slate-400/30 border-x-2 border-slate-400/50 rounded shadow-sm flex items-center justify-center">
                  <span className="text-[6px] font-black text-slate-600 uppercase -rotate-90">Bridge</span>
                </div>
              </div>

              {/* Dynamic Route Visualization Layer */}
              <AnimatePresence>
                {selectedRoute && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 pointer-events-none"
                  >
                    <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                      <defs>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      {selectedRoute === 'sv' && (
                        <motion.circle cx="375" cy="208" r="10" fill="#3b82f6" initial={{ scale: 0 }} animate={{ scale: 1 }} filter="url(#glow)" />
                      )}

                      {selectedRoute === 'oz_parking' && (
                        <motion.circle cx="333" cy="958" r="10" fill="#f59e0b" initial={{ scale: 0 }} animate={{ scale: 1 }} filter="url(#glow)" />
                      )}
                      
                      {selectedRoute === 'st' && (
                        <>
                          <motion.circle cx="333" cy="583" r="10" fill="#166534" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                          <motion.path 
                            d="M 333 583 L 333 400 L 375 400 L 375 250" 
                            stroke="#166534" 
                            strokeWidth="6" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeDasharray="15, 15"
                            animate={{ strokeDashoffset: [0, -30] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                          />
                        </>
                      )}

                      {selectedRoute === 'ct' && (
                        <>
                          <motion.circle cx="166" cy="958" r="10" fill="#4338ca" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                          <motion.path 
                            d="M 166 958 L 333 958" 
                            stroke="#4338ca" 
                            strokeWidth="6" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeDasharray="15, 15"
                            animate={{ strokeDashoffset: [0, -30] }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          />
                        </>
                      )}

                      {selectedRoute === 'oz' && (
                        <>
                          <motion.circle cx="583" cy="958" r="10" fill="#059669" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                          <motion.path 
                            d="M 583 958 L 416 958" 
                            stroke="#059669" 
                            strokeWidth="6" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeDasharray="15, 15"
                            animate={{ strokeDashoffset: [0, -30] }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          />
                        </>
                      )}
                      
                      {selectedRoute === 'csbed' && (
                        <>
                          <motion.circle cx="833" cy="583" r="10" fill="#991b1b" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                          <motion.path 
                            d="M 833 583 L 580 583 L 580 400 L 375 400 L 375 250" 
                            stroke="#991b1b" 
                            strokeWidth="6" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeDasharray="15, 15"
                            animate={{ strokeDashoffset: [0, -30] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                          />
                        </>
                      )}
                      
                      {/* Destination Focal Point (SV Assembly) */}
                      <motion.g animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                        <circle cx="375" cy="200" r="24" fill="white" stroke="#3b82f6" strokeWidth="3" className="shadow-lg" />
                        <motion.circle 
                          cx="375" cy="200" r="40" 
                          stroke="#3b82f6" strokeWidth="1" fill="none"
                          animate={{ scale: [0.5, 1.2], opacity: [0.6, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <circle cx="375" cy="200" r="8" fill="#3b82f6" />
                      </motion.g>

                      {/* Secondary Destination Focal Point (OZ Parking Hub) */}
                      <motion.g animate={{ scale: [0.8, 0.9, 0.8] }} transition={{ repeat: Infinity, duration: 3 }}>
                        <circle cx="333" cy="958" r="18" fill="white" stroke="#f59e0b" strokeWidth="2" className="shadow-lg" />
                        <motion.circle 
                          cx="333" cy="958" r="30" 
                          stroke="#f59e0b" strokeWidth="1" fill="none"
                          animate={{ scale: [0.5, 1.2], opacity: [0.5, 0] }}
                          transition={{ repeat: Infinity, duration: 2.5 }}
                        />
                        {/* Simple Triangle Icon for Hub */}
                        <path d="M 333 948 L 341 963 L 325 963 Z" fill="#f59e0b" />
                      </motion.g>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interactive Map Content Layer */}
              <div className="absolute inset-0 p-8 grid grid-cols-12 grid-rows-12 gap-3 z-10">
                {/* SV Site Buildings (Top) */}
                <div className="col-start-2 col-end-8 row-start-1 row-end-4 space-y-2 pointer-events-auto">
                  <motion.div 
                    whileHover={{ scale: 1.01, filter: 'brightness(1.05)' }} 
                    onClick={() => setSelectedRoute('sv')}
                    className={cn(
                      "h-full w-full rounded-2xl border-2 flex flex-col p-4 shadow-xl text-white transition-all cursor-pointer relative overflow-hidden group/site", 
                      sites.sv.color, sites.sv.borderColor,
                      selectedRoute === 'sv' ? "ring-4 ring-blue-400/50 ring-offset-4" : "opacity-95 hover:opacity-100"
                    )}
                  >
                    <div className="absolute top-2 right-2 opacity-30">
                      <ShieldAlert className="w-12 h-12" />
                    </div>
                    <div className="flex flex-col h-full items-center justify-center text-center">
                      <h4 className="font-black text-2xl uppercase tracking-widest outline-text">SV BUILDING</h4>
                    </div>
                  </motion.div>
                </div>

                {/* ST Building (Middle Left) */}
                <div className="col-start-2 col-end-7 row-start-5 row-end-9 space-y-2 pointer-events-auto">
                  <motion.div 
                    whileHover={{ scale: 1.01, filter: 'brightness(1.05)' }} 
                    onClick={() => setSelectedRoute('st')}
                    className={cn(
                      "h-full w-full rounded-2xl border-2 flex flex-col p-4 shadow-xl text-white transition-all cursor-pointer relative overflow-hidden group/site", 
                      sites.st.color, sites.st.borderColor,
                      selectedRoute === 'st' ? "ring-4 ring-green-400/50 ring-offset-4" : "opacity-95 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                      <h4 className="font-black text-lg uppercase tracking-tight">ST BUILDING</h4>
                    </div>
                  </motion.div>
                </div>

                {/* CS / BED / FRC (Middle Right) */}
                <div className="col-start-8 col-end-12 row-start-4 row-end-11 space-y-2 pointer-events-auto">
                  <motion.div 
                    whileHover={{ scale: 1.01, filter: 'brightness(1.05)' }} 
                    onClick={() => setSelectedRoute('csbed')}
                    className={cn(
                      "h-full w-full rounded-2xl border-2 flex flex-col p-4 shadow-xl text-white transition-all cursor-pointer relative overflow-hidden group/site", 
                      sites.csbed.color, sites.csbed.borderColor,
                      selectedRoute === 'csbed' ? "ring-4 ring-red-400/50 ring-offset-4" : "opacity-95 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                      <h4 className="font-black text-lg uppercase">CS / BED / FRC</h4>
                    </div>
                  </motion.div>
                </div>

                {/* CT Building (Bottom Left) */}
                <div className="col-start-1 col-end-3 row-start-10 row-end-13 space-y-2 pointer-events-auto">
                  <motion.div 
                    whileHover={{ scale: 1.01, filter: 'brightness(1.05)' }} 
                    onClick={() => setSelectedRoute('ct')}
                    className={cn(
                      "h-full w-full rounded-xl border-2 flex flex-col p-2 shadow-lg text-white transition-all cursor-pointer relative overflow-hidden group/site", 
                      sites.ct.color, sites.ct.borderColor,
                      selectedRoute === 'ct' ? "ring-4 ring-indigo-400/50 ring-offset-2" : "opacity-95 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                       <h5 className="font-black text-[10px] uppercase">CT BUILDING</h5>
                    </div>
                  </motion.div>
                </div>

                {/* OZ Parking Hub (Bottom HUB) */}
                <div className="col-start-3 col-end-5 row-start-10 row-end-13 space-y-2 pointer-events-auto">
                  <motion.div 
                    whileHover={{ scale: 1.01 }} 
                    onClick={() => setSelectedRoute('oz_parking')}
                    className={cn(
                      "h-full w-full rounded-xl border-2 border-dashed flex flex-col p-2 shadow-lg text-white transition-all cursor-pointer relative overflow-hidden group/site", 
                      sites.oz_parking.color, sites.oz_parking.borderColor,
                      selectedRoute === 'oz_parking' ? "ring-4 ring-amber-400/50 ring-offset-2" : "opacity-90 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                       <Navigation className="w-5 h-5 mb-1 opacity-60" />
                       <h5 className="font-black text-[10px] uppercase leading-none">OZ PARKING</h5>
                       <span className="text-[7px] font-black opacity-60 mt-1 uppercase">Hub 2</span>
                    </div>
                  </motion.div>
                </div>

                {/* OZ Building (Bottom Middle) */}
                <div className="col-start-5 col-end-9 row-start-10 row-end-13 space-y-2 pointer-events-auto">
                  <motion.div 
                    whileHover={{ scale: 1.01, filter: 'brightness(1.05)' }} 
                    onClick={() => setSelectedRoute('oz')}
                    className={cn(
                      "h-full w-full rounded-2xl border-2 flex flex-col p-4 shadow-xl text-white transition-all cursor-pointer relative overflow-hidden group/site", 
                      sites.oz.color, sites.oz.borderColor,
                      selectedRoute === 'oz' ? "ring-4 ring-emerald-400/50 ring-offset-4" : "opacity-95 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col h-full items-center justify-center text-center">
                      <h4 className="font-black text-sm uppercase leading-tight">OZ BUILDING</h4>
                    </div>
                  </motion.div>
                </div>

                {/* Romualdez Street */}
                <div className="col-start-1 col-end-13 row-start-12 row-end-13 flex items-center justify-center bg-slate-50 border-t border-slate-200">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-[1em] whitespace-nowrap select-none">Romualdez Street</span>
                </div>

                {/* Zobel Street (Vertical) */}
                <div className="col-start-12 col-end-13 row-start-1 row-end-12 flex items-center justify-center">
                  <span className="rotate-90 text-[10px] font-black text-slate-300 uppercase tracking-[1em] whitespace-nowrap select-none">Zobel Street</span>
                </div>
              </div>
            </div>

            {/* Live Traffic / Status Pills */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusPill color="red" label="San Marcelino" status="Heavy Access" />
              <StatusPill color="green" label="SV Assembly" status="Center Active" />
              <StatusPill color="blue" label="ST Walkway" status="Safe Lane" />
            </div>
          </Card>
        </div>

        {/* Directions Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 space-y-6 bg-white border-2 border-slate-100 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 -mr-8 -mt-8 rounded-full pointer-events-none" />
            
            <h3 className="font-black text-slate-900 border-b pb-4 flex items-center gap-2 tracking-tight uppercase text-sm">
              <div className="p-1.5 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg leading-none">
                <Navigation className="w-4 h-4 text-white" />
              </div>
              ROUTING ENGINE
            </h3>
            
            {!selectedRoute ? (
              <div className="py-12 text-center space-y-4">
                <motion.div 
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-inner"
                >
                  <MapIcon className="w-8 h-8 text-slate-400" />
                </motion.div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select Site to Route</p>
                  <p className="text-[10px] text-slate-400 px-8">Tap a site on the map to calculate the safest evacuation path.</p>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 leading-tight text-sm">{activeRoute?.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Optimization</span>
                    </div>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedRoute(null)}
                    className="p-2 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </motion.div>
                </header>

                <div className="space-y-5 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100/50 -z-0" />
                  {activeRoute?.steps.map((step, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4 items-start group z-10"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] font-black shrink-0 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-300">
                        {i + 1}
                      </div>
                      <div className="space-y-1 pt-0.5">
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">{step}</p>
                        {i === activeRoute.steps.length - 1 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[9px] font-black uppercase tracking-tighter">
                            Primary Entry
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 mt-6 border-t border-slate-100">
                  <Button 
                    onClick={() => setSelectedRoute(null)} 
                    variant="outline" 
                    className="w-full text-[10px] font-black uppercase tracking-widest h-12 shadow-sm active:shadow-inner border-slate-200"
                  >
                    Clear Path Calculation
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>

          {/* Quick Access Services */}
          <div className="grid grid-cols-1 gap-4">
            <SecondaryServiceCard icon={<Navigation />} title="Assembly Hub" detail="SV Covered Court" status="OPEN" />
            <SecondaryServiceCard icon={<ShieldAlert />} title="Crisis Point" detail="SV Hall Clinic" status="ACTIVE" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helpers for the Polished Map
function LegendItem({ color, label, dotted = false }: { color: string, label: string, dotted?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    emerald: 'bg-emerald-600',
    indigo: 'bg-indigo-600',
    red: 'bg-red-600',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-500'
  };
  return (
    <div className="flex items-center gap-3 group/leg">
      <div className={cn(
        "w-4 h-4 shadow-sm transition-transform group-hover/leg:scale-110", 
        colors[color], 
        dotted ? "rounded-full opacity-60" : "rounded"
      )} />
      <span className="text-[10px] font-bold text-slate-600 group-hover/leg:text-slate-900 transition-colors tracking-tight">{label}</span>
      {color === 'amber' && <Navigation className="w-2.5 h-2.5 text-amber-600 ml-auto" />}
      {dotted && <div className="ml-auto w-1 h-1 bg-cyan-400 rounded-full animate-ping" />}
    </div>
  );
}

function SecondaryServiceCard({ icon, title, detail, status }: { icon: React.ReactNode, title: string, detail: string, status: string }) {
  return (
    <Card className="p-4 flex gap-4 items-center hover:border-blue-400 transition-all cursor-pointer group hover:shadow-xl active:scale-[0.98] border-transparent bg-slate-50/50">
      <div className="p-3 bg-white text-slate-400 rounded-xl group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-lg transition-all duration-300 border border-slate-100 shadow-sm">
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-[9px] uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">{title}</h4>
          <span className="text-[8px] font-black text-green-700 bg-green-100/50 px-2 py-0.5 rounded-full uppercase">{status}</span>
        </div>
        <p className="text-xs font-black text-slate-800 tracking-tight mt-0.5">{detail}</p>
      </div>
    </Card>
  );
}


function GuidanceView({ onSelect }: { onSelect: (g: any) => void; key?: string }) {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const defaultProtocols = [
      { 
        title: 'Earthquake Action', 
        icon: <Navigation />, 
        color: 'orange', 
        description: 'Drop, Cover, and Hold On. Stay away from windows.',
        checklist: [
          'Drop to your hands and knees.',
          'Cover your head and neck with your arms.',
          'Hold on to any sturdy furniture until shaking stops.',
          'Wait for official all-clear signals.',
          'Evacuate if structural damage is visible.'
        ]
      },
      { 
        title: 'Fire Safety', 
        icon: <ShieldAlert />, 
        color: 'red', 
        description: 'Exit immediately. Use stairs, not elevators.',
        checklist: [
          'Pull the nearest fire alarm if not already active.',
          'Evacuate via the nearest emergency exit.',
          'Do not use elevators under any circumstances.',
          'Assemble at your designated outdoor area.',
          'Wait for fire department clearance.'
        ]
      },
      { 
        title: 'Shelter in Place', 
        icon: <Bell />, 
        color: 'blue', 
        description: 'Lock doors, stay hidden, remains silent.',
        checklist: [
          'Move to a room that can be locked.',
          'Turn off lights and silence all electronics.',
          'Stay away from windows and doors.',
          'Only open the door for verified police identity.',
          'Wait for the "All Clear" message on SafeZone.'
        ]
      },
      { 
        title: 'Medical Support', 
        icon: <Users />, 
        color: 'green', 
        description: 'Identify campus first responders and locations.',
        checklist: [
          'Assess the scene for safety before helping.',
          'Call 911 or Campus Police via Speed Dial.',
          'Check for breathing and pulse.',
          'Apply pressure to any visible bleeding.',
          'Remain with the victim until help arrives.'
        ]
      },
      { 
        title: 'Flood Safety', 
        icon: <Waves />, 
        color: 'blue', 
        description: 'Move to higher ground. Do not walk through floodwaters.',
        checklist: [
          'Move to the highest level of the building immediately.',
          'Do not attempt to cross flooded areas or streets.',
          'Avoid contact with floodwater; it may be contaminated or electrically charged.',
          'Turn off power at the main switch if it is safe to do so.',
          'Strictly follow the directions on the Safety Map for safe zones.'
        ]
      }
    ];

    const loadProtocols = async () => {
      try {
        const q = query(collection(db, 'guidance'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setProtocols(list);
          localStorage.setItem('safezone_guidance_cache', JSON.stringify(list));
        } else {
          // If Firestore is empty, use defaults and cache them
          setProtocols(defaultProtocols);
          localStorage.setItem('safezone_guidance_cache', JSON.stringify(defaultProtocols));
        }
      } catch (e) {
        // Fetch failed (likely offline) - check cache
        setIsOffline(true);
        const cached = localStorage.getItem('safezone_guidance_cache');
        if (cached) {
          setProtocols(JSON.parse(cached));
        } else {
          setProtocols(defaultProtocols);
        }
      }
    };

    loadProtocols();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Safety Protocol</h2>
          <p className="text-slate-500">Expert guidance for common campus emergencies.</p>
        </div>
        {isOffline && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3 h-3" /> Offline Mode Active
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4">
        {protocols.map((cat, i) => (
          <Card key={i} className="p-6 flex flex-col md:flex-row gap-6 hover:border-slate-400 transition-all cursor-pointer group" onClick={() => onSelect(cat)}>
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", `bg-${cat.color}-100 text-${cat.color}-600`)}>
              {cat.icon ? React.cloneElement(cat.icon as React.ReactElement, { className: "w-8 h-8" }) : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{cat.title}</h3>
              <p className="text-slate-600 leading-relaxed">{cat.description}</p>
              <div className="text-sm font-semibold text-blue-600 mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Read full checklist <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function BenchmarkView({}: { key?: string }) {
  const [rating, setRating] = useState(0);
  const [channel, setChannel] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !channel) return;
    try {
      await addDoc(collection(db, 'assessments'), {
        userId: auth.currentUser?.uid,
        alertId: 'global_sample',
        channelType: channel,
        rating,
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Benchmarking</h2>
        <p className="text-slate-500">Helping SafeZone outperform standard emergency channels.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-bold">SafeZone vs Existing Channels</h3>
          <p className="text-sm text-slate-500">Comparing speed, accuracy, and detail across common disaster communication alerts.</p>
          
          <div className="space-y-4">
            <ComparisonBar label="SafeZone" value={95} color="bg-blue-600" />
            <ComparisonBar label="Gov Alerts" value={70} color="bg-slate-400" />
            <ComparisonBar label="SMS Warning" value={60} color="bg-slate-400" />
            <ComparisonBar label="Social Media" value={45} color="bg-slate-400" />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Metrics: Response Lead Time</span>
            <span className="text-xs text-blue-600 font-bold">+12min faster</span>
          </div>
        </Card>

        <Card className="p-8 bg-slate-900 text-white space-y-6">
          {submitted ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
              <h3 className="text-xl font-bold">Thank you for the data!</h3>
              <p className="text-slate-400 text-sm">Your feedback helps improve campus safety.</p>
              <Button variant="outline" onClick={() => setSubmitted(false)} className="text-white border-slate-700">Submit Another</Button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold">Add Your Assessment</h3>
              <p className="text-slate-400 text-sm">Evaluate an alert provider you recently used.</p>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Which channel?</label>
                  <select 
                    value={channel} 
                    onChange={e => setChannel(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Channel</option>
                    <option value="GOVERNMENT">Government Alert</option>
                    <option value="WEATHER_APP">Weather App</option>
                    <option value="SMS">SMS Warning</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                    <option value="SAFEZONE">SafeZone</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Speed & Detail (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button 
                        key={n}
                        onClick={() => setRating(n)}
                        className={cn(
                          "flex-1 py-2 rounded-lg font-bold border-2 transition-all",
                          rating >= n ? "bg-blue-600 border-blue-600 text-white" : "border-slate-800 text-slate-600 hover:border-slate-600 font-normal"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-500 text-lg py-6 mt-4">
                  Contribute Data
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </motion.div>
  );
}

function AdminView({ alerts }: { alerts: Alert[]; key?: string }) {
  const [form, setForm] = useState({ title: '', description: '', type: 'EMERGENCY', severity: 'CRITICAL' });
  const [posting, setPosting] = useState(false);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        ...form,
        campusId: 'main-campus',
        authorId: auth.currentUser?.uid,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setForm({ title: '', description: '', type: 'EMERGENCY', severity: 'CRITICAL' });
    } catch (e) {
      console.error(e);
    }
    setPosting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'alerts', id), {
        isActive: !current,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Control Center</h2>
        <p className="text-slate-500">Authorized personnel only. Broadcast alerts to campus.</p>
      </header>

      <Card className="p-8">
        <form onSubmit={handlePost} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Alert Title</label>
              <input 
                required
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="e.g. Earthquake Detected"
                className="w-full border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Severity</label>
              <select 
                value={form.severity}
                onChange={e => setForm({...form, severity: e.target.value as any})}
                className="w-full border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 border"
              >
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="MODERATE">Moderate</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Message details</label>
            <textarea 
              required
              rows={3}
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Provide specific instructions (e.g. Evacuate to open field)"
              className="w-full border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 border"
            />
          </div>
          <Button type="submit" disabled={posting} className="w-full" variant="danger">
            {posting ? 'Broadcasting...' : 'Broadcast Emergency Alert'}
          </Button>
        </form>
      </Card>

      <section className="space-y-4">
        <h3 className="text-lg font-bold">Manage Alerts</h3>
        <Card className="divide-y divide-slate-100">
          {alerts.map(a => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{a.title}</h4>
                <p className="text-xs text-slate-500">{format(a.createdAt?.toDate() || new Date(), 'MMM d, h:mm a')}</p>
              </div>
              <Button 
                variant={a.isActive ? 'danger' : 'outline'} 
                className="text-xs py-1 px-3"
                onClick={() => toggleActive(a.id, a.isActive)}
              >
                {a.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </div>
          ))}
        </Card>
      </section>
    </motion.div>
  );
}

// --- UI Helpers ---

function StatusPill({ color, label, status }: { color: 'red' | 'green' | 'blue' | 'amber'; label: string; status: string }) {
  const colors = {
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100'
  };
  
  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-lg border", colors[color])}>
      <div className={cn("w-2 h-2 rounded-full", color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-green-500' : 'bg-blue-500')} />
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase opacity-60 tracking-tighter">{label}</span>
        <span className="text-xs font-bold">{status}</span>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: cn("w-5 h-5", active ? "" : "group-hover:scale-110 transition-transform") })}
      <span className="font-medium flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", active ? "bg-white text-blue-600" : "bg-red-500 text-white")}>
          {count}
        </span>
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 min-w-[64px]", active ? "text-blue-600" : "text-slate-400")}>
      <div className={cn("p-1 rounded-lg transition-all", active ? "bg-blue-50" : "")}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function AlertCard({ alert, onAction, onReport }: { alert: Alert; onAction: () => void; onReport: (id: string, type: 'ALERT' | 'USER') => void; key?: string }) {
  const isEmergency = alert.severity === 'CRITICAL' || alert.severity === 'WARNING';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-l-4 p-5 md:p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3 relative overflow-hidden",
        alert.isActive ? (alert.severity === 'CRITICAL' ? "border-l-red-600" : "border-l-orange-500") : "border-l-slate-300 opacity-80"
      )}
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <button 
          onClick={() => onReport(alert.id, 'ALERT')}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
          title="Report Alert"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {alert.isActive && (
        <div className={cn(
          "absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase text-white rounded-bl-lg shadow-sm",
          alert.severity === 'CRITICAL' ? "bg-red-600" : "bg-orange-500"
        )}>
          Live Alert
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
          alert.severity === 'CRITICAL' ? "bg-red-50 text-red-600" : 
          alert.severity === 'WARNING' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
        )}>
          {alert.type === 'EMERGENCY' ? <AlertTriangle /> : alert.type === 'WEATHER' ? <Bell /> : <Info />}
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xl font-bold text-slate-900 leading-tight">{alert.title}</h4>
          <p className="text-sm text-slate-500 font-medium">#{alert.type} • {alert.severity} • {alert.campusId}</p>
        </div>
      </div>

      <p className="text-slate-600 leading-relaxed pl-16">
        {alert.description}
      </p>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between pl-16">
        <span className="text-xs text-slate-400 font-mono">
          {format(alert.createdAt?.toDate() || new Date(), 'h:mm a, MMM d')}
        </span>
        <button 
          onClick={onAction}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline px-2 py-1"
        >
          View Map Routes
        </button>
      </div>
    </motion.div>
  );
}

function EmergencyContact({ label, number, color = 'text-slate-700' }: { label: string; number: string; color?: string }) {
  return (
    <a 
      href={`tel:${number}`}
      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
        <span className={cn("font-bold text-lg", color)}>{number.length <= 4 ? number : number.replace(/(\+\d)(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4')}</span>
      </div>
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
        <Phone className="w-5 h-5 shrink-0" />
      </div>
    </a>
  );
}

function ComparisonBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase text-slate-500 tracking-wider">
        <span>{label}</span>
        <span>{value}% Effective</span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn("h-full rounded-full shadow-inner", color)}
        />
      </div>
    </div>
  );
}
