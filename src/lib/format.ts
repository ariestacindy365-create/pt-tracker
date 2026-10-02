// First letter of the first name + first letter of the last name (e.g.
// "Ratna Dewi Sukman" -> "RS") for avatar initials. Single-word names just
// use that one letter.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).toUpperCase();
}

// A handful of pastel-bg/darker-fg pairs so client avatars read as distinct
// people at a glance in a list, instead of a wall of identical circles.
// Picked deterministically from the name so the same client always gets the
// same color (not random per render).
const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#ccfbf1", fg: "#0f766e" }, // teal
  { bg: "#ede9fe", fg: "#6d28d9" }, // violet
  { bg: "#fef3c7", fg: "#b45309" }, // amber
  { bg: "#ffe4e6", fg: "#be123c" }, // rose
  { bg: "#dbeafe", fg: "#1d4ed8" }, // blue
  { bg: "#ecfccb", fg: "#4d7c0f" }, // lime
];

export function avatarColor(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// "Hari 3" + its first gerakan -> "Hari 3 · Deadlift", so a day can be told
// apart at a glance without opening it.
export function dayTitle(day: { dayLabel: string; exercises: { exerciseName: string }[] }): string {
  const first = day.exercises[0]?.exerciseName;
  return first ? `${day.dayLabel} · ${first}` : day.dayLabel;
}
