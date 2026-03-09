function createImpulseResponse(context, duration = 1.8, decay = 2.4) {
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
  const length = Math.floor(context.sampleRate * 0.04);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const output = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    output[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function noteDurationToSeconds(durationBeats, tempo, hand) {
  const beatSeconds = 60 / tempo;
  const legato = hand === "left" ? 1.38 : 1.16;
  return Math.max(0.18, durationBeats * beatSeconds * legato);
}

function stopSources(sources) {
  sources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // Ignore already-ended nodes.
    }
  });
}

export function createMelodyPlayer({ onStateChange } = {}) {
  let context = null;
  let compressor = null;
  let masterGain = null;
  let reverb = null;
  let wetGain = null;
  let dryGain = null;
  let noiseBuffer = null;
  let endTimer = null;
  let activeSources = [];
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
      compressor.threshold.value = -18;
      compressor.knee.value = 10;
      compressor.ratio.value = 2.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.32;

      masterGain = context.createGain();
      masterGain.gain.value = 0.84;

      dryGain = context.createGain();
      dryGain.gain.value = 0.9;

      wetGain = context.createGain();
      wetGain.gain.value = 0.22;

      reverb = context.createConvolver();
      reverb.buffer = createImpulseResponse(context);
      noiseBuffer = createNoiseBuffer(context);

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

  function scheduleHammer(contextValue, when, destination, frequency, velocity) {
    const hammer = contextValue.createBufferSource();
    hammer.buffer = noiseBuffer;

    const filter = contextValue.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(Math.min(6400, frequency * 7), when);
    filter.Q.value = 1.4;

    const gain = contextValue.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, velocity * 0.12), when + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);

    hammer.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    hammer.start(when);
    hammer.stop(when + 0.06);
    activeSources.push(hammer);
  }

  function schedulePianoNote(contextValue, melody, note, startAt) {
    const when = startAt + (note.startBeat * 60) / melody.tempo;
    const durationSeconds = noteDurationToSeconds(note.durationBeats, melody.tempo, note.hand);
    const release = note.hand === "left" ? 1.8 : 1.35;
    const stopAt = when + durationSeconds + release;
    const velocity = Math.max(0.18, Math.min(0.96, note.velocity));

    const voice = contextValue.createGain();
    voice.gain.setValueAtTime(0.0001, when);
    voice.gain.exponentialRampToValueAtTime(velocity * 0.24, when + 0.01);
    voice.gain.exponentialRampToValueAtTime(velocity * 0.08, when + 0.14);
    voice.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    voice.connect(masterGain);

    const bodyFilter = contextValue.createBiquadFilter();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.setValueAtTime(Math.min(4200, note.frequency * 6), when);
    bodyFilter.Q.value = 0.7;
    bodyFilter.connect(voice);

    const partialA = contextValue.createOscillator();
    partialA.type = "triangle";
    partialA.frequency.setValueAtTime(note.frequency, when);
    partialA.connect(bodyFilter);

    const partialB = contextValue.createOscillator();
    partialB.type = "sine";
    partialB.frequency.setValueAtTime(note.frequency * 2, when);

    const partialBGain = contextValue.createGain();
    partialBGain.gain.setValueAtTime(velocity * 0.07, when);
    partialBGain.gain.exponentialRampToValueAtTime(0.0001, when + durationSeconds * 0.7 + 0.24);
    partialB.connect(partialBGain);
    partialBGain.connect(voice);

    const partialC = contextValue.createOscillator();
    partialC.type = "sine";
    partialC.frequency.setValueAtTime(note.frequency * 0.5, when);

    const partialCGain = contextValue.createGain();
    partialCGain.gain.setValueAtTime(note.hand === "left" ? velocity * 0.08 : velocity * 0.04, when);
    partialCGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    partialC.connect(partialCGain);
    partialCGain.connect(voice);

    scheduleHammer(contextValue, when, voice, note.frequency, velocity);

    partialA.start(when);
    partialB.start(when);
    partialC.start(when);
    partialA.stop(stopAt);
    partialB.stop(stopAt);
    partialC.stop(stopAt);

    activeSources.push(partialA, partialB, partialC);
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

  async function play(melody) {
    if (disposed) {
      throw new Error("Player has been disposed.");
    }

    const contextValue = await ensureContext();
    clearState();
    const startAt = contextValue.currentTime + 0.04;
    melody.notes.forEach((note) => {
      schedulePianoNote(contextValue, melody, note, startAt);
    });

    const tailMs = Math.ceil((melody.durationSeconds + 2.2) * 1000);
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
