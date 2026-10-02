import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: any;
  let passwordService: any;
  let refreshTokenService: any;
  let jwtService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    passwordService = {
      compare: jest.fn(),
      hash: jest.fn(),
    };

    refreshTokenService = {
      createToken: jest.fn(),
      rotateToken: jest.fn(),
      revokeToken: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: PasswordService, useValue: passwordService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('deve autenticar com sucesso e retornar accessToken e rawRefreshToken', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Profª Ana Souza',
        email: 'ana@demo.bncc.br',
        passwordHash: 'hashed_password',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      refreshTokenService.createToken.mockResolvedValue('raw_refresh_token_xyz');

      const result = await authService.login({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      });

      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.rawRefreshToken).toBe('raw_refresh_token_xyz');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Profª Ana Souza',
        email: 'ana@demo.bncc.br',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'ana@demo.bncc.br' });
    });

    it('deve lançar UnauthorizedException se o e-mail não existir', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'inexistente@demo.bncc.br', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a senha for incorreta', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'correct_hash',
      });
      passwordService.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'ana@demo.bncc.br', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('deve renovar o token e rotacionar o refresh token com sucesso', async () => {
      refreshTokenService.rotateToken.mockResolvedValue({
        newRawToken: 'new_refresh_token_abc',
        user: { id: 'user-1', name: 'Profª Ana Souza', email: 'ana@demo.bncc.br' },
      });

      const result = await authService.refresh('old_raw_token');

      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.newRawRefreshToken).toBe('new_refresh_token_abc');
      expect(result.user.email).toBe('ana@demo.bncc.br');
    });
  });

  describe('logout', () => {
    it('deve chamar a revogação do token se fornecido', async () => {
      await authService.logout('raw_token_to_revoke');
      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith('raw_token_to_revoke');
    });
  });
});
