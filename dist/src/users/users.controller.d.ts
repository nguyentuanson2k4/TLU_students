import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: Prisma.UserCreateInput): Promise<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        provider: import("@prisma/client").$Enums.Provider;
        providerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        provider: import("@prisma/client").$Enums.Provider;
        providerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findById(id: string): Promise<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        provider: import("@prisma/client").$Enums.Provider;
        providerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    update(id: string, updateUserDto: Prisma.UserUpdateInput): Promise<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        provider: import("@prisma/client").$Enums.Provider;
        providerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        provider: import("@prisma/client").$Enums.Provider;
        providerId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
