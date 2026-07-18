import { Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

/**
 * Section 5.8 user invitation and access workflow, steps 3-5: "User signs
 * in, verifies identity and registers device/session" + "System records
 * acceptance and applies effective permissions." Invitation creation
 * (steps 1-2, admin selecting role/scope and sending the invite) is not
 * built in this scaffold — it needs an email service, which is out of
 * scope here. This covers login/logout for a user who already has a
 * passwordHash set (e.g. via the seed script).
 */
@Injectable()
export class AuthService {
  constructor(
    private passwords: PasswordService,
    private sessions: SessionService,
  ) {}

  async login(email: string, password: string, device?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    if (user.status === "SUSPENDED") {
      throw new UnauthorizedException("This account has been suspended.");
    }

    const valid = await this.passwords.verify(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const token = await this.sessions.create(user.id, device, ipAddress);
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName } };
  }

  async logout(token: string) {
    await this.sessions.revoke(token);
    return { ok: true };
  }
}
