export type NormalizedRole = "teknis" | "super_admin" | "admin" | "staff" | null;

export const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password"];

export const STAFF_ROUTES = ["/jadwal-staff", "/profile", "/profil", "/riwayat"];

export const TEKNIS_ONLY_ROUTES = ["/divisi-teknis", "/pengaturan"];

export const SUPER_ADMIN_ROUTES = ["/workspace", "/kelola-admin"];

export const OPS_ROUTES = [
  "/dashboard-monitoring",
  "/toko",
  "/staff",
  "/template-checklist",
  "/jadwal-audit",
  "/libur-toko",
  "/galeri",
  "/laporan",
  "/tanya-ai",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function normalizeRole(role?: string | null): NormalizedRole {
  if (!role || typeof role !== "string") return null;
  const lower = role.trim().toLowerCase();

  if (lower === "super admin" || lower === "superadmin" || lower === "super_admin") {
    return "super_admin";
  }
  if (lower === "divisi teknis" || lower === "teknis") {
    return "teknis";
  }
  if (lower === "admin" || lower === "area admin") {
    return "admin";
  }
  if (
    lower === "staff" ||
    lower === "auditor lapangan" ||
    lower.includes("staff") ||
    lower.includes("auditor")
  ) {
    return "staff";
  }

  return null;
}

export function getHomeRouteForRole(role?: string | null): string {
  switch (normalizeRole(role)) {
    case "staff":
      return "/jadwal-staff";
    case "admin":
      return "/dashboard-monitoring";
    case "teknis":
      return "/divisi-teknis";
    case "super_admin":
      return "/workspace";
    default:
      return "/login";
  }
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isKnownProtectedRoute(pathname: string): boolean {
  return (
    matchesPrefix(pathname, STAFF_ROUTES) ||
    matchesPrefix(pathname, TEKNIS_ONLY_ROUTES) ||
    matchesPrefix(pathname, SUPER_ADMIN_ROUTES) ||
    matchesPrefix(pathname, OPS_ROUTES)
  );
}

export function canRoleAccessPath(role?: string | null, pathname?: string): boolean {
  if (!pathname) return false;
  if (isPublicRoute(pathname)) return true;

  const normalized = normalizeRole(role);
  if (!normalized) return false;

  switch (normalized) {
    case "staff":
      return matchesPrefix(pathname, STAFF_ROUTES);
    case "admin":
      return matchesPrefix(pathname, OPS_ROUTES);
    case "super_admin":
      return (
        matchesPrefix(pathname, SUPER_ADMIN_ROUTES) ||
        matchesPrefix(pathname, OPS_ROUTES)
      );
    case "teknis":
      return (
        matchesPrefix(pathname, TEKNIS_ONLY_ROUTES) ||
        matchesPrefix(pathname, SUPER_ADMIN_ROUTES) ||
        matchesPrefix(pathname, OPS_ROUTES)
      );
    default:
      return false;
  }
}

export function isSafeInternalPath(path?: string | null): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function resolvePostLoginRedirect(
  role?: string | null,
  redirectParam?: string | null
): string {
  const safePath = isSafeInternalPath(redirectParam);
  if (safePath) {
    const pathnameOnly = safePath.split(/[?#]/)[0] || "/";
    if (!isPublicRoute(pathnameOnly) && canRoleAccessPath(role, pathnameOnly)) {
      return safePath;
    }
  }
  return getHomeRouteForRole(role);
}
