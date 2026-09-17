import {
  Baby,
  BookOpen,
  Dumbbell,
  Gamepad2,
  Home,
  Package,
  Shirt,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-solid';

// The API only returns {id, name, slug} — icons are a purely presentational
// frontend concern, mapped by slug with a generic fallback for any category
// the seed data doesn't know about yet.
const ICONS_BY_SLUG: Record<string, LucideIcon> = {
  elektronik: Smartphone,
  fashion: Shirt,
  'rumah-tangga': Home,
  'buku-alat-tulis': BookOpen,
  olahraga: Dumbbell,
  kecantikan: Sparkles,
  'hobi-mainan': Gamepad2,
  'ibu-bayi': Baby,
};

export function categoryIcon(slug: string): LucideIcon {
  return ICONS_BY_SLUG[slug] ?? Package;
}
