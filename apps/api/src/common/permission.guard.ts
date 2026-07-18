import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { can, type PermissionContext } from "@oneall/shared";
import { PERMISSION_KEY, PUBLIC_KEY } from "./require-permission.decorator";

/**
 * Enforces Section 3.3: user x company x branch x module x action x record
 * scope, deny by default. Runs after SessionAuthGuard (registered first in
 * app.module.ts's APP_GUARD providers), which populates
 * request.permissionContext from the caller's real session and
 * UserRoleAssignment rows.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<{ module: string; action: string } | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Deny by default: no explicit @RequirePermission and not @Public -> reject.
    if (!required) {
      throw new ForbiddenException("Route has no declared permission — deny by default (Section 3.3).");
    }

    const request = context.switchToHttp().getRequest();
    const ctx: PermissionContext | undefined = request.permissionContext;

    if (!ctx) {
      throw new ForbiddenException("No permission context on request — SessionAuthGuard did not run or found no session.");
    }

    if (!can(ctx, required.module as any, required.action as any)) {
      throw new ForbiddenException(`Missing permission: ${required.module}.${required.action}`);
    }

    return true;
  }
}
