import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { Public } from "../common/require-permission.decorator";
import { AuthService } from "./auth.service";

class LoginDto {
  email!: string;
  password!: string;
  device?: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: any) {
    const ip = req.ip ?? req.connection?.remoteAddress;
    return this.authService.login(body.email, body.password, body.device, ip);
  }

  @Post("logout")
  async logout(@Headers("authorization") authHeader?: string) {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
    if (!token) return { ok: true };
    return this.authService.logout(token);
  }
}
