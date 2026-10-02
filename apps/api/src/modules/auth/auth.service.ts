import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Autentica o usuário validando credenciais cadastradas
   */
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos. Confira os dados e tente novamente.');
    }

    const isPasswordValid = await this.passwordService.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos. Confira os dados e tente novamente.');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Cria sessão segura de refresh token (8h)
    const rawRefreshToken = await this.refreshTokenService.createToken(user.id);

    return {
      accessToken,
      rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * Renova o token de acesso e rotaciona o token de atualização
   */
  async refresh(rawRefreshToken: string) {
    const { newRawToken, user } = await this.refreshTokenService.rotateToken(rawRefreshToken);

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      newRawRefreshToken: newRawToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * Encerra a sessão revogando o token
   */
  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      await this.refreshTokenService.revokeToken(rawRefreshToken);
    }
    return {
      success: true,
      message: 'Sessão encerrada com sucesso.',
    };
  }
}
