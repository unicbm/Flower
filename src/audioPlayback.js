function createImpulseResponse(context, duration = 2.6, decay = 2.8) {
  const length = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const output = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const envelope = (1 - index / length) ** decay;
      output[index] = (Math.random() * 2 - 1) * envelope;
    }
  }

  return impulse;
}

function createNoiseBuffer(context) {
  const length = Math.floor(context.sampleRate * 0.06);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const output = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    output[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  return buffer;
}

function createPianoWave(context) {
  const partialCount = 24;
  const real = new Float32Array(partialCount);
  const imag = new Float32Array(partialCount);

  for (let partial = 1; partial < partialCount; partial += 1) {
    const brightness = 1 / partial ** 1.18;
    const color = partial <= 4 ? 1 : partial <= 10 ? 0.72 : 0.34;
    imag[partial] = brightness * color;
  }

  return context.createPeriodicWave(real, imag, {
    disableNormalization: false,
  });
}

function noteDurationToSeconds(durationBeats, tempo, hand) {
  const beatSeconds = 60 / tempo;
  const sustain = hand === "left" ? 1.55 : 1.3;
  return Math.max(0.22, durationBeats * beatSeconds * sustain);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function stopSources(sources) {
  sources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // Ignore already-ended sources.
    }
  });
}

function detuneSpreadForMidi(midi) {
  if (midi < 52) {
    return [-4.2, 0, 3.6];
  }
  if (midi < 72) {
    return [-5.8, 0, 6.1];
  }
  return [-7.5, 0, 7.8];
}

function panForMidi(midi) {
  return clamp((midi - 60) / 26, -0.58, 0.58);
}

function createBodyFilters(context, frequency, destination, startAt) {
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.Q.value = 0.6;
  lowpass.frequency.setValueAtTime(Math.min(5200, frequency * 6.5), startAt);
  lowpass.frequency.exponentialRampToValueAtTime(
    Math.max(1200, frequency * 2.2),
    startAt + 0.38,
  );

  const body = context.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = Math.min(980, Math.max(180, frequency * 2.4));
  body.Q.value = 0.95;
  body.gain.value = 3.2;

  lowpass.connect(body);
  body.connect(destination);
  return lowpass;
}

function scheduleHammer(context, noiseBuffer, when, destination, frequency, velocity) {
  const hammer = context.createBufferSource();
  hammer.buffer = noiseBuffer;

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = Math.min(1800, Math.max(320, frequency * 0.9));

  const bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = Math.min(5600, Math.max(900, frequency * 5.8));
  bandpass.Q.value = 1.3;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.002, velocity * 0.16), when + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);

  hammer.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(destination);
  hammer.start(when);
  hammer.stop(when + 0.065);
  return [hammer];
}

function scheduleStringOscillators(context, pianoWave, frequency, when, stopAt, input, velocity, midi) {
  const detunes = detuneSpreadForMidi(midi);
  const nodes = [];

  detunes.forEach((detune, index) => {
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(pianoWave);
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.detune.setValueAtTime(detune, when);

    const gain = context.createGain();
    const baseLevel = velocity * (index === 1 ? 0.22 : 0.12);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(baseLevel, when + 0.009);
    gain.gain.exponentialRampToValueAtTime(baseLevel * 0.32, when + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(input);
    oscillator.start(when);
    oscillator.stop(stopAt);
    nodes.push(oscillator);
  });

  return nodes;
}

function scheduleResonance(context, frequency, when, stopAt, destination, velocity) {
  const overtones = [
    { ratio: 2, gain: 0.03, q: 1.4 },
    { ratio: 3, gain: 0.018, q: 1.7 },
    { ratio: 4.1, gain: 0.012, q: 2.2 },
  ];
  const nodes = [];

  overtones.forEach((overtone) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * overtone.ratio, when);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(velocity * overtone.gain, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = Math.min(7800, frequency * overtone.ratio);
    filter.Q.value = overtone.q;

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(stopAt);
    nodes.push(oscillator);
  });

  return nodes;
}

export function createMelodyPlayer({ onStateChange } = {}) {
  let context = null;
  let compressor = null;
  let masterGain = null;
  let reverb = null;
  let wetGain = null;
  let dryGain = null;
  let noiseBuffer = null;
  let pianoWave = null;
  let activeSources = [];
  let endTimer = null;
  let disposed = false;

  function setPlaying(value) {
    onStateChange?.(value);
  }

  async function ensureContext() {
    if (typeof window === "undefined") {
      throw new Error("Audio is only available in the browser.");
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      throw new Error("This browser does not support Web Audio.");
    }

    if (!context) {
      context = new AudioCtor();

      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 18;
      compressor.ratio.value = 2.4;
      compressor.attack.value = 0.0025;
      compressor.release.value = 0.28;

      masterGain = context.createGain();
      masterGain.gain.value = 0.74;

      dryGain = context.createGain();
      dryGain.gain.value = 0.96;

      wetGain = context.createGain();
      wetGain.gain.value = 0.18;

      reverb = context.createConvolver();
      reverb.buffer = createImpulseResponse(context);

      noiseBuffer = createNoiseBuffer(context);
      pianoWave = createPianoWave(context);

      masterGain.connect(dryGain);
      masterGain.connect(reverb);
      reverb.connect(wetGain);
      dryGain.connect(compressor);
      wetGain.connect(compressor);
      compressor.connect(context.destination);
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  }

  function clearState() {
    if (endTimer) {
      window.clearTimeout(endTimer);
      endTimer = null;
    }
    stopSources(activeSources);
    activeSources = [];
    setPlaying(false);
  }

  function schedulePianoNote(contextValue, melody, note, startAt) {
    const when = startAt + (note.startBeat * 60) / melody.tempo;
    const durationSeconds = noteDurationToSeconds(note.durationBeats, melody.tempo, note.hand);
    const release = note.hand === "left" ? 2.3 : 1.7;
    const stopAt = when + durationSeconds + release;
    const velocity = clamp(note.velocity, 0.16, 0.96);

    const panner = contextValue.createStereoPanner();
    panner.pan.setValueAtTime(panForMidi(note.midi), when);
    panner.connect(masterGain);

    const bodyInput = contextValue.createGain();
    bodyInput.gain.value = 1;

    const amplitude = contextValue.createGain();
    amplitude.gain.setValueAtTime(0.0001, when);
    amplitude.gain.exponentialRampToValueAtTime(velocity * 0.94, when + 0.01);
    amplitude.gain.exponentialRampToValueAtTime(velocity * 0.26, when + 0.24);
    amplitude.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    bodyInput.connect(amplitude);
    amplitude.connect(panner);

    const lowpassInput = createBodyFilters(
      contextValue,
      note.frequency,
      bodyInput,
      when,
    );

    const oscillators = scheduleStringOscillators(
      contextValue,
      pianoWave,
      note.frequency,
      when,
      stopAt,
      lowpassInput,
      velocity,
      note.midi,
    );

    const resonances = scheduleResonance(
      contextValue,
      note.frequency,
      when + 0.01,
      stopAt,
      bodyInput,
      velocity,
    );

    const hammerNodes = scheduleHammer(
      contextValue,
      noiseBuffer,
      when,
      bodyInput,
      note.frequency,
      velocity,
    );

    activeSources.push(...oscillators, ...resonances, ...hammerNodes);
  }

  async function play(melody) {
    if (disposed) {
      throw new Error("Player has been disposed.");
    }

    const contextValue = await ensureContext();
    clearState();

    const startAt = contextValue.currentTime + 0.05;
    melody.notes.forEach((note) => {
      schedulePianoNote(contextValue, melody, note, startAt);
    });

    const tailMs = Math.ceil((melody.durationSeconds + 2.8) * 1000);
    endTimer = window.setTimeout(() => {
      activeSources = [];
      setPlaying(false);
    }, tailMs);
    setPlaying(true);
  }

  function stop() {
    if (!context) {
      setPlaying(false);
      return;
    }
    clearState();
  }

  async function dispose() {
    disposed = true;
    clearState();
    if (context && context.state !== "closed") {
      await context.close();
    }
    context = null;
  }

  return {
    play,
    stop,
    dispose,
  };
}
