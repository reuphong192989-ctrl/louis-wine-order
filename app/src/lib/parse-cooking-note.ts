export type ParsedNote = { intro: string | null; methods: string[] | null; plain: string | null };

function looksLikeUnitOrShort(s: string): boolean {
  const t = s.trim();
  if (t.startsWith("/")) return true; // "/kg", "/con", "/đĩa"...
  if (/^\d/.test(t) && t.split("/").length <= 2 && t.length <= 20) return true; // "8-10 con/kg"
  if (/^đặt trước/i.test(t)) return true; // "đặt trước ≥1 giờ"
  if (t.length <= 20 && !t.includes(" ")) return true;
  return false;
}

function splitMethods(s: string): string[] | null {
  const parts = s.split("/").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

/**
 * Menu notes mix free text ("sốt chanh dây"), a serving unit ("/kg", "/nồi"),
 * and lists of alternative preparations separated by "/" ("hấp/nướng/chiên
 * mắm"), sometimes both ("/kg - hấp xôi/nấu khoai sọ/quay cay"). Splits the
 * genuine method lists into an array for the item detail modal; anything
 * that doesn't clearly look like a list of preparations is left as plain
 * text so we never mis-split a unit or a single descriptive phrase.
 */
export function parseCookingNote(raw: string): ParsedNote {
  const note = raw.trim();
  if (!note) return { intro: null, methods: null, plain: null };

  const dashIdx = note.indexOf(" - ");
  if (dashIdx !== -1) {
    const left = note.slice(0, dashIdx).trim();
    const right = note.slice(dashIdx + 3).trim();
    if (looksLikeUnitOrShort(left)) {
      const methods = splitMethods(right);
      if (methods) return { intro: left, methods, plain: null };
    }
    if (looksLikeUnitOrShort(right)) {
      const methods = splitMethods(left);
      if (methods) return { intro: right, methods, plain: null };
    }
    return { intro: null, methods: null, plain: note };
  }

  if (!looksLikeUnitOrShort(note)) {
    const methods = splitMethods(note);
    if (methods) return { intro: null, methods, plain: null };
  }
  return { intro: null, methods: null, plain: note };
}
