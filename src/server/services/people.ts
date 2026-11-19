import type { Language } from "../../shared/languages";
import { translator } from "../translate";

// How people are named wherever the app shows them.

export type NamedPerson = {
  name: string | null;
  email: string | null;
  deletedAt: Date | null;
};

/**
 * "Former user" for a deleted account (BR-05). Otherwise the user's name, or
 * the part of their email before the @ if the provider gave no name.
 */
export function personName(person: NamedPerson, language: Language): string {
  const formerUser = () => translator(language, "people")("formerUser");
  if (person.deletedAt) return formerUser();
  const name = person.name?.trim();
  if (name) return name;
  return person.email?.split("@")[0]?.trim() || formerUser();
}
