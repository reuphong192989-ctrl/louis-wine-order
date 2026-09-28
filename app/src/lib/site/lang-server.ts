import { cookies } from "next/headers";
import { LANG_COOKIE, dict, toLang, type Dict, type Lang } from "./i18n";

/** Language chosen in the header switcher (cookie), English when unset. Server components only. */
export async function getLang(): Promise<Lang> {
  return toLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getDict(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: dict(lang) };
}

/** Same, for route handlers that receive a raw Request. */
export function langFromRequest(req: Request): Lang {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([a-z]{2})`));
  return toLang(m?.[1]);
}
