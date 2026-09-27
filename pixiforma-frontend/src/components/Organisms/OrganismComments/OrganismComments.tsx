import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CommonFunction } from '@/common';
import { Avatar } from '@/components/Atoms';
import { IComment, IOrganismComments } from '@/interfaces';

const formatDateTime = (date: string | null | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const PER_PAGE = 20;

const loadedCountOf = (list: IComment[]): number =>
    list.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

const OrganismComments = ({
    publicationId,
    currentUserId,
    currentUserRole,
    canCreate = true,
    onCountChange,
}: IOrganismComments) => {
    const [comments, setComments] = useState<IComment[]>([]);
    const [content, setContent] = useState('');
    const [replyTo, setReplyTo] = useState<IComment | null>(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingComment, setEditingComment] = useState<IComment | null>(null);
    const [editContent, setEditContent] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchComments = async (pageToLoad = 1, append = false) => {
        if (pageToLoad === 1) setLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/comments?page=${pageToLoad}&per_page=${PER_PAGE}`, { headers });
            if (res.ok) {
                const data = await res.json();
                const list = data.data || [];
                setComments(prev => append ? [...prev, ...list] : list);
                setTotal(data.total ?? list.length);
                setHasMore(Boolean(data.has_more));
                setPage(pageToLoad);
                onCountChange?.(data.total ?? list.length);
            }
        } catch (error) {
            console.error('Error fetching comments', error);
        } finally {
            if (pageToLoad === 1) setLoading(false);
        }
    };

    const loadMore = async () => {
        setLoadingMore(true);
        await fetchComments(page + 1, true);
        setLoadingMore(false);
    };

    useEffect(() => {
        setComments([]);
        setReplyTo(null);
        setEditingComment(null);
        setTotal(0);
        setHasMore(false);
        if (publicationId) fetchComments(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicationId]);

    const handleAddComment = async () => {
        const text = content.trim();
        if (!text) return;
        setSending(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/comments`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(replyTo ? { content: text, parent_id: replyTo.id } : { content: text }),
            });
            if (res.ok) {
                const result = await res.json();
                const created = result.data as IComment;
                setComments(prev =>
                    created.parent_id
                        ? prev.map(c =>
                            c.id === created.parent_id
                                ? { ...c, replies: [...(c.replies || []), created] }
                                : c
                        )
                        : [created, ...prev]
                );
                const newTotal = total + 1;
                setTotal(newTotal);
                onCountChange?.(newTotal);
                setContent('');
                setReplyTo(null);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Erreur lors de l\'ajout du commentaire.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSending(false);
        }
    };

    const startEdit = (comment: IComment) => {
        setEditingComment(comment);
        setEditContent(comment.content);
    };

    const cancelEdit = () => {
        setEditingComment(null);
        setEditContent('');
    };

    const handleUpdateComment = async (comment: IComment) => {
        const text = editContent.trim();
        if (!text) return;
        setSavingEdit(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/comments/${comment.id}`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text }),
            });
            if (res.ok) {
                const result = await res.json();
                const updated = result.data as IComment;
                if (comment.parent_id) {
                    setComments(prev => prev.map(c =>
                        c.id === comment.parent_id
                            ? { ...c, replies: (c.replies || []).map(r => r.id === updated.id ? updated : r) }
                            : c
                    ));
                } else {
                    setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
                }
                cancelEdit();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Erreur lors de la modification du commentaire.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSavingEdit(false);
        }
    };

    const doDeleteComment = async (comment: IComment) => {
        setDeletingId(comment.id);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/comments/${comment.id}`, {
                method: 'DELETE',
                headers,
            });
            if (res.ok) {
                setComments(prev =>
                    comment.parent_id
                        ? prev.map(c =>
                            c.id === comment.parent_id
                                ? { ...c, replies: (c.replies || []).filter(r => r.id !== comment.id) }
                                : c
                        ).filter(c => c.id !== comment.id)
                        : prev.filter(c => c.id !== comment.id)
                );
                const delta = comment.parent_id ? 1 : 1 + (comment.replies?.length || 0);
                const newTotal = Math.max(0, total - delta);
                setTotal(newTotal);
                onCountChange?.(newTotal);
                toast.success('Commentaire supprimé.');
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Erreur lors de la suppression du commentaire.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const canEditComment = (comment: IComment) =>
        currentUserRole === 'Admin' || (currentUserId != null && comment.user_id === currentUserId);

    const canDeleteComment = (comment: IComment) => {
        if (currentUserRole === 'Admin') return true;
        if (currentUserRole === 'Formateur') {
            return (currentUserId != null && comment.user_id === currentUserId)
                || (comment.user?.roles?.some(r => r.name === 'Collaborateur') ?? false);
        }
        return currentUserId != null && comment.user_id === currentUserId;
    };

    const renderActions = (comment: IComment, isReply = false) => {
        if (confirmDeleteId === comment.id) {
            return (
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-red-600">Supprimer ce commentaire ?</span>
                    <button
                        onClick={() => doDeleteComment(comment)}
                        disabled={deletingId === comment.id}
                        className="px-2.5 py-1 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {deletingId === comment.id ? '...' : 'Oui, supprimer'}
                    </button>
                    <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3 mt-1.5">
                {!isReply && (
                    <button
                        onClick={() => { setReplyTo(comment); setEditingComment(null); setConfirmDeleteId(null); }}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                        Répondre
                    </button>
                )}
                {canEditComment(comment) && (
                    <button
                        onClick={() => { startEdit(comment); setConfirmDeleteId(null); }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Modifier
                    </button>
                )}
                {canDeleteComment(comment) && (
                    <button
                        onClick={() => { setConfirmDeleteId(comment.id); setEditingComment(null); }}
                        className="text-xs font-medium text-primary-500 hover:text-primary-700 transition-colors"
                    >
                        Supprimer
                    </button>
                )}
            </div>
        );
    };

    const renderCommentBody = (comment: IComment, isReply = false) => {
        const isEditing = editingComment?.id === comment.id;

        if (isEditing) {
            return (
                <div className="mt-1.5">
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => handleUpdateComment(comment)}
                            disabled={savingEdit || !editContent.trim()}
                            className="px-3 py-1 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {savingEdit ? '...' : 'Enregistrer'}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                {comment.edited_at && (
                    <p className="text-[11px] text-gray-400 italic mt-0.5">
                        (modifié le {formatDateTime(comment.edited_at)})
                    </p>
                )}
                {renderActions(comment, isReply)}
            </>
        );
    };

    const renderComment = (comment: IComment, isReply = false) => (
        <div key={comment.id} className={isReply ? 'pl-3' : ''}>
            <div className={`rounded-lg p-3 ${isReply ? 'bg-white border border-gray-100' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                    <Avatar name={comment.user?.name || 'Inconnu'} size={28} />
                    <span className="text-xs font-semibold text-gray-800">
                        {comment.user?.name || 'Inconnu'}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-auto shrink-0">
                        {formatDateTime(comment.created_at)}
                    </span>
                </div>
                {renderCommentBody(comment, isReply)}
            </div>
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                    {comment.replies.map(reply => renderComment(reply, true))}
                </div>
            )}
        </div>
    );

    return (
        <div id="publication-comments" className="border-t pt-6 scroll-mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Commentaires ({total})
            </h3>

            {canCreate && (
                <div className="mb-4">
                    {replyTo && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                                @{replyTo.user?.name || 'Inconnu'}
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="text-primary-500 hover:text-primary-700 ml-0.5"
                                    aria-label="Annuler la réponse"
                                >
                                    ✕
                                </button>
                            </span>
                            <button
                                onClick={() => setReplyTo(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Annuler la réponse
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={2}
                            placeholder={replyTo ? `Répondre à @${replyTo.user?.name || 'Inconnu'}...` : 'Écrire un commentaire...'}
                            className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white h-auto"
                        />
                        <button
                            onClick={handleAddComment}
                            disabled={sending || !content.trim()}
                            className="self-end px-4 py-2 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                        >
                            {sending ? '...' : 'Envoyer'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <p className="text-xs text-gray-400 italic">Chargement des commentaires...</p>
            ) : comments.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun commentaire pour le moment.</p>
            ) : (
                <>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {comments.map(comment => renderComment(comment))}
                    </div>
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="mt-3 w-full px-4 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? 'Chargement...' : `Afficher la suite (${Math.max(0, total - loadedCountOf(comments))} restants)`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default OrganismComments;
