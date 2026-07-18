import { SetMetadata } from "@nestjs/common";
import type { PermissionModule, PermissionAction } from "@oneall/shared";

export const PERMISSION_KEY = "oneall:permission";

/**
 * Declares the module+action a route requires — Section 3.3 permission
 * model. Deny by default: routes with no @RequirePermission are rejected
 * by PermissionGuard unless explicitly marked @Public().
 */
export const RequirePermission = (module: PermissionModule, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action });

export const PUBLIC_KEY = "oneall:public";
export const Public = () => SetMetadata(PUBLIC_KEY, true);
