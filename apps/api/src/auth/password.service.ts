import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

// bcryptjs (pure JS, no native compilation) rather than argon2/bcrypt —
// deliberate choice: this scaffold's build environment blocks native
// binary downloads (see packages/db's prisma generate note), and a pure-JS
// hash lib avoids hitting the same wall. bcrypt is still an accepted
// choice for Section 9.1's "strong password policy"; argon2 is a
// reasonable upgrade once the real deployment environment is confirmed.
const SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  verify(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
