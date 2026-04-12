const STORAGE_KEY = "calendar_puzzle_how_to_play_seen";

export function hasSeenHowToPlay(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHowToPlaySeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // private mode / quota
  }
}
