/**
 * UI sound effects, synthesised in the browser rather than shipped as files.
 *
 * A pick sound fires on nearly every tap, so as files these would be a handful of extra
 * requests and a few hundred KB on a load CrazyGames times — for a click and a shutter
 * snap that WebAudio can draw from a couple of oscillators. It also means no decoding
 * delay: the first tap sounds the same as the hundredth.
 *
 * Everything is built on demand. Browsers hand out a suspended AudioContext until the
 * page has been touched, and the first sound is always a tap, so by the time anything
 * plays the gesture has happened.
 */

let ctx;
let master;
let noise; // one buffer of white noise, reused by every burst
let muted = false;

/** The context is created on the first sound, not at import — see the note above. */
function audio() {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null; // no WebAudio: the game is simply silent, never broken
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5; // effects sit above the music loop but well under a shout
    master.connect(ctx.destination);
  }
  // iOS suspends the context whenever the tab loses focus, and never resumes it alone
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/**
 * One short tone. The gain envelope is what makes it a UI blip rather than a beep:
 * a near-instant attack and an exponential tail, so it reads as a tap of something
 * physical. Exponential ramps can't reach zero, hence the tiny floor.
 */
function tone({ freq, to = freq, dur = 0.08, type = 'triangle', gain = 0.3, delay = 0 }) {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, at + dur);

  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  osc.connect(env).connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/**
 * A burst of filtered noise — the clack of a mechanism, where `tone` gives musical
 * notes. The bandpass is what places it: high and narrow is a shutter blade, lower
 * and wider is a body thud.
 */
function click({ freq = 2400, q = 1.2, dur = 0.045, gain = 0.5, delay = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  const at = ac.currentTime + delay;
  const src = ac.createBufferSource();
  const band = ac.createBiquadFilter();
  const env = ac.createGain();

  src.buffer = noise;
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = q;

  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  src.connect(band).connect(env).connect(master);
  src.start(at);
  src.stop(at + dur + 0.02);
}

export const sfx = {
  /**
   * Silence is applied by refusing to build sounds, not by turning the master down:
   * a muted session then never opens an AudioContext at all, which is what phones
   * want — an idle context still costs battery.
   */
  setMuted(value) {
    muted = value;
    if (muted && ctx?.state === 'running') ctx.suspend().catch(() => {});
  },

  /** Picking a part: a soft two-note lift, the "that one" of the whole game. */
  pick() {
    tone({ freq: 620, to: 930, dur: 0.09, gain: 0.22 });
    tone({ freq: 1240, dur: 0.06, gain: 0.09, delay: 0.05 });
  },

  /** Moving between categories: quieter and flatter than a pick, so it stays background. */
  step() {
    tone({ freq: 440, to: 560, dur: 0.07, type: 'sine', gain: 0.16 });
  },

  /** Finishing the run — the reward chime before the camera unlocks. */
  done() {
    [660, 880, 1320].forEach((freq, i) =>
      tone({ freq, dur: 0.18, type: 'sine', gain: 0.2, delay: i * 0.09 })
    );
  },

  /**
   * The camera. A real shutter is two clacks with a beat between them — the blades
   * opening and closing — over a duller thump from the body, and that gap is what
   * makes it read as a photo instead of a plain click.
   */
  shutter() {
    click({ freq: 3000, q: 1.6, dur: 0.03, gain: 0.55 });
    click({ freq: 1100, q: 0.7, dur: 0.06, gain: 0.3, delay: 0.005 });
    click({ freq: 2400, q: 1.4, dur: 0.05, gain: 0.45, delay: 0.085 });
    tone({ freq: 180, to: 90, dur: 0.09, gain: 0.18, delay: 0.085 });
  },
};
