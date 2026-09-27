import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Wifi, 
  Smartphone, 
  Activity, 
  Bell, 
  Check, 
  ShieldAlert, 
  RefreshCw, 
  Cpu, 
  Database, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Bluetooth, 
  Send,
  HelpCircle,
  Battery
} from 'lucide-react'

// Rajesh Kumar's clinical parameters
const RAJESH_CONTEXT = {
  name: 'Rajesh Kumar',
  age: 62,
  history: 'Two coronary stents, Type-2 Diabetes',
  hba1c: '7.2%',
  glucoseBaseline: { mean: 108, low: 88, high: 128 },
  hrMax: 100, // Beta-blocker limit
}

export default function DeviceSimulator() {
  // Device state
  const [cgmState, setCgmState] = useState('STORAGE') // 'STORAGE' | 'NFC_TAP' | 'WARMUP' | 'MEASURING'
  const [warmupProgress, setWarmupProgress] = useState(0)
  
  // Real-time vital sliders
  const [glucose, setGlucose] = useState(105)
  const [heartRate, setHeartRate] = useState(72)
  const [spo2, setSpo2] = useState(98)
  const [skinTemp, setSkinTemp] = useState(36.5)
  const [steps, setSteps] = useState(4230)
  const [sleepStage, setSleepStage] = useState('Light')

  // Battery and runtime simulations
  const [cgmBattery, setCgmBattery] = useState(100)
  const [cgmDaysLeft, setCgmDaysLeft] = useState(14)
  const [bandBattery, setBandBattery] = useState(92)
  const [isCharging, setIsCharging] = useState(false)

  // Simulation controls
  const [logs, setLogs] = useState([])
  const [soundOn, setSoundOn] = useState(false)
  const [hapticPulse, setHapticPulse] = useState(false)
  const [familyAlerts, setFamilyAlerts] = useState([])
  const [nfcRipple, setNfcRipple] = useState(false)
  const [bleConnection, setBleConnection] = useState(false)

  const consoleEndRef = useRef(null)

  // Add logger function
  const addLog = (tag, message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newLog = { timestamp, tag, message, type };
    setLogs(prev => [...prev, newLog].slice(-100)); // Keep last 100 logs
  };

  // Scroll to bottom of developer console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Log system initialization
  useEffect(() => {
    addLog('SYSTEM', 'Initialized SimpleMed Wearable Simulator.', 'system');
    addLog('CGM-HW', 'nRF52832 powered down in System OFF sleep mode (0.3 µA leakage).', 'hardware');
    addLog('BAND-HW', 'nRF52840 active. Sensors initialized. OLED panel in sleep.', 'hardware');
  }, []);

  // CGM Warm-up simulation timer
  useEffect(() => {
    let interval = null;
    if (cgmState === 'WARMUP') {
      addLog('CGM-FW', 'TI AFE4900 polarizing microneedle biosensor electrodes...', 'firmware');
      interval = setInterval(() => {
        setWarmupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCgmState('MEASURING');
            setBleConnection(true);
            addLog('CGM-FW', 'Electrochemical polarization complete. Sensor stabilized.', 'firmware');
            addLog('CGM-BLE', 'nRF52832 starting advertising (GATT Custom Service 0D4E0001).', 'ble');
            addLog('APP-BLE', 'MediSimple App paired with SimpleMed CGM. Sync active.', 'app');
            return 100;
          }
          const next = prev + 20;
          addLog('CGM-HW', `Stabilization progress: ${next}% (AFE ADC stabilization check)`, 'hardware');
          return next;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [cgmState]);

  // Periodic sensor telemetry (simulates GATT notify)
  useEffect(() => {
    if (cgmState !== 'MEASURING' && !bleConnection) return;

    const interval = setInterval(() => {
      // Periodic glucose check & notify (in real device, every 5 mins. Simulated here every 8s)
      if (cgmState === 'MEASURING') {
        const sensorCurrentNanoAmps = (glucose * 0.12).toFixed(2);
        addLog('CGM-HW', `AFE4900 ADC measure: Amperometric current = ${sensorCurrentNanoAmps} nA`, 'hardware');
        addLog(
          'CGM-BLE', 
          `TX Notification UUID 0D4E0002 -> Glucose: ${glucose} mg/dL, Bat: ${cgmBattery}%`, 
          'ble'
        );
        evaluateVitals('glucose', glucose);
      }

      // Wristband heart rate/SpO2 check (simulated here every 8s, real device every 1m)
      addLog(
        'BAND-BLE', 
        `TX Notification UUID 8C6F0002 -> HR: ${heartRate} bpm, SpO2: ${spo2}%, Temp: ${skinTemp}°C, Steps: ${steps}`, 
        'ble'
      );
      evaluateVitals('heart_rate', heartRate);
      evaluateVitals('spo2', spo2);

      // Simulate step counting
      setSteps(prev => prev + Math.floor(Math.random() * 3));
    }, 8000);

    return () => clearInterval(interval);
  }, [cgmState, bleConnection, glucose, heartRate, spo2, skinTemp, steps]);

  // Immediate evaluation when user moves the sliders
  useEffect(() => {
    if (cgmState === 'MEASURING') {
      evaluateVitals('glucose', glucose);
    }
    evaluateVitals('heart_rate', heartRate);
    evaluateVitals('spo2', spo2);
    evaluateVitals('skin_temp', skinTemp);
  }, [glucose, heartRate, spo2, skinTemp]);

  // Vitals Baseline Alert Evaluator (The personal baseline AI Engine)
  const evaluateVitals = (metric, value) => {
    // 1. Supabase Insertion Log
    addLog('SUPABASE', `INSERT INTO vital_readings (glucose: ${metric === 'glucose' ? value : 'NULL'}, hr: ${metric === 'heart_rate' ? value : 'NULL'})`, 'database');

    // 2. Personal Baseline evaluation logic
    if (metric === 'glucose') {
      if (value > RAJESH_CONTEXT.glucoseBaseline.high) {
        triggerAlert('GLUCOSE_HIGH', `Rajesh's glucose of ${value} mg/dL is ABOVE his personal baseline high (128 mg/dL).`);
      } else if (value < RAJESH_CONTEXT.glucoseBaseline.low) {
        triggerAlert('GLUCOSE_LOW', `Rajesh's glucose of ${value} mg/dL is BELOW his personal baseline low (88 mg/dL).`);
      } else {
        clearAlert('GLUCOSE');
      }
    }

    if (metric === 'heart_rate') {
      if (value > RAJESH_CONTEXT.hrMax) {
        triggerAlert('HR_HIGH', `Rajesh's HR of ${value} bpm exceeds safety cap of 100 bpm (stent/beta-blocker limit).`);
      } else {
        clearAlert('HR');
      }
    }

    if (metric === 'spo2') {
      if (value < 90) {
        triggerAlert('SPO2_CRIT', `Critical blood oxygen drop detected: ${value}% SpO2.`);
      } else if (value < 95) {
        triggerAlert('SPO2_LOW', `Mild blood oxygen desaturation: ${value}% SpO2.`);
      } else {
        clearAlert('SPO2');
      }
    }
  };

  const [activeAlerts, setActiveAlerts] = useState({});

  const triggerAlert = (code, desc) => {
    if (activeAlerts[code]) return; // Already active

    setActiveAlerts(prev => ({ ...prev, [code]: desc }));
    addLog('AI-ENGINE', `⚠️ ALERT TRIGGERED: ${desc}`, 'alert');
    
    // Trigger Band Haptic Alert via BLE Write
    addLog('APP-BLE', `BLE WRITE UUID 8C6F0003 -> Alert Type ID: ${code.startsWith('GLUCOSE') ? '0x01' : '0x03'}, Haptic Pattern: StrongPulse`, 'ble');
    setHapticPulse(true);

    if (soundOn) {
      playBeep();
    }

    // Trigger push notification simulation to family members in family_access
    const newFamilyNotification = {
      id: Date.now(),
      recipient: 'Amit Kumar (Son)',
      relation: 'Primary Caregiver',
      message: `🚨 MediSimple Alert: Rajesh Kumar's ${code.includes('GLUCOSE') ? 'glucose is ' + glucose + ' mg/dL (baseline 88-128)' : 'heart rate is ' + heartRate + ' bpm (limit 100)'}. Action needed!`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setFamilyAlerts(prev => [newFamilyNotification, ...prev]);
    addLog('SUPABASE', 'QUERY family_access WHERE patient_id = RAJESH_KUMAR -> Sent FCM Push Notification.', 'database');
  };

  const clearAlert = (prefix) => {
    setActiveAlerts(prev => {
      const keys = Object.keys(prev).filter(k => k.startsWith(prefix));
      if (keys.length === 0) return prev;
      const next = { ...prev };
      keys.forEach(k => delete next[k]);
      addLog('AI-ENGINE', `Resolved ${prefix} alert state. Back to normal baseline.`, 'info');
      setHapticPulse(false);
      return next;
    });
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880; // High tone
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('AudioContext beep blocked by browser permissions.', e);
    }
  };

  // Perform NFC tap simulation
  const handleNfcTap = () => {
    if (cgmState !== 'STORAGE') return;
    setNfcRipple(true);
    setCgmState('NFC_TAP');
    addLog('NFC-HW', 'NFC 13.56MHz coil induced magnetic coupling.', 'hardware');
    addLog('CGM-FW', 'Wake-up interrupt fired via nRF52832 NFCT module.', 'firmware');
    
    setTimeout(() => {
      setNfcRipple(false);
      setCgmState('WARMUP');
      addLog('APP-NFC', 'NFC Handshake successful. Device ID and Key exchanged.', 'app');
    }, 1200);
  };

  // Preset scenarios to help user test the dashboard
  const loadScenario = (type) => {
    addLog('SYSTEM', `Loading preset clinical scenario: ${type.toUpperCase()}`, 'system');
    if (type === 'resting') {
      setGlucose(105);
      setHeartRate(68);
      setSpo2(98);
      setSkinTemp(36.5);
      setSleepStage('Light');
    } else if (type === 'glucose_spike') {
      setGlucose(185); // High spike
      setHeartRate(78);
      setSpo2(97);
      setSkinTemp(36.6);
      setSleepStage('Awake');
    } else if (type === 'cardiac_spike') {
      setGlucose(110);
      setHeartRate(112); // Exceeds beta-blocked limit of 100
      setSpo2(95);
      setSkinTemp(37.1);
      setSleepStage('Awake');
    } else if (type === 'hypoxia') {
      setGlucose(95);
      setHeartRate(85);
      setSpo2(87); // Critical SpO2 drop
      setSkinTemp(36.2);
    }
  };

  return (
    <div className="page min-h-screen bg-slate-900 text-slate-100 pb-safe pt-14">
      {/* custom navigation bar */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">💊</span>
            <span className="font-bold text-lg text-emerald-400">MediSimple App</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-mono">Patient Profile: Rajesh Kumar (62, Cardiac)</span>
            <Link to="/connect-device" className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-emerald-400">
              ← Back to Connections
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Hardware Mockup Panels (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[10px] font-mono uppercase px-3 py-1 rounded-bl-lg">
              Hardware: Device 1
            </div>
            
            <h2 className="text-md font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Cpu size={16} className="text-cyan-400" />
              SimpleMed CGM Patch
            </h2>
            <p className="text-xs text-slate-400 mb-4">Continuous Glucose Monitor (35mm Upper Arm Patch)</p>

            {/* Rendered Physical CGM Device */}
            <div className="flex flex-col items-center py-6 bg-slate-900/50 rounded-xl border border-slate-800 relative">
              
              {/* Arm/Adhesive Patch Backing */}
              <div className="w-40 h-40 rounded-full bg-amber-500/5 border-2 border-dashed border-amber-600/30 flex items-center justify-center relative">
                
                {/* CGM Main Dome Body */}
                <button 
                  onClick={handleNfcTap}
                  disabled={cgmState !== 'STORAGE'}
                  className={`w-28 h-28 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all duration-300 relative border border-slate-700/50
                    ${cgmState === 'STORAGE' ? 'bg-slate-800 cursor-pointer hover:bg-slate-700 active:scale-95' : 'bg-slate-900'}
                  `}
                >
                  {/* Glowing LED status light */}
                  <div className={`w-3 h-3 rounded-full absolute top-4 transition-all duration-500
                    ${cgmState === 'STORAGE' ? 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.8)]' : ''}
                    ${cgmState === 'NFC_TAP' ? 'bg-blue-500 animate-ping' : ''}
                    ${cgmState === 'WARMUP' ? 'bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.9)]' : ''}
                    ${cgmState === 'MEASURING' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-pulse' : ''}
                  `} />

                  {/* NFC coil visual */}
                  {nfcRipple && (
                    <div className="absolute inset-0 border-4 border-blue-400/50 rounded-full animate-ping" />
                  )}

                  {/* Text on device */}
                  <div className="text-center px-3 mt-2">
                    <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">SimpleMed</span>
                    <p className="text-xs font-bold text-slate-200 mt-1">
                      {cgmState === 'STORAGE' && 'Tap with Phone'}
                      {cgmState === 'NFC_TAP' && 'Pairing...'}
                      {cgmState === 'WARMUP' && `Warm-up ${warmupProgress}%`}
                      {cgmState === 'MEASURING' && `${glucose} mg/dL`}
                    </p>
                    {cgmState === 'MEASURING' && (
                      <span className="text-[9px] text-emerald-400 font-mono font-bold block mt-0.5">BLE 5.0 Broadcast</span>
                    )}
                  </div>
                </button>
              </div>

              {/* NFC Sensor Tap Overlay */}
              {cgmState === 'STORAGE' && (
                <button
                  onClick={handleNfcTap}
                  className="mt-4 flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-lg active:scale-95 transition-transform"
                >
                  <Smartphone size={14} />
                  Simulate NFC Phone Tap
                </button>
              )}

              {cgmState === 'WARMUP' && (
                <div className="mt-4 w-4/5 text-center">
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${warmupProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-amber-400 mt-2 font-medium">Stabilizing biosensor (2-hour medical delay simulated)</p>
                </div>
              )}

              {cgmState === 'MEASURING' && (
                <div className="mt-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Battery size={13} className="text-emerald-400" /> {cgmBattery}%
                    </span>
                    <span>14 Days Left</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tech details panel */}
            <div className="mt-4 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1 text-slate-400">
              <p><strong className="text-slate-300">Core MCU:</strong> Nordic nRF52832 (Cortex-M4F)</p>
              <p><strong className="text-slate-300">Analog Front End:</strong> TI AFE4900</p>
              <p><strong className="text-slate-300">Bio-sensing:</strong> 3-Electrode Electrochemical</p>
              <p><strong className="text-slate-300">Waterproofing:</strong> IP68 Submersible</p>
            </div>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[10px] font-mono uppercase px-3 py-1 rounded-bl-lg">
              Hardware: Device 2
            </div>
            
            <h2 className="text-md font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Activity size={16} className="text-pink-400" />
              MediSimple Band
            </h2>
            <p className="text-xs text-slate-400 mb-4">Sleek Physiological Wristband (Slim Silicon Strap)</p>

            {/* Rendered Physical Wristband Screen */}
            <div className="flex flex-col items-center py-6 bg-slate-900/50 rounded-xl border border-slate-800 relative">
              
              {/* Wristband strap representation */}
              <div className="w-20 h-44 bg-slate-850 rounded-3xl border border-slate-700/60 p-1 flex flex-col justify-between items-center relative">
                
                {/* Wristband Core display bezel */}
                <div className={`w-18 h-32 rounded-2xl bg-black border-2 border-slate-800 p-2 flex flex-col justify-between items-center relative overflow-hidden transition-all duration-300
                  ${hapticPulse ? 'ring-4 ring-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-bounce' : ''}
                `}>
                  {/* Bluetooth Icon */}
                  <div className="flex justify-between w-full text-[8px] font-mono text-slate-500 px-1 pt-0.5">
                    <Bluetooth size={10} className={bleConnection ? 'text-cyan-400' : 'text-slate-600'} />
                    <span className="flex items-center gap-0.5">
                      <Battery size={9} /> {bandBattery}%
                    </span>
                  </div>

                  {/* OLED OLED Screen Screen Screen */}
                  <div className="flex-1 w-full flex flex-col items-center justify-center text-center py-1">
                    {/* Flashing spike haptic notification */}
                    {hapticPulse ? (
                      <div className="animate-pulse space-y-1.5">
                        <span className="text-[10px] font-black text-rose-500 tracking-wider">⚠️ SPIKE ALERT</span>
                        <div className="text-lg font-black text-rose-500 font-mono leading-none">
                          {activeAlerts['GLUCOSE_HIGH'] && `${glucose} mg/dL`}
                          {activeAlerts['HR_HIGH'] && `${heartRate} bpm`}
                          {activeAlerts['SPO2_CRIT'] && `O2: ${spo2}%`}
                        </div>
                        <span className="text-[8px] text-rose-400 uppercase font-bold">Vibrating 170Hz</span>
                      </div>
                    ) : (
                      // Default Large Text Display
                      <div className="space-y-1 font-mono">
                        <div className="text-xl font-bold text-cyan-400 leading-none">
                          {cgmState === 'MEASURING' ? `${glucose}` : '--'}
                        </div>
                        <div className="text-[8px] text-slate-500 uppercase tracking-widest leading-none">mg/dL Glucose</div>
                        
                        <div className="h-0.5 w-8 bg-slate-800 mx-auto my-1" />
                        
                        <div className="flex justify-center items-center gap-1.5 text-xs">
                          <span className="text-rose-500 font-bold">❤️ {heartRate}</span>
                          <span className="text-emerald-400 font-bold">🌡️ {skinTemp}°</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom touch dot */}
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1" />
                </div>
              </div>

              {/* Haptic / Vibration simulation alert feedback */}
              {hapticPulse && (
                <div className="mt-4 flex flex-col items-center text-center">
                  <span className="text-xs font-mono text-rose-400 flex items-center gap-1 animate-pulse">
                    <Bell size={12} className="animate-bounce" /> 
                    * LRA Haptic Vibration Active *
                  </span>
                  <p className="text-[9px] text-slate-400 max-w-[200px] mt-1">
                    Simulating a deep resonant 170Hz haptic pulse for elderly tactile detection.
                  </p>
                </div>
              )}
            </div>

            {/* Tech details panel */}
            <div className="mt-4 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1 text-slate-400">
              <p><strong className="text-slate-300">Core MCU:</strong> Nordic nRF52840 (Cortex-M4F)</p>
              <p><strong className="text-slate-300">Sensors:</strong> MAX30102 (PPG), BMI270, TMP117</p>
              <p><strong className="text-slate-300">Haptics:</strong> 8mm LRA Vibrator + DRV2605L</p>
              <p><strong className="text-slate-300">Waterproofing:</strong> IP67 Swim-proof</p>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Interactive Sliders & Clinical Scenarios (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Preset Clinical Scenarios */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
              <Sliders size={16} className="text-emerald-400" />
              Clinical Preset Scenarios
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Test how Rajesh's personal AI baseline and the wearables respond under different cardiac/diabetic events.
            </p>

            <div className="space-y-2">
              <button 
                onClick={() => loadScenario('resting')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-900 hover:bg-slate-850 p-3 rounded-lg border border-slate-800 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-200">🟢 Normal Resting State</p>
                  <p className="text-[10px] text-slate-400">Stable glucose, HR in beta-blocked range</p>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded">Select</span>
              </button>

              <button 
                onClick={() => loadScenario('glucose_spike')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-900 hover:bg-slate-850 p-3 rounded-lg border border-slate-800 transition-colors"
              >
                <div>
                  <p className="font-bold text-amber-400">🔴 Post-Meal Glucose Spike</p>
                  <p className="text-[10px] text-slate-400">Glucose exceeds Rajesh's 128 mg/dL limit</p>
                </div>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-900 px-2 py-0.5 rounded">Select</span>
              </button>

              <button 
                onClick={() => loadScenario('cardiac_spike')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-900 hover:bg-slate-850 p-3 rounded-lg border border-slate-800 transition-colors"
              >
                <div>
                  <p className="font-bold text-rose-500">❤️ Coronary Stress / Tachycardia</p>
                  <p className="text-[10px] text-slate-400">Heart rate exceeds Rajesh's safety ceiling (100 bpm)</p>
                </div>
                <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-900 px-2 py-0.5 rounded">Select</span>
              </button>

              <button 
                onClick={() => loadScenario('hypoxia')}
                className="w-full flex items-center justify-between text-left text-xs bg-slate-900 hover:bg-slate-850 p-3 rounded-lg border border-slate-800 transition-colors"
              >
                <div>
                  <p className="font-bold text-blue-400">🔵 Sleep Desaturation (SpO2 Drop)</p>
                  <p className="text-[10px] text-slate-400">Oxygen drops to 87% during sleep stages</p>
                </div>
                <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded">Select</span>
              </button>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-1.5">
              <Sliders size={16} className="text-cyan-400" />
              Manual Sensor Controls
            </h3>

            <div className="space-y-5">
              {/* Glucose Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">🩸 Interstitial Glucose</span>
                  <span className="font-mono text-cyan-400 font-bold">{glucose} mg/dL</span>
                </div>
                <input 
                  type="range" min="40" max="400" 
                  value={glucose} 
                  onChange={e => setGlucose(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>40 (Hypo)</span>
                  <span className="text-emerald-400 font-bold">Rajesh's Baseline: 88-128</span>
                  <span>400 (Hyper)</span>
                </div>
              </div>

              {/* Heart Rate Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">❤️ Heart Rate (PPG)</span>
                  <span className="font-mono text-rose-500 font-bold">{heartRate} bpm</span>
                </div>
                <input 
                  type="range" min="40" max="140" 
                  value={heartRate} 
                  onChange={e => setHeartRate(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>40 (Bradycardia)</span>
                  <span className="text-emerald-400 font-bold">Max Limit: 100 bpm</span>
                  <span>140 (Tachycardia)</span>
                </div>
              </div>

              {/* SpO2 Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">💫 Oxygen Saturation (SpO2)</span>
                  <span className="font-mono text-sky-400 font-bold">{spo2}%</span>
                </div>
                <input 
                  type="range" min="80" max="100" 
                  value={spo2} 
                  onChange={e => setSpo2(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>80% Critical</span>
                  <span>95% Normal Limit</span>
                  <span>100% Full</span>
                </div>
              </div>

              {/* Skin Temp Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">🌡️ Skin Temperature</span>
                  <span className="font-mono text-amber-500 font-bold">{skinTemp}°C</span>
                </div>
                <input 
                  type="range" min="34" max="40" step="0.1" 
                  value={skinTemp} 
                  onChange={e => setSkinTemp(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>34.0°C (Cold)</span>
                  <span>36.5°C Normal</span>
                  <span>40.0°C (Fever)</span>
                </div>
              </div>
            </div>
            
            {/* Audio Toggle */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
              <span>Audible Alarm Tone:</span>
              <button 
                onClick={() => setSoundOn(!soundOn)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors
                  ${soundOn ? 'bg-emerald-950 text-emerald-400 border-emerald-900' : 'bg-slate-900 text-slate-400 border-slate-800'}
                `}
              >
                {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {soundOn ? 'Audio Enabled' : 'Muted'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Mobile App Sync Mockup & Dev Logs Console (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* MediSimple Mobile App Dashboard View */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl relative">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Smartphone size={15} className="text-emerald-400" />
              MediSimple App (Rajesh Kumar)
            </h3>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-850 space-y-4">
              
              {/* Patient header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Rajesh Kumar</h4>
                  <p className="text-[10px] text-slate-400">62 Y/O · Stent Recipient · HbA1c 7.2%</p>
                </div>
                <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900 px-2 py-0.5 rounded-full font-bold">
                  Cardiac Alert Active
                </span>
              </div>

              {/* Personal baseline card */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">AI Engine Calibrated Baseline</span>
                <div className="flex justify-between items-center mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400">Glucose (18 Lab Reports):</span>
                    <p className="font-bold text-slate-200">88 – 128 mg/dL</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Beta-Blocker HR Cap:</span>
                    <p className="font-bold text-slate-200">100 bpm</p>
                  </div>
                </div>
              </div>

              {/* Live sync vital display cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-center">
                  <span className="text-xs">🩸 Glucose</span>
                  <p className={`text-lg font-mono font-bold mt-1 
                    ${cgmState === 'MEASURING' 
                      ? (glucose > 128 || glucose < 88 ? 'text-rose-500' : 'text-emerald-400')
                      : 'text-slate-500'
                    }
                  `}>
                    {cgmState === 'MEASURING' ? `${glucose} mg/dL` : 'Offline'}
                  </p>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-center">
                  <span className="text-xs">❤️ Heart Rate</span>
                  <p className={`text-lg font-mono font-bold mt-1 
                    ${heartRate > 100 ? 'text-rose-500' : 'text-emerald-400'}
                  `}>
                    {heartRate} bpm
                  </p>
                </div>
              </div>

              {/* Dynamic Warning Banners on Phone app */}
              {Object.keys(activeAlerts).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(activeAlerts).map(([code, desc]) => (
                    <div key={code} className="bg-rose-950/30 border border-rose-900 rounded-lg p-3 flex gap-2.5 text-xs text-rose-200 items-start">
                      <ShieldAlert size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Spike Limit Breached</p>
                        <p className="text-[10px] text-rose-300/80 leading-relaxed mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Family access table sync notifications logs */}
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Family Alert Notifications</span>
                <div className="space-y-1.5 mt-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {familyAlerts.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic text-center py-2 bg-slate-950/30 rounded border border-slate-850">
                      No notifications sent.
                    </p>
                  ) : (
                    familyAlerts.map(a => (
                      <div key={a.id} className="bg-slate-950/60 p-2 rounded border border-slate-850 text-[10px] flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-slate-300">To: {a.recipient} ({a.relation})</p>
                          <p className="text-slate-400 mt-0.5 leading-snug">{a.message}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">{a.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Dev UART BLE log console */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col h-[280px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Database size={15} className="text-indigo-400" />
              GATT BLE & Database Console Log
            </h3>
            
            <div className="flex-1 bg-slate-900 rounded-xl p-3 border border-slate-850 font-mono text-[9px] overflow-y-auto space-y-1 select-text">
              {logs.map((log, index) => (
                <div key={index} className="leading-relaxed flex items-start gap-1.5">
                  <span className="text-slate-600 flex-shrink-0">{log.timestamp}</span>
                  <span className={`font-bold flex-shrink-0
                    ${log.tag === 'SYSTEM' ? 'text-purple-400' : ''}
                    ${log.tag.startsWith('CGM') ? 'text-cyan-400' : ''}
                    ${log.tag.startsWith('BAND') ? 'text-pink-400' : ''}
                    ${log.tag === 'SUPABASE' ? 'text-emerald-500' : ''}
                    ${log.tag === 'AI-ENGINE' ? 'text-rose-500' : ''}
                    ${log.tag.startsWith('APP') ? 'text-indigo-400' : ''}
                  `}>
                    [{log.tag}]
                  </span>
                  <span className={`
                    ${log.type === 'alert' ? 'text-rose-400 font-semibold' : 'text-slate-300'}
                    ${log.type === 'ble' ? 'text-blue-200' : ''}
                    ${log.type === 'database' ? 'text-emerald-300' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>

        </div>

      </div>

      {/* Info card footer with descriptions */}
      <div className="max-w-7xl mx-auto px-4 pb-12 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400 text-xs leading-relaxed">
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
          <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1">
            <span className="text-amber-500">1</span> BLE GATT Specifications
          </h4>
          <p>
            The CGM notifies glucose data via UUID <code className="text-cyan-400">0D4E0002</code>, packaging epoch timestamp and values in an 8-byte package. 
            The Band streams vitals metrics to database UUID <code className="text-pink-400">8C6F0002</code> every 1 minute.
          </p>
        </div>
        
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
          <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1">
            <span className="text-amber-500">2</span> Personal AI Baseline Algorithm
          </h4>
          <p>
            Rajesh's personal baseline high of 128 mg/dL is loaded into the app. When readings hit 129+ or his HR hits 101+ bpm (safety margins), 
            the app triggers a DB function mapping contacts to dispatch alerts to his son, Amit Kumar.
          </p>
        </div>

        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
          <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1">
            <span className="text-amber-500">3</span> LRA Haptic Driver (DRV2605)
          </h4>
          <p>
            Alerts write to the Band characteristic UUID <code className="text-indigo-400">8C6F0003</code>, triggering the DRV2605 haptic IC to activate a deep, 
            repetitive 170Hz LRA vibration, ensuring immediate awareness even for patients with aged skin.
          </p>
        </div>
      </div>
    </div>
  )
}
