export function singleAdminSessionBlocked(activeAdminSessionCount: number, enforceSingleAdminSession = process.env.ENFORCE_SINGLE_ADMIN_SESSION === "true") {
  return enforceSingleAdminSession && activeAdminSessionCount > 0;
}
