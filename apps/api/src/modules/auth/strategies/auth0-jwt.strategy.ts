import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";
import jwksRsa from "jwks-rsa";
import type { JwtPayload } from "@energivia/types";
import { PrismaService } from "../../../prisma/prisma.service";
import { InvitationStatus, OrgRole } from "@prisma/client";

interface Auth0Payload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string | string[];
  [key: string]: unknown;
}

function getStringClaim(payload: Auth0Payload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function buildClaimKey(namespace: string, claim: string): string {
  return `${namespace.replace(/\/$/, "")}/${claim}`;
}

function extractBearerFromRequest(req: {
  headers?: Record<string, string | string[] | undefined>;
}): string | undefined {
  const raw = req.headers?.["authorization"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !v.startsWith("Bearer ")) return undefined;
  const t = v.slice(7).trim();
  return t || undefined;
}

type Auth0UserInfoProfile = { email?: string; name?: string; picture?: string };

async function fetchAuth0UserInfo(
  auth0Domain: string,
  bearerToken: string
): Promise<Auth0UserInfoProfile | null> {
  try {
    // 🧼 Limpa qualquer "https://" ou "http://" da variável antes de usar
    const cleanDomain = auth0Domain.replace(/^https?:\/\//, "");

    const res = await fetch(`https://${cleanDomain}/userinfo`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    // ... resto do seu código
    if (!res.ok) return null;
    const body = (await res.json()) as {
      email?: string;
      name?: string;
      picture?: string;
      nickname?: string;
      given_name?: string;
      family_name?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const fromParts = [body.given_name, body.family_name].filter(Boolean).join(" ").trim();
    const name =
      body.name?.trim() || (fromParts.length > 0 ? fromParts : undefined) || body.nickname?.trim();
    return {
      email: email || undefined,
      name: name || undefined,
      picture: body.picture?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

import { EmailService } from "../../../common/email/email.service";
import { AdminAlertsService } from "../../notifications/admin-alerts.service";
import { Optional } from "@nestjs/common";

@Injectable()
export class Auth0JwtStrategy extends PassportStrategy(Strategy, "auth0-jwt") {
  private readonly userInfoCache = new Map<
    string,
    { expiresAt: number; profile: Auth0UserInfoProfile }
  >();

  private static readonly USERINFO_CACHE_TTL_MS = 120_000;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Optional()
    private readonly adminAlerts?: AdminAlertsService
  ) {
    const auth0Domain = config.get<string>("AUTH0_DOMAIN");
    const cleanDomain = auth0Domain ? auth0Domain.replace(/^https?:\/\//, "") : "";
    const jwksUri = cleanDomain ? `https://${cleanDomain}/.well-known/jwks.json` : "";

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ["RS256"],
      passReqToCallback: true,
      secretOrKeyProvider: (
        req: { headers?: Record<string, string | string[] | undefined> },
        rawToken: string,
        done: (err: Error | null, key?: string | Buffer) => void
      ) => {
        void (async () => {
          try {
            const parts = rawToken.split(".");
            if (parts.length !== 3) return done(new UnauthorizedException("Token inválido."));
            const payloadJson = Buffer.from(parts[1] ?? "", "base64url").toString("utf8");
            const decoded = JSON.parse(payloadJson) as Auth0Payload;
            const header = JSON.parse(
              Buffer.from(parts[0] ?? "", "base64url").toString("utf8")
            ) as { kid?: string };
            const iss = decoded.iss ?? "";
            const isAuth0 = iss.includes("auth0.com") || iss.includes("auth0.net");
            if (!isAuth0 || !auth0Domain) {
              return done(new UnauthorizedException("Token não é do Auth0."));
            }
            const client = jwksRsa({
              jwksUri,
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 5,
            });
            const kid = header?.kid;
            if (!kid) return done(new UnauthorizedException("Token de autenticação inválido."));
            const key = await client.getSigningKey(kid);
            const publicKey = key.getPublicKey();
            done(null, publicKey);
          } catch (e) {
            done(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      },
    };
    super(options);
  }

  private async resolveProfileFromUserInfo(
    auth0Sub: string,
    auth0Domain: string | undefined,
    bearerToken: string | undefined,
    current: { email?: string; name?: string; picture?: string }
  ): Promise<{ email?: string; name?: string; picture?: string }> {
    const needEmail = !current.email?.trim();
    const needName = !current.name?.trim() || current.name.trim() === "User";
    const needPicture = !current.picture?.trim();
    if (!auth0Domain || !bearerToken || (!needEmail && !needName && !needPicture)) {
      return current;
    }

    const now = Date.now();
    const cached = this.userInfoCache.get(auth0Sub);
    let profile: Auth0UserInfoProfile | null =
      cached && cached.expiresAt > now ? cached.profile : null;

    if (!profile) {
      profile = await fetchAuth0UserInfo(auth0Domain, bearerToken);
      if (profile && (profile.email || profile.name || profile.picture)) {
        this.userInfoCache.set(auth0Sub, {
          expiresAt: now + Auth0JwtStrategy.USERINFO_CACHE_TTL_MS,
          profile,
        });
      }
    }

    if (!profile) return current;

    return {
      email: needEmail && profile.email ? profile.email : current.email,
      name: needName && profile.name ? profile.name : current.name,
      picture: needPicture && profile.picture ? profile.picture : current.picture,
    };
  }

  private async getSalesRepWhitelistEntry(email: string): Promise<{
    email: string;
    name?: string;
    commissionRate?: number;
    status: "ACTIVE" | "REVOKED";
  } | null> {
    try {
      const row = await this.prisma.systemSetting.findUnique({
        where: { key: "sales_rep_whitelist" },
      });
      if (!row || !row.value) return null;
      const parsed = JSON.parse(row.value);
      if (!Array.isArray(parsed)) return null;
      const clean = email.trim().toLowerCase();
      return parsed.find((item: { email?: string }) => item.email?.toLowerCase() === clean) || null;
    } catch {
      return null;
    }
  }

  private generateSalesRepReferralCode(name?: string, idHint?: string): string {
    const baseSlug =
      (name || "vendedor")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "rep";
    const suffix = (idHint || Math.random().toString(36).substring(2, 6)).slice(-4).toLowerCase();
    return `${baseSlug}-${suffix}`;
  }

  async validate(
    req: { headers?: Record<string, string | string[] | undefined> },
    payload: Auth0Payload
  ): Promise<JwtPayload> {
    const claimsNamespace =
      this.config.get<string>("AUTH0_CLAIMS_NAMESPACE") ?? "https://energivia.app";
    const auth0Domain = this.config.get<string>("AUTH0_DOMAIN");
    const auth0Audience = this.config.get<string>("AUTH0_AUDIENCE");
    const auth0ClientId = this.config.get<string>("AUTH0_CLIENT_ID");

    if (auth0Audience || auth0ClientId) {
      const aud = payload.aud;
      const isValidAud =
        (auth0Audience &&
          (aud === auth0Audience || (Array.isArray(aud) && aud.includes(auth0Audience)))) ||
        (auth0ClientId &&
          (aud === auth0ClientId || (Array.isArray(aud) && aud.includes(auth0ClientId))));
      if (!isValidAud) {
        throw new UnauthorizedException("Audiência do token inválida.");
      }
    }
    const auth0Sub = payload.sub;
    const bearerToken = extractBearerFromRequest(req);

    let rawEmail =
      getStringClaim(payload, "email") ??
      getStringClaim(payload, buildClaimKey(claimsNamespace, "email"));
    const nameFromParts = [
      getStringClaim(payload, "given_name"),
      getStringClaim(payload, "family_name"),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    let rawName =
      getStringClaim(payload, "name") ??
      getStringClaim(payload, buildClaimKey(claimsNamespace, "name")) ??
      (nameFromParts.length > 0 ? nameFromParts : undefined) ??
      getStringClaim(payload, "nickname");
    let rawPicture =
      getStringClaim(payload, "picture") ??
      getStringClaim(payload, buildClaimKey(claimsNamespace, "picture"));

    const merged = await this.resolveProfileFromUserInfo(auth0Sub, auth0Domain, bearerToken, {
      email: rawEmail?.trim().toLowerCase(),
      name: rawName,
      picture: rawPicture,
    });
    rawEmail = merged.email ?? rawEmail;
    rawName = merged.name ?? rawName;
    rawPicture = merged.picture ?? rawPicture;

    const normalizedEmail = rawEmail?.trim().toLowerCase();
    const orgIdHeader = Array.isArray(req.headers?.["x-organization-id"])
      ? req.headers["x-organization-id"][0]
      : (req.headers?.["x-organization-id"] as string | undefined);

    const salesRepEntry = normalizedEmail
      ? await this.getSalesRepWhitelistEntry(normalizedEmail)
      : null;
    const isAuthorizedSalesRep = salesRepEntry?.status === "ACTIVE";

    let user = await this.prisma.user.findFirst({
      where: { auth0Sub, deletedAt: null },
      include: {
        organizationMemberships: {
          where: { status: "ACCEPTED" },
          include: { organization: true },
        },
      },
    });

    // Se o usuário não foi encontrado pelo auth0Sub mas temos o e-mail,
    // verifica se a conta já existia no banco (ex: conta recriada no Auth0 após exclusão/reset de senha)
    if (!user && normalizedEmail) {
      const existingUserByEmail = await this.prisma.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          deletedAt: null,
        },
        include: {
          organizationMemberships: {
            where: { status: "ACCEPTED" },
            include: { organization: true },
          },
        },
      });

      if (existingUserByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            auth0Sub,
            ...(rawName && (existingUserByEmail.name === "User" || !existingUserByEmail.name)
              ? { name: rawName }
              : {}),
            ...(rawPicture && !existingUserByEmail.picture ? { picture: rawPicture } : {}),
            ...(isAuthorizedSalesRep && existingUserByEmail.role !== "PLATFORM_SALES"
              ? { role: "PLATFORM_SALES" }
              : {}),
          },
          include: {
            organizationMemberships: {
              where: { status: "ACCEPTED" },
              include: { organization: true },
            },
          },
        });
      }
    }

    if (!user) {
      const generatedRefCode = isAuthorizedSalesRep
        ? this.generateSalesRepReferralCode(rawName, auth0Sub)
        : undefined;
      const commissionRate =
        isAuthorizedSalesRep && salesRepEntry?.commissionRate
          ? Number(salesRepEntry.commissionRate) / 100
          : isAuthorizedSalesRep
            ? 0.1
            : undefined;

      user = await this.prisma.user.create({
        data: {
          auth0Sub,
          email: normalizedEmail ?? `${auth0Sub}@auth0.user`,
          name: rawName ?? "User",
          picture: rawPicture ?? undefined,
          role: isAuthorizedSalesRep ? "PLATFORM_SALES" : "SALES",
          referralCode: generatedRefCode,
          commissionRate,
        },
        include: {
          organizationMemberships: {
            where: { status: InvitationStatus.ACCEPTED },
            include: { organization: true },
          },
        },
      });

      if (normalizedEmail && !normalizedEmail.endsWith("@auth0.user")) {
        this.emailService
          .sendWelcomeEmail({
            toEmail: normalizedEmail,
            userName: rawName,
          })
          .catch(() => undefined);
      }
    } else {
      const shouldUpdateFallbackEmail =
        !!normalizedEmail &&
        (user.email.endsWith("@auth0.user") || user.email.toLowerCase() !== normalizedEmail);
      const shouldUpdateFallbackName =
        !!rawName && (user.name === "User" || user.name.trim().length === 0);
      const shouldUpdateFallbackPicture = !!rawPicture && !user.picture;

      const shouldPromoteToSales =
        isAuthorizedSalesRep && (user.role !== "PLATFORM_SALES" || !user.referralCode);
      const shouldDemoteFromSales =
        salesRepEntry?.status === "REVOKED" && user.role === "PLATFORM_SALES";

      let nextReferralCode = user.referralCode;
      if (shouldPromoteToSales && !nextReferralCode) {
        nextReferralCode = this.generateSalesRepReferralCode(user.name || rawName, user.id);
      }

      if (
        shouldUpdateFallbackEmail ||
        shouldUpdateFallbackName ||
        shouldUpdateFallbackPicture ||
        shouldPromoteToSales ||
        shouldDemoteFromSales
      ) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            ...(shouldUpdateFallbackEmail && { email: normalizedEmail }),
            ...(shouldUpdateFallbackName && { name: rawName }),
            ...(shouldUpdateFallbackPicture && { picture: rawPicture }),
            ...(shouldPromoteToSales && {
              role: "PLATFORM_SALES",
              referralCode: nextReferralCode,
              commissionRate: salesRepEntry?.commissionRate
                ? Number(salesRepEntry.commissionRate) / 100
                : 0.1,
            }),
            ...(shouldDemoteFromSales && { role: "SALES" }),
          },
          include: {
            organizationMemberships: {
              where: { status: InvitationStatus.ACCEPTED },
              include: { organization: true },
            },
          },
        });
      }
    }

    if (normalizedEmail) {
      const pendingInvites = await this.prisma.organizationMember.findMany({
        where: {
          status: InvitationStatus.PENDING,
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
        select: { id: true, organizationId: true },
      });

      for (const invite of pendingInvites) {
        const alreadyMember = await this.prisma.organizationMember.findFirst({
          where: {
            organizationId: invite.organizationId,
            userId: user.id,
            status: InvitationStatus.ACCEPTED,
          },
          select: { id: true },
        });

        if (alreadyMember) {
          await this.prisma.organizationMember.delete({ where: { id: invite.id } });
          continue;
        }

        await this.prisma.organizationMember.update({
          where: { id: invite.id },
          data: {
            userId: user.id,
            email: null,
            status: InvitationStatus.ACCEPTED,
            joinedAt: new Date(),
          },
        });
      }

      if (pendingInvites.length > 0) {
        user = await this.prisma.user.findFirstOrThrow({
          where: { id: user.id, deletedAt: null },
          include: {
            organizationMemberships: {
              where: { status: InvitationStatus.ACCEPTED },
              include: { organization: true },
            },
          },
        });
      }
    }

    const roleClaim =
      getStringClaim(payload, buildClaimKey(claimsNamespace, "role")) ??
      getStringClaim(payload, "https://energivia.com.br/role");
    const isPlatformFromClaim = roleClaim?.trim().toLowerCase() === "platform";

    const platformAdminEmails = (process.env["PLATFORM_ADMIN_EMAILS"] ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isPlatformFromEnv =
      platformAdminEmails.length > 0 &&
      typeof user.email === "string" &&
      platformAdminEmails.includes(user.email.toLowerCase());

    const isPlatformAdmin = isPlatformFromClaim || isPlatformFromEnv;
    const isPlatformSales = (user.role as string) === "PLATFORM_SALES";

    const memberships = user.organizationMemberships;
    if (memberships.length === 0) {
      return {
        sub: user.id,
        email: user.email,
        tenantId: "",
        role: isPlatformAdmin
          ? ("PLATFORM" as const)
          : isPlatformSales
            ? ("PLATFORM_SALES" as const)
            : "VIEWER",
      };
    }

    const organizationId = orgIdHeader ?? memberships[0]?.organizationId;
    const membership = memberships.find((m) => m.organizationId === organizationId);
    if (!membership && orgIdHeader) {
      throw new UnauthorizedException("Usuário não é membro da organização selecionada.");
    }
    const active = membership ?? memberships[0];
    if (!active) {
      throw new UnauthorizedException("Não há associação ativa a uma organização.");
    }

    return {
      sub: user.id,
      email: user.email,
      tenantId: active.organizationId,
      role: isPlatformAdmin
        ? ("PLATFORM" as const)
        : isPlatformSales
          ? ("PLATFORM_SALES" as const)
          : (active.role as OrgRole & import("@energivia/types").UserRole),
    };
  }
}
