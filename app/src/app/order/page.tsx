import { Suspense } from "react";
import OrderApp from "@/components/order/OrderApp";

export const dynamic = "force-dynamic";

export default function OrderPage() {
  return (
    <Suspense fallback={null}>
      <OrderApp />
    </Suspense>
  );
}
