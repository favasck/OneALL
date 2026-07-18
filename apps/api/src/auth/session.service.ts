import { Injectable } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@oneall/db";

// Section 9.1: "Session/device revocation and suspicious-login alerts."
// Session tokens are opaque random strings, not JWTs — chosen deliberately
// so that revocation (Section 5.8: "Admin can suspend user, revoke
// sessions... immediately") is a single DB write, not a blocklist hack
// layered on top of a stateless token.
@Injectable()
export class SessionService {
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async create(userId: string, device?: string, ipAddress?: string) {
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: { userId, tokenHash: this.hashToken(token), device, ipAddress },
    });
    return token; // returned to the client once; only the hash is ever stored
  }

  async validate(token: string) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { include: { assignments: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } },
    });
    if (!session || session.revokedAt) return null;
    return session;
  }

  async revoke(token: string) {
    await prisma.session.updateMany({
      where: { tokenHash: this.hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }

  /** Section 5.8: "Admin can suspend user, revoke sessions... immediately." */
  async revokeAllForUser(userId: string) {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
