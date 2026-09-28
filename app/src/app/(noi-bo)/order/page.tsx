import { Suspense } from "react";
import { cookies } from "next/headers";
import OrderApp from "@/components/order/OrderApp";
import { LANG_COOKIE, LANGS, type Lang } from "@/lib/site/i18n";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  // Same `lang` cookie as the public website; dine-in default stays Vietnamese.
  const saved = (await cookies()).get(LANG_COOKIE)?.value as Lang | undefined;
  const initialLang: Lang = saved && LANGS.includes(saved) ? saved : "vi";
  return (
    <Suspense fallback={null}>
      <OrderApp initialLang={initialLang} />
    </Suspense>
  );
}
