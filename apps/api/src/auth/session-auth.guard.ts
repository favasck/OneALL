import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PermissionContext, PermissionGrant } from "@oneall/shared";
import { PUBLIC_KEY } from "../common/require-permission.decorator";
import { SessionService } from "./session.service";

/**
 * Runs before PermissionGuard (Section 3.3). Resolves the bearer token to
 * a real session + user, then builds the request's PermissionContext from
 * that user's UserRoleAssignment rows for the company in the route —
 * replacing the "auth middleware not wired yet" placeholder that used to
 * make every non-public route fail closed.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    if (!token) throw new UnauthorizedException("Missing bearer token.");

    const session = await this.sessions.validate(token);
    if (!session) throw new UnauthorizedException("Session is invalid, expired, or revoked.");

    request.user = { id: session.userId };

    const companyId: string | undefined = request.params?.companyId;
    const relevantAssignments = companyId
      ? session.user.assignments.filter((a: any) => a.companyId === companyId)
      : session.user.assignments;

    const grants: PermissionGrant[] = relevantAssignments.flatMap((a: any) =>
      a.role.permissions.map((rp: any) => ({ module: rp.permission.module, action: rp.permission.action })),
    );

    const context_: PermissionContext = {
      companyId: companyId ?? "",
      grants,
    };
    request.permissionContext = context_;

    return true;
  }
}
