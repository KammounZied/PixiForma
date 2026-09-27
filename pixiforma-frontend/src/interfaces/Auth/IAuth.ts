export interface Permission {
    id: number;
    name: string;
}

export interface Role {
    id: number;
    name: string;
    permissions: Permission[];
}

export interface IUserWithRoles {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    force_password_change: boolean;
    created_at: string;
    roles: Role[];
}
