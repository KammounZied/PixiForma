export interface ICommentUser {
    id: number;
    name: string;
    email: string;
    roles?: { id: number; name: string }[];
}

export interface IComment {
    id: number;
    publication_id: number;
    user_id: number;
    parent_id: number | null;
    content: string;
    edited_at: string | null;
    user?: ICommentUser;
    replies?: IComment[];
    created_at: string;
    updated_at: string;
}

interface IOrganismComments {
    publicationId: number;
    currentUserId?: number;
    currentUserRole?: 'Admin' | 'Formateur' | 'Collaborateur';
    canCreate?: boolean;
    onCountChange?: (count: number) => void;
}

export type { IOrganismComments }
