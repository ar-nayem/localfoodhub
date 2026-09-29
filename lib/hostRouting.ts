import { originFor, type AppSurface } from "./hosts";

// Login stays on the current host so the session cookie reaches that app's pages.
const sharedPaths = ["/privacy", "/terms", "/delete-account", "/login"];
const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

export function canonicalSurface(pathname: string): AppSurface | "shared" {
  if (sharedPaths.some((root) => under(pathname, root))) return "shared";
  if (under(pathname, "/vendor") || under(pathname, "/q")) return "business";
  if (under(pathname, "/admin")) return "admin";
  return "customer";
}

/** A host-local path, a configured public URL, or null when this host should serve it. */
export function canonicalLocation(surface: AppSurface, pathname: string, search: string): string | null {
  if (pathname === "/" && surface !== "customer") {
    return `${surface === "business" ? "/vendor" : "/admin"}${search}`;
  }
  if (surface === "business") {
    if (pathname === "/login") return `/vendor/login${search}`;
    if (pathname === "/apply") return `/vendor/apply${search}`;
  } else if (pathname === "/apply") {
    const origin = originFor("business");
    return origin ? `${origin}/vendor/apply${search}` : null;
  }

  const target = canonicalSurface(pathname);
  if (target === "shared" || target === surface) return null;
  const origin = originFor(target);
  return origin ? `${origin}${pathname}${search}` : null;
}
