import * as THREE from 'three';
import { TUNING } from '@physics/TUNING';

// Volumes for events, as Visual Pinball's standard script plays them.
const EVENT_VOLUME = { flipperUp: 0.67 };

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (value) => Math.min(1, Math.max(0, value));

// Plays the table's own sounds (exported by the importer) for physics events, as 3D positional
// audio from where they happen on the table, so in XR they come from the table in the room.
// Volume and pitch follow Visual Pinball's standard script: hits and rolling get louder and higher
// with the ball's speed. Sounds load in the background; until each has loaded it is silent.
export const TableAudio = ({ scene, camera, physics }) => {
  const { definition, events, ball, table } = physics;
  const { files, events: eventSounds, slingshots, hits, hitProfiles } = definition.sounds;
  const { vpSpeedPerMetrePerSecond, masterVolume, refDistance, voices } = TUNING.audio;

  const listener = new THREE.AudioListener();
  listener.setMasterVolume(masterVolume);
  camera.add(listener);
  // Browsers start audio suspended until the player interacts with the page.
  const resume = () => listener.context.state === 'suspended' && listener.context.resume();
  resume();
  ['pointerdown', 'keydown', 'touchstart'].forEach(type => document.addEventListener(type, resume));

  const buffers = new Map();
  const loader = new THREE.AudioLoader();
  Object.entries(files).forEach(([name, url]) => {
    loader.loadAsync(url)
      .then(buffer => {
        buffers.set(name, buffer);
        if (eventSounds.rolling && name === eventSounds.rolling[0]) startRolling(buffer);
      })
      .catch(error => console.warn(`Could not load sound ${url}`, error));
  });

  const positional = () => {
    const audio = new THREE.PositionalAudio(listener);
    audio.setRefDistance(refDistance);
    audio.panner.panningModel = 'HRTF';
    scene.add(audio);
    return audio;
  }

  // A pool of voices for one-shot sounds, reused round-robin.
  const pool = Array.from({ length: voices }, positional);
  let nextVoice = 0;

  // Visual Pinball's ball speed (VP units per 10 ms) for a speed in m/s.
  const vpSpeed = (metresPerSecond) => metresPerSecond * vpSpeedPerMetrePerSecond;
  // Visual Pinball's standard script: volume BallVel² / 2000, pitch BallVel * 20 (in Hz, added to
  // the sample's rate).
  const speedVolume = (speed) => clamp(vpSpeed(speed) ** 2 / 2000);
  const speedRate = (buffer, speed) => (buffer.sampleRate + vpSpeed(speed) * 20) / buffer.sampleRate;

  const play = (name, position, volume = 1, rate = () => 1) => {
    const buffer = name && buffers.get(name);
    if (!buffer || volume <= 0) return;
    const voice = pool[nextVoice];
    nextVoice = (nextVoice + 1) % pool.length;
    if (voice.isPlaying) voice.stop();
    voice.setBuffer(buffer);
    voice.setVolume(volume);
    voice.setPlaybackRate(rate(buffer));
    voice.position.set(position.x, position.y, position.z);
    voice.play();
  }

  const playEvent = (event, position) =>
    eventSounds[event] && play(pickRandom(eventSounds[event]), position, EVENT_VOLUME[event] ?? 1);

  events.addEventListener('flipper', ({ detail }) => playEvent(detail.up ? 'flipperUp' : 'flipperDown', detail.position));
  events.addEventListener('plunger', ({ detail }) => playEvent(detail.pulling ? 'plungerPull' : 'plungerRelease', detail.position));
  events.addEventListener('drain', ({ detail }) => playEvent('drain', detail.position));
  events.addEventListener('serve', ({ detail }) => playEvent('ballRelease', detail.position));
  events.addEventListener('slingshot', ({ detail }) => slingshots[detail.name] && play(pickRandom(slingshots[detail.name]), detail.position));

  events.addEventListener('hit', ({ detail: { kind, name, speed, normalSpeed, position } }) => {
    const volume = speedVolume(speed);
    const rate = (buffer) => speedRate(buffer, speed);
    if (kind === 'flipper' && eventSounds.flipperHit) {
      play(pickRandom(eventSounds.flipperHit), position, volume, rate);
    } else if (kind === 'floor') {
      // A ball landing after a jump. The standard script: volume |velz| / 17.
      const landing = vpSpeed(normalSpeed);
      if (landing > 2 && eventSounds.ballDrop) play(pickRandom(eventSounds.ballDrop), position, clamp(landing / 17), rate);
    } else if (hits[name]) {
      // The fastest tier the ball's speed reaches.
      const tier = hitProfiles[hits[name]].find(({ minSpeed }) => vpSpeed(speed) >= minSpeed);
      if (tier) play(pickRandom(tier.sounds), position, volume, rate);
    }
  });

  // The rolling sound loops continuously; its volume, pitch, and position follow the ball.
  let rolling = null;
  function startRolling (buffer) {
    rolling = positional();
    rolling.setBuffer(buffer);
    rolling.setLoop(true);
    rolling.setVolume(0);
    rolling.play();
  }

  // Call once per frame.
  const update = () => {
    if (rolling === null) return;
    const position = ball.body.translation();
    const velocity = ball.body.linvel();
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    // As the standard script: only while the ball is on the playfield and moving.
    const onPlayfield = table.heightAbovePlayfield(position) < ball.radius * 1.5;
    const isRolling = ball.body.isEnabled() && onPlayfield && vpSpeed(speed) > 1;
    rolling.position.set(position.x, position.y, position.z);
    rolling.setVolume(isRolling ? speedVolume(speed) : 0);
    if (isRolling) rolling.setPlaybackRate(speedRate(rolling.buffer, speed));
  }

  return { update };
}
