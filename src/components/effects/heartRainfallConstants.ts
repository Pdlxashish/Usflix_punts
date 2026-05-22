/** Total effect length (spawn + settle) */
export const HEART_RAINFALL_DURATION_MS = 25_000;

/** How long new hearts keep spawning from the top */
export const HEART_RAINFALL_SPAWN_MS = 14_000;

/** Max simultaneous hearts on screen */
export const HEART_RAINFALL_MAX_HEARTS = 120;

/** Hearts per blast (scales with rapid clicks) */
export const HEART_BURST_BASE_COUNT = 28;

/** Extra hearts per stacked press within 800ms */
export const HEART_BURST_STACK_COUNT = 14;

/** Max hearts from a single press */
export const HEART_BURST_MAX_PER_PRESS = 90;

/** How long the effect stays alive after last press */
export const HEART_BURST_EXTEND_MS = 7_000;

/** Max streak multiplier from rapid clicks */
export const HEART_BURST_MAX_STREAK = 8;

/** Love bomb (5 clicks on Story Continues heart) */
export const HEART_LOVE_BOMB_CLICKS = 5;
export const HEART_LOVE_BOMB_CLICK_RESET_MS = 2800;
/** Swell + flash before canvas burst fires */
export const HEART_LOVE_BOMB_DETONATE_MS = 750;
/** Love tokens keep bursting for at least this long */
export const HEART_LOVE_BOMB_BURST_MIN_MS = 5000;
/** Extra time for hearts to drift after spawning stops */
export const HEART_LOVE_BOMB_SETTLE_MS = 7000;
export const HEART_LOVE_BOMB_INTENSITY = 16;
/** First wave — big pop */
export const HEART_LOVE_BOMB_MAIN_BURST_COUNT = 90;
/** Each follow-up wave while burst runs */
export const HEART_LOVE_BOMB_PER_WAVE_COUNT = 48;
export const HEART_LOVE_BOMB_SPARK_COUNT = 45;
export const HEART_LOVE_BOMB_WAVE_INTERVAL_MS = 380;
const _loveBombWaveDelays: number[] = [];
for (let t = 0; t <= HEART_LOVE_BOMB_BURST_MIN_MS; t += HEART_LOVE_BOMB_WAVE_INTERVAL_MS) {
  _loveBombWaveDelays.push(t);
}
if (_loveBombWaveDelays[_loveBombWaveDelays.length - 1] !== HEART_LOVE_BOMB_BURST_MIN_MS) {
  _loveBombWaveDelays.push(HEART_LOVE_BOMB_BURST_MIN_MS);
}
export const HEART_LOVE_BOMB_WAVE_DELAYS_MS = _loveBombWaveDelays;
export const HEART_LOVE_BOMB_DURATION_MS =
  HEART_LOVE_BOMB_BURST_MIN_MS + HEART_LOVE_BOMB_SETTLE_MS + 3000;
export const HEART_LOVE_BOMB_MAX_HEARTS = 320;
