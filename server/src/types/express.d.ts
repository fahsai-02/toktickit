import type { UserRole } from "../generated/prisma/client.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export type AuthedUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}