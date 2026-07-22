import { Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {
  constructor(private passwords: PasswordService, private sessions: SessionService) {}

  async login(email: string, password: string, device?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { assignments: { take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException("Invalid email or password.");
    if (user.status === "SUSPENDED") throw new UnauthorizedException("This account has been suspended.");

    const valid = await this.passwords.verify(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid email or password.");

    const token = await this.sessions.create(user.id, device, ipAddress);
    const companyId = user.assignments[0]?.companyId ?? null;
    return {
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, tenantId: user.tenantId, companyId },
    };
  }

  async logout(token: string) {
    await this.sessions.revoke(token);
    return { ok: true };
  }
}
