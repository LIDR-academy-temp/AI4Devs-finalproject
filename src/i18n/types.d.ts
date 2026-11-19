import type en from "./en.json";
import type { formats } from "./formats";

// Lets TypeScript check message keys against the English file, and format
// names against the shared formats.
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
    Locale: "es" | "en";
    Formats: typeof formats;
  }
}
