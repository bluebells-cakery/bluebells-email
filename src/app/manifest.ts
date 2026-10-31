import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Bluebells EDM", short_name: "EDM", start_url: "/dashboard", display: "standalone", background_color: "#fffdf8", theme_color: "#262967",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] };
}
