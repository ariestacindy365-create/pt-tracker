// First letter of the first name + first letter of the last name (e.g.
// "Ratna Dewi Sukman" -> "RS") for avatar initials. Single-word names just
// use that one letter.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).toUpperCase();
}
