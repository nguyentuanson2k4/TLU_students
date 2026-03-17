import { AuthService } from './auth.service';
import { Prisma } from '@prisma/client';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(createUserDto: Prisma.UserCreateInput): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        provider: import("@prisma/client").$Enums.Provider;
        providerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(req: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            firstName: any;
            lastName: any;
        };
    }>;
    googleAuth(req: any): Promise<void>;
    googleAuthRedirect(req: any): Promise<"No user from google" | {
        access_token: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.Role;
            firstName: string | null;
            lastName: string | null;
        };
    }>;
}
