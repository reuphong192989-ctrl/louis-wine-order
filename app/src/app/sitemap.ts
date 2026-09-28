import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/menu`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/lumia`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
