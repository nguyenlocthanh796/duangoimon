import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TIT_TIT_SOUND_BASE64, SUCCESS_SOUND_BASE64 } from './soundData';
import { usePOSStore } from '../store/usePOSStore';

let ExpoAudio: any = null;
let tapSoundObj: any = null;
let successSoundObj: any = null;
let webAudioCtx: any = null;
let lastTapTime = 0;

if (Platform.OS !== 'web') {
  try {
    ExpoAudio = require('expo-audio');
    if (ExpoAudio?.setAudioModeAsync) {
      ExpoAudio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      }).catch(() => {});
    }
  } catch (_) {}
}

let cachedSoundEnabled = true;
let cachedHapticsEnabled = true;

try {
  if (usePOSStore?.getState) {
    const s = usePOSStore.getState();
    cachedSoundEnabled = s?.storeSettings?.enableSound !== false;
    cachedHapticsEnabled = s?.storeSettings?.enableHaptics !== false;
  }
  if (usePOSStore?.subscribe) {
    usePOSStore.subscribe((state) => {
      if (state?.storeSettings) {
        cachedSoundEnabled = state.storeSettings.enableSound !== false;
        cachedHapticsEnabled = state.storeSettings.enableHaptics !== false;
      }
    });
  }
} catch (_) {}

export function isSoundEnabled(): boolean {
  return cachedSoundEnabled;
}

export function isHapticsEnabled(): boolean {
  return cachedHapticsEnabled;
}

function preloadNativeSounds() {
  if (Platform.OS === 'web') return;
  try {
    if (ExpoAudio?.createAudioPlayer) {
      successSoundObj = ExpoAudio.createAudioPlayer({
        uri: `data:audio/wav;base64,${SUCCESS_SOUND_BASE64}`,
      });
      tapSoundObj = ExpoAudio.createAudioPlayer({
        uri: `data:audio/wav;base64,${TIT_TIT_SOUND_BASE64}`,
      });
    }
  } catch (_) {}
}
preloadNativeSounds();

/**
 * Âm thanh 'tít tít' thanh thoát (0ms Non-Blocking)
 * Web: Web Audio Oscillator 0ms
 * Native: Taptic Engine + expo-audio (hỗ trợ Silent Mode iOS)
 */
export function playTapSound(force = false) {
  const soundActive = force || cachedSoundEnabled;
  const hapticActive = force || cachedHapticsEnabled;

  if (!soundActive && !hapticActive) return;

  // 1. Web Audio (Zero Latency Single Crisp Tap)
  if (soundActive && Platform.OS === 'web' && typeof window !== 'undefined') {
    const nowMs = Date.now();
    if (nowMs - lastTapTime < 45) return;
    lastTapTime = nowMs;

    try {
      if (!webAudioCtx) {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) webAudioCtx = new AudioCtx();
      }
      if (webAudioCtx) {
        if (webAudioCtx.state === 'suspended') {
          webAudioCtx.resume().catch(() => {});
        }
        const now = webAudioCtx.currentTime;
        
        // Single crisp tap tone (2093Hz - C7)
        const osc = webAudioCtx.createOscillator();
        const gain = webAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2093, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
        osc.connect(gain);
        gain.connect(webAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.032);
      }
    } catch (_) {}
    return;
  }

  // 2. Native iOS / Android: Haptics + expo-audio
  if (Platform.OS !== 'web') {
    const now = Date.now();
    if (now - lastTapTime < 35) return;
    lastTapTime = now;

    if (hapticActive) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }

    if (soundActive && tapSoundObj && typeof tapSoundObj.play === 'function') {
      try {
        tapSoundObj.play();
      } catch (_) {}
    }
  }
}

let lastSuccessTime = 0;
export function playSuccessSound(force = false) {
  const soundActive = force || cachedSoundEnabled;
  const hapticActive = force || cachedHapticsEnabled;

  if (!soundActive && !hapticActive) return;

  const now = Date.now();
  if (now - lastSuccessTime < 200) return;
  lastSuccessTime = now;

  if (hapticActive && Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  }

  if (soundActive && Platform.OS !== 'web') {
    try {
      if (successSoundObj && typeof successSoundObj.play === 'function') {
        if (typeof successSoundObj.seekTo === 'function') {
          successSoundObj.seekTo(0).then(() => successSoundObj.play()).catch(() => {});
        } else {
          successSoundObj.play();
        }
      }
    } catch (_) {}
  }
}

let lastChimeTime = 0;
/**
 * Chuông 'Ding-Dong' 2 nốt báo món mới vào bếp/bar (0ms Non-Blocking)
 */
export function playKitchenChime(force = false) {
  const soundActive = force || isSoundEnabled();
  const hapticActive = force || isHapticsEnabled();

  if (!soundActive && !hapticActive) return;

  if (soundActive && Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (!webAudioCtx) {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) webAudioCtx = new AudioCtx();
      }
      if (webAudioCtx) {
        if (webAudioCtx.state === 'suspended') webAudioCtx.resume();
        const now = webAudioCtx.currentTime;

        // Nốt 1: Ding kép hài âm ấm (587.33Hz D5 + 1174.66Hz D6)
        const osc1 = webAudioCtx.createOscillator();
        const osc1b = webAudioCtx.createOscillator();
        const gain1 = webAudioCtx.createGain();
        osc1.type = 'triangle';
        osc1b.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1b.frequency.setValueAtTime(1174.66, now);
        gain1.gain.setValueAtTime(0.45, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.connect(gain1);
        osc1b.connect(gain1);
        gain1.connect(webAudioCtx.destination);
        osc1.start(now);
        osc1b.start(now);
        osc1.stop(now + 0.4);
        osc1b.stop(now + 0.4);

        // Nốt 2: Dong ngân vang cao (880.00Hz A5 + 1760.00Hz A6)
        const osc2 = webAudioCtx.createOscillator();
        const osc2b = webAudioCtx.createOscillator();
        const gain2 = webAudioCtx.createGain();
        osc2.type = 'triangle';
        osc2b.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.14);
        osc2b.frequency.setValueAtTime(1760.00, now + 0.14);
        gain2.gain.setValueAtTime(0.55, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14 + 0.65);
        osc2.connect(gain2);
        osc2b.connect(gain2);
        gain2.connect(webAudioCtx.destination);
        osc2.start(now + 0.14);
        osc2b.start(now + 0.14);
        osc2.stop(now + 0.14 + 0.65);
        osc2b.stop(now + 0.14 + 0.65);
      }
    } catch (_) {}
    return;
  }

  // Native: Dùng haptics + success sound an toàn
  const now = Date.now();
  if (now - lastChimeTime < 300) return;
  lastChimeTime = now;
  playSuccessSound(force);
}

let lastAlarmTime = 0;
/**
 * Chuông báo hết giờ ủ trà / mẻ nấu quầy Bar (3 nốt ngân vang)
 */
export function playBrewAlarmSound(force = false) {
  const soundActive = force || isSoundEnabled();
  const hapticActive = force || isHapticsEnabled();

  if (!soundActive && !hapticActive) return;

  const nowMs = Date.now();
  if (nowMs - lastAlarmTime < 500) return;
  lastAlarmTime = nowMs;

  if (soundActive && Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (!webAudioCtx) {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) webAudioCtx = new AudioCtx();
      }
      if (webAudioCtx) {
        if (webAudioCtx.state === 'suspended') webAudioCtx.resume();
        const now = webAudioCtx.currentTime;

        // C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = webAudioCtx.createOscillator();
          const gain = webAudioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.2, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(webAudioCtx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.35);
        });
      }
    } catch (_) {}
    return;
  }

  // Native
  if (hapticActive && Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  }
  if (soundActive) {
    playSuccessSound(force);
  }
}

export const sound = {
  playTap: playTapSound,
  playSuccess: playSuccessSound,
  playBell: playSuccessSound,
  playKitchenChime: playKitchenChime,
  playBrewAlarm: playBrewAlarmSound,
};
