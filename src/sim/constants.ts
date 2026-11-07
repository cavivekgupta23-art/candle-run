// World units: one candle is CELL wide; height is K units per ln(price), so a 4% rise is a 2-unit step (one easy jump).
export const CELL = 3.0;
export const BODY_W = 1.9;          // the candle body you see
export const COL_W = 2.3;           // the body you stand on (a little wider: the gaps stay visual, not pits)
export const K = 51;
export const MIN_BODY = 0.35;

export const GRAV = 38;
export const JUMP_V = 13.5;         // apex 2.4 units
export const RUN_V = 6.0;
export const ACC_GROUND = 70;
export const ACC_AIR = 40;
export const FRICTION = 55;
export const COYOTE = 0.1;          // a jump still works this long after running off an edge
export const BUFFER = 0.13;         // a jump pressed this early before landing still happens
export const P_W = 0.8;
export const P_H = 1.6;
export const P_H_SLIDE = 0.75;
export const SLIDE_MIN = 0.6;
export const SLIDE_MAX = 2.4;
export const STEP_UP = 0.6;         // small rises are walked up

export const SPIKE_W = 0.36;
export const SPIKE_MIN = 1.0;       // an upper wick of about 2% or more becomes a spike
export const SPIKE_MAX = 1.45;      // spike height you have to clear (the drawn wick can be taller)
export const SPIKES_MAX = 22;
export const SPRING_RISE = 2.0;     // a rise bigger than this gets a boost pad
export const DOJI = 0.0012;         // a body under 0.12% is a glass plank that cracks if you stand on it
export const CRUMBLE_T = 0.55;
export const CRUMBLE_BACK = 3.0;
export const LASER_HALF = 0.12;
export const LASER_UP = 1.05;       // the beam sits this high over the run: standing hits it, sliding passes under
export const LASERS_MAX = 9;

export const HEARTS = 3;
export const INVULN = 1.2;
export const DT = 1 / 120;

export const CHASER_V = 4.9;         // 7 Nov: 4.9 keeps the old margins after the jetpack moved off the Trump rally
export const CHASER_RED = 1.35;     // sell-offs speed her up
export const CHASER_GREEN = 0.95;
export const CHASER_START = 7;      // candles behind the player at the start
export const CHASER_GRACE = 1.6;    // seconds before she starts walking
export const CHASER_LEASH = 22;     // further behind than this, she speeds up (up to +90% at twice the distance)
export const MARGIN_FULL = 36;      // a gap this big reads as a 100% margin level

export const JET_T = 5;             // "100x TO THE MOON" jetpack: seconds of flight
export const JET_V = 1.35;          // flying speed, times RUN_V
export const JET_CLEAR = 2.7;       // cruise height over the next candles (clears wicks and lasers)
export const MAGNET_T = 8;          // "AIRDROP" coin magnet seconds
export const MAGNET_R = 5.5;
export const SLOW_T = 3;            // a FUD cloud slows you this long
export const SLOW_F = 0.5;          // to this share of your speed
export const POWER_EV_GAP = 12;     // power-ups stay at least this many candles away from every event's candles
export const DOWN_T = 0.8;          // after a fall you lie on the volume floor this long (so you see where you fell)
export const VOL_BASE = 2.6;        // volume bars stand on the liquidation pool this far under the floor line
export const VOL_MAX = 2.0;         // the tallest volume bar
export const LAST_GRACE = 2.5;      // the taxman waits this long when you drop into the volume
export const LAST_HEART = 20;       // the MARGIN TOP-UP heart sits this many candles ahead
