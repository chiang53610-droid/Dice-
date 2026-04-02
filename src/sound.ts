let audioCtx: AudioContext | null = null;
const diceBuffers: AudioBuffer[] = [];
let iosUnlocked = false;

async function preloadSounds() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (typeof window === 'undefined' || !AudioContextClass) return;

  try {
    audioCtx = new AudioContextClass();

    const filePaths = ['/sounds/dice-1.mp3', '/sounds/dice-2.mp3', '/sounds/dice-3.mp3'];

    const fetchPromises = filePaths.map(path => fetch(path).then(res => res.arrayBuffer()));
    const arrayBuffers = await Promise.all(fetchPromises);

    if (!audioCtx) return;

    const decodePromises = arrayBuffers.map(buffer => audioCtx!.decodeAudioData(buffer));
    const decoded = await Promise.all(decodePromises);

    diceBuffers.push(...decoded);
  } catch (error) {
    console.error('Error preloading dice sounds:', error);
  }
}

// Unlock iOS audio on first user interaction (must be inside a user gesture)
function unlockIOSAudio() {
  if (iosUnlocked || !audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  try {
    const src = audioCtx.createBufferSource();
    src.buffer = audioCtx.createBuffer(1, 1, 22050);
    src.connect(audioCtx.destination);
    src.start(0);
  } catch (_) {}
  iosUnlocked = true;
}

document.addEventListener('touchstart', unlockIOSAudio, { once: true });
document.addEventListener('touchend', unlockIOSAudio, { once: true });
document.addEventListener('click', unlockIOSAudio, { once: true });

preloadSounds();

export async function playDiceRattle(durationSec = 1.5): Promise<void> {
  if (!audioCtx) {
     const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
     if (typeof window !== 'undefined' && AudioContextClass) {
         audioCtx = new AudioContextClass();
         if (diceBuffers.length === 0) {
             preloadSounds();
         }
     }
     return;
  }

  // Ensure the context is resumed (required after a user gesture on iOS)
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Abort if buffers haven't finished loading yet
  if (diceBuffers.length === 0) {
      console.warn("Dice sounds still decoding/loading, skipping playback this frame.");
      return;
  }

  const now = audioCtx.currentTime;

  // Master volume node
  const master = audioCtx.createGain();
  master.gain.value = 1.0;
  master.connect(audioCtx.destination);

  // Fade out smoothly at the end of the specified duration
  master.gain.setValueAtTime(1.0, Math.max(now, now + durationSec - 0.1));
  master.gain.linearRampToValueAtTime(0.001, now + durationSec);

  // Schedule overlapping random dice clatters
  let t = 0;
  while (t < durationSec) {
    // 2 to 4 collisions per interval (simulating 5 dice)
    const numHits = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numHits; i++) {
        const jitter = Math.random() * 0.02; // Stagger hits slightly
        const hitTime = now + t + jitter;

        // Skip scheduling past our fade-out boundary
        if (hitTime > now + durationSec - 0.05) continue;

        const buffer = diceBuffers[Math.floor(Math.random() * diceBuffers.length)];
        
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        
        // Pitch shift: random between 0.8 and 1.3
        src.playbackRate.value = 0.8 + Math.random() * 0.5;

        // Random gain: simulate hard wall hits vs soft clicks (0.3 to 1.0)
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.3 + Math.random() * 0.7;

        // Random stereo panning: -0.3 to 0.3
        const panner = audioCtx.createStereoPanner();
        panner.pan.value = (Math.random() * 0.6) - 0.3;

        // Connect graph
        src.connect(gainNode).connect(panner).connect(master);
        
        // Start playback exactly at hitTime
        src.start(hitTime);
    }

    // Interval before next cluster of collisions (40ms to 120ms)
    t += 0.04 + Math.random() * 0.08;
  }
}
