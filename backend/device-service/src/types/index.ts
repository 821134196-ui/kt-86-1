import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface MemberWithRole {
  userId: string;
  role: Role;
}
