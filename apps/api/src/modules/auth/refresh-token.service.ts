import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  // Validade de 8 horas conforme requisitos (Clarification 2 e spec.md)
  private readonly validityHours = 8;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gera um hash SHA-256 do token em texto plano
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Gera um token seguro de 64 bytes e persiste apenas o seu hash SHA-256 no banco
   */
  async createToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.validityHours * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Valida o token recebido pelo cookie. Retorna a sessão ativa se válida.
   */
  async validateToken(rawToken: string) {
    if (!rawToken) {
      throw new UnauthorizedException('Token de atualização ausente.');
    }

    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new UnauthorizedException('Sessão inválida ou não encontrada.');
    }

    if (record.revokedAt) {
      throw new UnauthorizedException('Esta sessão foi revogada.');
    }

    if (new Date() > record.expiresAt) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    return record;
  }

  /**
   * Rotaciona o token: revoga o anterior e gera um novo
   */
  async rotateToken(rawToken: string): Promise<{ newRawToken: string; userId: string; user: any }> {
    const session = await this.validateToken(rawToken);

    // Revoga o token atual
    await this.prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Cria novo token
    const newRawToken = await this.createToken(session.userId);

    return {
      newRawToken,
      userId: session.userId,
      user: session.user,
    };
  }

  /**
   * Revoga explicitamente a sessão (logout)
   */
  async revokeToken(rawToken: string): Promise<void> {
    if (!rawToken) return;

    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
