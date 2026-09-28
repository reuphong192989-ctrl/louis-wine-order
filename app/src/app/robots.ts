import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/don-hang/", "/dat-ban/", "/staff", "/kitchen", "/order", "/he-thong"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
