'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CommonFunction } from '@/common';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-toastify';
import PermissionGuard from '@/components/PermissionGuard';
import OrganismFormation from '@/components/Organisms/OrganismFormation/OrganismFormation';
import { Comments } from '@/components/Organisms';
import { sendNotifications } from '@/common/Notifications/notify';
import { AtomInput } from '@/components/Atoms';
import { usePublicationSummary } from '@/hooks/usePublicationSummary';

interface PublicationFile {
    id: number;
    file_path: string;
    file_name: string;
    file_size: number | null;
}

interface Publication {
    id: number;
    title: string;
    description: string;
    content: string;
    is_visible: boolean;
    files: PublicationFile[];
    creator_id: number;
    creator?: { id: number; name: string; email: string };
    comments_count?: number;
    created_at: string;
    updated_at: string;
}

interface Group {
    id: number;
    name: string;
    description: string | null;
    creator_id: number;
    creator: { id: number; name: string; email: string };
    members_count?: number;
    created_at: string;
}

function isImageFile(fileName: string | null | undefined): boolean {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');
}

function isPdfFile(fileName: string | null | undefined): boolean {
    if (!fileName) return false;
    return fileName.toLowerCase().endsWith('.pdf');
}

function renderMarkdownSummary(markdownText: string) {
    if (!markdownText) return null;

    const parseBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-black">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const lines = markdownText.split('\n');
    const elements = [];
    let inList = false;
    let listItems: any[] = [];
    let listType = '';

    const pushList = () => {
        if (listItems.length > 0) {
            elements.push(
                listType === 'ul' ? (
                    <ul key={`list-${elements.length}`} className="space-y-1.5 list-disc list-inside text-gray-700 pl-2 mb-3">
                        {listItems}
                    </ul>
                ) : (
                    <ol key={`list-${elements.length}`} className="space-y-1.5 list-decimal list-inside text-gray-700 pl-2 mb-3">
                        {listItems}
                    </ol>
                )
            );
            listItems = [];
            inList = false;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
            pushList();
            continue;
        }

        // Heading 1 (primary-600)
        let match = line.match(/^#\s+(.+)/);
        if (match) {
            pushList();
            elements.push(
                <div key={`h1-${i}`} className="font-bold text-tertiaires-rouge text-xl tracking-tight pt-4 pb-2 border-b-2 border-tertiaires-rouge/20 mb-3 mt-2">
                    {parseBold(match[1])}
                </div>
            );
            continue;
        }

        // Heading 2 (primary-400)
        match = line.match(/^##\s+(.+)/);
        if (match) {
            pushList();
            elements.push(
                <div key={`h2-${i}`} className="font-bold text-tertiaires-vert text-lg tracking-tight pt-3 pb-1 border-b border-tertiaires-vert/20 mb-2 mt-2">
                    {parseBold(match[1])}
                </div>
            );
            continue;
        }

        // Heading 3 (gray-800)
        match = line.match(/^###\s+(.+)/);
        if (match) {
            pushList();
            elements.push(
                <div key={`h3-${i}`} className="font-bold text-tertiaires-vert text-base tracking-tight pt-2 mt-1 mb-1">
                    {parseBold(match[1])}
                </div>
            );
            continue;
        }

        // Unordered List
        match = line.match(/^[-*]\s+(.+)/);
        if (match) {
            if (inList && listType !== 'ul') pushList();
            inList = true;
            listType = 'ul';
            listItems.push(
                <li key={`li-${i}`} className="text-gray-700 leading-relaxed">
                    {parseBold(match[1])}
                </li>
            );
            continue;
        }

        // Ordered List
        match = line.match(/^\d+\.\s+(.+)/);
        if (match) {
            if (inList && listType !== 'ol') pushList();
            inList = true;
            listType = 'ol';
            listItems.push(
                <li key={`li-${i}`} className="text-gray-700 leading-relaxed">
                    {parseBold(match[1])}
                </li>
            );
            continue;
        }

        // Bold line
        if (line.match(/^\*\*(.+?)\*\*$/)) {
            pushList();
            elements.push(<p key={`p-${i}`} className="font-bold text-black text-base my-2">{parseBold(line)}</p>);
            continue;
        }

        // Regular Paragraph
        pushList();
        elements.push(
            <p key={`p-${i}`} className="text-gray-700 leading-relaxed text-justify mb-2">
                {parseBold(line)}
            </p>
        );
    }
    
    pushList();

    return <div className="space-y-1">{elements}</div>;
}

function isDocFile(fileName: string | null | undefined): boolean {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['doc', 'docx', 'txt'].includes(ext || '');
}

function isSheetFile(fileName: string | null | undefined): boolean {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['xls', 'xlsx', 'csv'].includes(ext || '');
}

function isPresentationFile(fileName: string | null | undefined): boolean {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['ppt', 'pptx'].includes(ext || '');
}

function getFileIcon(fileName: string | null | undefined): string {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf': return '📄';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'webp': return '🖼️';
        default: return '📎';
    }
}

function canPreviewInline(fileName: string | null | undefined): boolean {
    return isPdfFile(fileName) || isImageFile(fileName);
}

export default function GroupDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const groupId = params.groupId as string;
    const { user, isAdmin, isFormateur, can } = useAuth();
    const isFormateurUser = isAdmin || isFormateur;

    const deepLinkTab = searchParams.get('tab') as 'publications' | 'formations' | null;
    const deepLinkFormationId = searchParams.get('formation_id');
    const deepLinkQuizPubId = searchParams.get('quiz_pub_id');
    const deepLinkPublicationId = searchParams.get('publication_id');

    const [group, setGroup] = useState<Group | null>(null);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    const [showFormModal, setShowFormModal] = useState(false);
    const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
    const [formData, setFormData] = useState({ title: '', description: '', content: '' });
    const [files, setFiles] = useState<File[]>([]);
    const [filesToDelete, setFilesToDelete] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<Publication | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [linkedPub, setLinkedPub] = useState<Publication | null>(null);
    const [linkedFormations, setLinkedFormations] = useState<{ id: number; title: string; learners_count: number }[]>([]);
    const [linkedMessage, setLinkedMessage] = useState('');
    const [removePubConfirm, setRemovePubConfirm] = useState<{ formationId: number; formationTitle: string; pubId: number; pubTitle: string } | null>(null);
    const [removingPub, setRemovingPub] = useState(false);

    const [viewingPublication, setViewingPublication] = useState<Publication | null>(null);
    const [fileBlobUrls, setFileBlobUrls] = useState<Record<number, string>>({});
    const [activeTab, setActiveTab] = useState<'publications' | 'formations'>(isFormateurUser ? (deepLinkTab || 'publications') : 'formations');
    const [fullscreenFile, setFullscreenFile] = useState<{ url: string; filename: string; isPdf: boolean; isImage: boolean; pubId?: number; fileId?: number } | null>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const restartRef = useRef<() => void>(() => {});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const summarySectionRef = useRef<HTMLDivElement>(null);

    const { summaryText, setSummaryText, summaryStatus, generationError, isGenerating, generateSummary, fetchStatus } = usePublicationSummary();
    const [summaryMarkdownReady, setSummaryMarkdownReady] = useState(false);
    const [focusSummary, setFocusSummary] = useState(false);

    useEffect(() => {
        if (!fullscreenFile) return;
        const c = controlsRef.current;
        const o = overlayRef.current;
        const onEnd = () => {
            if (c) c.style.pointerEvents = 'none';
            if (o) o.style.pointerEvents = 'auto';
        };
        const restart = () => {
            if (c) { c.style.pointerEvents = ''; c.classList.remove('controls-idle'); void c.offsetWidth; c.classList.add('controls-idle'); }
            if (o) o.style.pointerEvents = 'none';
        };
        restartRef.current = restart;
        if (c) c.addEventListener('animationend', onEnd);
        const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
        events.forEach(ev => window.addEventListener(ev, restart));
        restart();
        return () => {
            events.forEach(ev => window.removeEventListener(ev, restart));
            if (c) c.removeEventListener('animationend', onEnd);
        };
    }, [fullscreenFile]);

    useEffect(() => {
        fetchGroup();
        fetchPublications();
    }, [groupId]);

    useEffect(() => {
        if (deepLinkPublicationId && publications.length > 0) {
            const pub = publications.find(p => p.id === Number(deepLinkPublicationId));
            handleViewPublication(pub || { id: Number(deepLinkPublicationId) });
            router.replace(`/dashboard/groups/${groupId}`);
        }
    }, [deepLinkPublicationId, publications]);

    useEffect(() => {
        if (!viewingPublication) {
            setFileBlobUrls({});
            return;
        }

        if (!viewingPublication.files?.length) return;

        let cancelled = false;
        const loadFiles = async () => {
            const headers = await CommonFunction.createHeaders({ withToken: true, contentType: null });
            const urls: Record<number, string> = {};
            for (const f of viewingPublication.files!) {
                try {
                    const res = await fetch(`/api/publications/${viewingPublication.id}/files/${f.id}`, { headers });
                    if (res.ok) {
                        const blob = await res.blob();
                        if (!cancelled) urls[f.id] = URL.createObjectURL(blob);
                    }
                } catch { /* ignore */ }
            }
            if (!cancelled) setFileBlobUrls(urls);
        };
        loadFiles();

        return () => { cancelled = true; };
    }, [viewingPublication]);

    const fetchGroup = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}`, { headers });
            if (res.status === 403) {
                setAccessDenied(true);
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setGroup(data.data || data || null);
            }
        } catch (error) {
            console.error('Error fetching group', error);
        }
    };

    const fetchPublications = async () => {
        setLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/publications`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPublications(data.data || data || []);
            }
        } catch (error) {
            console.error('Error fetching publications', error);
            toast.error('Erreur lors du chargement des publications.');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingPublication(null);
        setFormData({ title: '', description: '', content: '' });
        setFiles([]);
        setFilesToDelete([]);
        setSummaryText(null);
        setSummaryMarkdownReady(false);
        setShowFormModal(true);
    };

    const openEditModal = (pub: Publication) => {
        setEditingPublication(pub);
        setFormData({ title: pub.title, description: pub.description, content: pub.content });
        setFiles([]);
        setFilesToDelete([]);
        setSummaryText((pub as any).summary || null);
        setSummaryMarkdownReady(false);
        setShowFormModal(true);
        fetchStatus(pub.id);
        CommonFunction.createHeaders({ withToken: true }).then(headers =>
            fetch(`/api/publications/${pub.id}/markdown-status?_t=${Date.now()}`, { headers, cache: 'no-store' })
        ).then(r => r.ok ? r.json() : null).then(d => {
            if (d?.data?.markdown_available) setSummaryMarkdownReady(true);
        }).catch(() => {});
    };

    const openEditModalForSummary = (pub: Publication) => {
        openEditModal(pub);
        setFocusSummary(true);
    };

    useEffect(() => {
        if (showFormModal && focusSummary) {
            const t = setTimeout(() => {
                summarySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setFocusSummary(false);
            }, 200);
            return () => clearTimeout(t);
        }
    }, [showFormModal, focusSummary]);

    const allowedExtensions = ['jpg','jpeg','png','gif','bmp','webp','pdf'];

    const isExtensionValid = (fileName: string): boolean => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return allowedExtensions.includes(ext);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim() || !formData.content.trim()) {
            toast.error('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        const duplicateTitle = publications.some((p: any) =>
            p.id !== editingPublication?.id &&
            p.title.trim().toLowerCase() === formData.title.trim().toLowerCase()
        );
        if (duplicateTitle) {
            toast.error('Une publication avec ce titre existe déjà dans ce groupe.');
            return;
        }
        const MAX_FILE_SIZE = 20 * 1024 * 1024;
        const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
        let totalSize = 0;
        for (const f of files) {
            if (!isExtensionValid(f.name)) {
                toast.error(`"${f.name}" : format non accepté. Seules les images (jpg, png...) et les fichiers PDF sont autorisés.`);
                return;
            }
            if (f.size > MAX_FILE_SIZE) {
                toast.error(`"${f.name}" : fichier trop volumineux (max 20 Mo).`);
                return;
            }
            totalSize += f.size;
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            toast.error('La taille totale des fichiers ne peut pas dépasser 50 Mo.');
            return;
        }

        const existingPdfCount = editingPublication
            ? editingPublication.files.filter(f => isPdfFile(f.file_name) && !filesToDelete.includes(f.id)).length
            : 0;
        const newPdfCount = files.filter(f => isPdfFile(f.name)).length;
        if (existingPdfCount + newPdfCount > 1) {
            toast.error('Un seul fichier PDF peut être attaché à une publication.');
            return;
        }
        setSaving(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true, contentType: null });
            const form = new FormData();
            form.append('title', formData.title);
            form.append('description', formData.description);
            form.append('content', formData.content);
            form.append('is_visible', '1');
            if (summaryText !== null && summaryText !== undefined) {
                form.append('summary', summaryText);
            }
            files.forEach((f) => {
                form.append('files[]', f);
            });
            filesToDelete.forEach((id) => {
                form.append('delete_files[]', String(id));
            });

            let url: string;
            if (editingPublication) {
                url = `/api/groups/${groupId}/publications/${editingPublication.id}`;
            } else {
                url = `/api/groups/${groupId}/publications`;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: form,
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || (editingPublication ? 'Publication modifiée avec succès.' : 'Publication créée avec succès.'));
                setShowFormModal(false);
                setEditingPublication(null);
                fetchPublications();

                if (editingPublication) {
                    notifyCollaboratorsAboutPublicationEdit(editingPublication.id).catch(() => {});
                }
            } else {
                toast.error(data.message || 'Erreur lors de la sauvegarde de la publication.');
            }
        } catch (error) {
            console.error('Error saving publication', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSaving(false);
        }
    };

    const notifyCollaboratorsAboutPublicationEdit = async (publicationId: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const formationsRes = await fetch(`/api/groups/${groupId}/formations`, { headers });
            if (!formationsRes.ok) return;
            const formationsData = await formationsRes.json();
            const formations = formationsData.data || formationsData || [];
            const matchingFormations = formations.filter((f: any) =>
                f.formation_publications?.some((fp: any) => fp.publication_id === publicationId) ||
                f.publications?.some((p: any) => p.id === publicationId)
            );
            if (matchingFormations.length === 0) return;
            for (const formation of matchingFormations) {
                const learnersRes = await fetch(`/api/formations/${formation.id}/learners`, { headers });
                if (!learnersRes.ok) continue;
                const learnersData = await learnersRes.json();
                const learners = learnersData.data || learnersData || [];
                const userIds = learners.map((l: any) => l.user_id);
                if (userIds.length === 0) continue;
                await sendNotifications({
                    user_ids: userIds,
                    type: 'publication_updated',
                    title: 'Publication mise à jour',
                    message: `La publication "${formData.title}" liée à la formation "${formation.title}" a été modifiée.`,
                    data: { publication_id: publicationId, formation_id: formation.id, group_id: Number(groupId) },
                });
            }
        } catch (error) {
            console.error('Error notifying about publication edit:', error);
        }
    };

    const handleDelete = async (pub: Publication) => {
        setDeleting(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });

            const res = await fetch(`/api/groups/${groupId}/publications/${pub.id}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json();

            if (res.status === 409 && data.code === 'PUBLICATION_LINKED_TO_FORMATION') {
                setDeleteConfirm(null);
                setLinkedPub(pub);
                setLinkedFormations(data.formations || []);
                setLinkedMessage(data.message || 'Cette publication est liée à une ou plusieurs formations. Elle doit être retirée de toutes les formations avant d\'être supprimée.');
                return;
            }

            if (res.ok) {
                if (pub.files && pub.files.length > 0) {
                    for (const file of pub.files) {
                        await fetch(`/api/publications/${pub.id}/files/${file.id}`, {
                            method: 'DELETE',
                            headers,
                        });
                    }
                }
                toast.success(data.message || 'Publication supprimée.');
                setDeleteConfirm(null);
                setLinkedPub(null);
                setLinkedFormations([]);
                fetchPublications();
            } else {
                toast.error(data.message || 'Erreur lors de la suppression.');
            }
        } catch (error) {
            console.error('Error deleting publication', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setDeleting(false);
        }
    };

    const handleRemoveFromFormation = async () => {
        if (!removePubConfirm) return;
        setRemovingPub(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${removePubConfirm.formationId}/publications/${removePubConfirm.pubId}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Publication retirée de la formation.');
                setRemovePubConfirm(null);
                if (linkedPub) {
                    await handleDelete(linkedPub);
                }
            } else {
                toast.error(data.message || 'Erreur lors du retrait de la publication.');
            }
        } catch (error) {
            console.error('Error removing publication from formation', error);
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setRemovingPub(false);
        }
    };

    // const handleDeletePublicationFile = async (fileId: number) => {
    //     try {
    //         const headers = await CommonFunction.createHeaders({ withToken: true, contentType: null });
    //         const res = await fetch(`/api/publications/${editingPublication?.id || 0}/files/${fileId}`, {
    //             method: 'DELETE',
    //             headers,
    //         });
    //         const data = await res.json();
    //         if (res.ok) {
    //             toast.success(data.message || 'Fichier supprimé.');
    //             fetchPublications();
    //             if (editingPublication) {
    //                 setEditingPublication({
    //                     ...editingPublication,
    //                     files: editingPublication.files.filter(f => f.id !== fileId),
    //                 });
    //             }
    //         } else {
    //             toast.error(data.message || 'Erreur lors de la suppression du fichier.');
    //         }
    //     } catch (error) {
    //         console.error('Error deleting file', error);
    //         toast.error('Une erreur inattendue est survenue.');
    //     }
    // };

    const getFileNameLabel = (fileName: string | null | undefined): string => {
        if (!fileName) return 'fichier';
        const parts = fileName.split('/');
        return parts[parts.length - 1];
    };

    const formatFileSize = (bytes: number | null): string => {
        if (bytes === null || bytes === undefined) return '';
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
    };

    const downloadFile = async (pubId: number, fileId: number, filename: string) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true, contentType: null });
            const res = await fetch(`/api/publications/${pubId}/files/${fileId}?download=1`, { headers });
            if (!res.ok) return;
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } catch (error) {
            console.error('Error downloading file', error);
        }
    };

    const handleViewPublication = async (pub: any) => {
        if (pub.files && pub.files.length > 0) {
            setViewingPublication(pub);
            return;
        }
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/publications/${pub.id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                const fullPub = data.data || data;
                if (fullPub.files && fullPub.files.length > 0) {
                    setViewingPublication(fullPub);
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching full publication:', error);
        }
        setViewingPublication(pub);
    };

    const handleCommentsCountChange = useCallback((pubId: number) => (count: number) => {
        setPublications(prev => {
            const target = prev.find(p => p.id === pubId);
            if (!target || target.comments_count === count) return prev;
            return prev.map(p => p.id === pubId ? { ...p, comments_count: count } : p);
        });
    }, []);

    const fileUrl = (pubId: number, fileId: number) => fileBlobUrls[fileId] || `/api/publications/${pubId}/files/${fileId}`;

    return (
        <PermissionGuard permission="voir-groupes" fallback="redirect">
        <div className="p-8">
            {accessDenied ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
                    <p className="text-gray-500 text-center max-w-md">
                        Vous n&apos;êtes pas membre de ce groupe. Veuillez contacter l&apos;administrateur ou le formateur pour obtenir l&apos;accès.
                    </p>
                    <Link
                        href="/dashboard/groups"
                        className="mt-6 px-6 py-2.5 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium"
                    >
                        Retour à mes groupes
                    </Link>
                </div>
            ) : (
            <>
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/dashboard/groups"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
                    aria-label="Retour"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {group?.name || 'Chargement...'}
                    </h1>
                    {group && (
                        <p className="text-gray-500 mt-1">
                            {group.description || 'Aucune description'}
                            <span className="ml-2 text-xs text-gray-400">
                                Créé par {group.creator?.name || 'Inconnu'} le {new Date(group.created_at).toLocaleDateString()}
                                {group.members_count !== undefined && ` · ${group.members_count} membre${group.members_count !== 1 ? 's' : ''}`}
                            </span>
                        </p>
                    )}
                </div>
            </div>

            {isFormateurUser ? (
                <>
                <div className="flex items-center border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('formations')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'formations'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Formations
                    </button>
                    <button
                        onClick={() => setActiveTab('publications')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'publications'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Publications
                    </button>
                    {activeTab === 'publications' && (
                        <button
                            onClick={openCreateModal}
                            className="ml-auto px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium text-sm"
                        >
                            + Créer une publication
                        </button>
                    )}
                </div>

                {activeTab === 'formations' && (
                    <OrganismFormation groupId={groupId} isFormateur={isFormateurUser} isAdmin={isAdmin} onViewPublication={handleViewPublication} initialFormationId={deepLinkFormationId} initialQuizPubId={deepLinkQuizPubId} />
                )}
                </>
            ) : (
                <>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Les formations</h2>
                <OrganismFormation groupId={groupId} isFormateur={false} isAdmin={false} onViewPublication={handleViewPublication} initialFormationId={deepLinkFormationId} initialQuizPubId={deepLinkQuizPubId} />
                </>
            )}

            {activeTab === 'publications' && (
                <>
            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement des publications...</div>
            ) : publications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100">
                    <p className="text-gray-500">Aucune publication pour le moment.</p>
                    {isFormateurUser && (
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium text-sm"
                        >
                            Créer votre première publication
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {publications.map((pub) => (
                        <div
                            key={pub.id}
                            className="bg-white rounded-lg shadow border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setViewingPublication(pub)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate">{pub.title}</h3>
                                        {(pub as any).in_formation && (
                                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-100 text-purple-700">
                                                Publication liée à une formation
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{pub.description}</p>
                                    <p className="text-sm text-gray-800 mt-3 line-clamp-3 whitespace-pre-wrap">{pub.content}</p>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        {pub.files && pub.files.length > 0 && pub.files.slice(0, 3).map((pf) => (
                                            <span key={pf.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-white text-gray-700 border border-gray-200">
                                                {getFileIcon(pf.file_name)} {getFileNameLabel(pf.file_name)}
                                            </span>
                                        ))}
                                        {pub.files && pub.files.length > 3 && (
                                            <span className="text-xs text-gray-400">+{pub.files.length - 3}</span>
                                        )}
                                        {pub.files && pub.files.length === 0 && (
                                            <span className="text-xs text-gray-400">Aucun fichier</span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            {new Date(pub.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                {(isAdmin || pub.creator_id === user?.id) && (
                                    <div className="flex items-center space-x-2 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>

                                        <button
                                            onClick={() => openEditModalForSummary(pub)}
                                            className="px-3 py-1.5 text-xs font-medium text-primary-400 bg-primary-400/10 hover:bg-primary-400/20 rounded-lg transition-colors"
                                        >
                                            Générer résumé
                                        </button>
                                        <button
                                            onClick={() => openEditModal(pub)}
                                            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                                        >
                                            Modifier
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(pub)}
                                            className="px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            )}

            {/* Create/Edit Modal */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            {editingPublication ? 'Modifier la publication' : 'Créer une publication'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                                <AtomInput
                                    id="pub-title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto"
                                    placeholder="Titre de la publication"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <AtomInput
                                    id="pub-desc"
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto"
                                    placeholder="Brève description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
                                <AtomInput
                                    id="pub-content"
                                    isTextArea={true}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    required
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none bg-white h-auto"
                                    placeholder="Contenu de la publication..."
                                />
                            </div>

                            {/* Existing files (only in edit mode) */}
                            {editingPublication && editingPublication.files.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fichiers actuels
                                    </label>
                                    <div className="space-y-2">
                                        {editingPublication.files.map((pf) => {
                                            const markedDeleted = filesToDelete.includes(pf.id);
                                            return (
                                                <div
                                                    key={pf.id}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${markedDeleted ? 'border-red-300 bg-red-50 line-through text-red-500' : 'border-gray-200 bg-gray-50'}`}
                                                >
                                                    <span>{getFileIcon(pf.file_name)}</span>
                                                    <span className="flex-1 truncate">{getFileNameLabel(pf.file_name)}</span>
                                                    {pf.file_size !== null && (
                                                        <span className="text-xs text-gray-400">({formatFileSize(pf.file_size)})</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (markedDeleted) {
                                                                setFilesToDelete(filesToDelete.filter(id => id !== pf.id));
                                                            } else {
                                                                setFilesToDelete([...filesToDelete, pf.id]);
                                                            }
                                                        }}
                                                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${markedDeleted ? 'text-primary-600 hover:bg-primary-100' : 'text-primary-500 hover:bg-primary-100'}`}
                                                    >
                                                        {markedDeleted ? 'Annuler' : 'Supprimer'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* File upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fichiers (max 20 Mo chacun, 50 Mo total)
                                </label>
                                <AtomInput
                                    id="pub-files"
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf"
                                    onChange={(e: any) => {
                                        const newFiles = Array.from(e.target.files || []) as File[];
                                        setFiles(prev => [...prev, ...newFiles]);
                                        e.target.value = '';
                                    }}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                                <p className="text-xs text-gray-400 mt-1">Formats acceptés : images (jpg, png, gif, bmp, webp) et PDF. Un seul fichier PDF par publication.</p>
                                <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                                    <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-xs text-amber-700">Les quizzes sont générés uniquement à partir des fichiers PDF. Les images ne participent pas à la génération de quiz.</p>
                                </div>
                                {files.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs">
                                                <span className="flex-1 truncate text-green-700">{f.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="text-primary-500 hover:text-primary-700 font-medium shrink-0"
                                                >
                                                    Retirer
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Résumé IA — visible uniquement pour formateur */}
                            {isFormateurUser && (
                                <div ref={summarySectionRef} className="border-t border-gray-200 pt-4 mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-gray-900">Résumé IA (optionnel)</h3>
                                        {(editingPublication && (summaryText || summaryStatus === 'draft')) && (
                                            <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Résumé généré</span>
                                        )}
                                    </div>

                                    {!editingPublication && !summaryText && (
                                        <p className="text-xs text-gray-400 italic">Cliquez sur le bouton « Générer résumé » de la publication pour créer le résumé IA.</p>
                                    )}

                                    {editingPublication && summaryStatus === 'idle' && !summaryText && !summaryMarkdownReady && (
                                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                            La conversion des PDF en Markdown est requise avant la génération du résumé.
                                        </p>
                                    )}

                                    {editingPublication && summaryStatus === 'idle' && !summaryText && summaryMarkdownReady && (
                                        <button
                                            type="button"
                                            onClick={() => generateSummary(editingPublication.id)}
                                            className="px-4 py-2 text-sm font-medium text-white bg-primary-400 rounded-[50px] hover:bg-primary-500 transition-all"
                                        >
                                            Générer le résumé IA
                                        </button>
                                    )}

                                    {isGenerating && (
                                        <div className="flex items-center gap-3 py-3">
                                            <svg className="animate-spin h-4 w-4 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span className="text-sm font-medium text-primary-400">Génération du résumé en cours...</span>
                                        </div>
                                    )}

                                    {summaryStatus === 'error' && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-red-600">{generationError || 'Erreur lors de la génération.'}</p>
                                            {editingPublication && (
                                                <button
                                                    type="button"
                                                    onClick={() => generateSummary(editingPublication.id)}
                                                    className="px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-[50px] transition-all"
                                                >
                                                    Réessayer
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {editingPublication && (summaryText || summaryStatus === 'draft') && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-gray-400">Vous pouvez modifier le résumé avant de l&apos;enregistrer.</p>
                                                {editingPublication && (
                                                    <button
                                                        type="button"
                                                        onClick={() => generateSummary(editingPublication.id)}
                                                        disabled={isGenerating}
                                                        className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isGenerating ? 'Régénération...' : 'Régénérer'}
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={summaryText || ''}
                                                onChange={(e) => setSummaryText(e.target.value)}
                                                rows={6}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none resize-y bg-white font-mono"
                                                placeholder="Le résumé généré apparaîtra ici..."
                                            />
                                            {summaryText && (
                                                <div className="border border-primary-400/20 rounded-xl bg-white overflow-hidden">
                                                    <div className="bg-primary-400/5 px-4 py-2 border-b border-primary-400/10">
                                                        <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Aperçu</span>
                                                    </div>
                                                    <div className="px-4 py-3 space-y-3 text-sm leading-relaxed text-gray-800">
                                                        {renderMarkdownSummary(summaryText)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFormModal(false);
                                        setEditingPublication(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${saving ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'}`}
                                >
                                    {saving ? 'Enregistrement...' : editingPublication ? 'Enregistrer les modifications' : 'Créer la publication'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Supprimer la publication</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            Êtes-vous sûr de vouloir supprimer la publication &quot;{deleteConfirm.title}&quot; ? Cette action est irréversible.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                                {deleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Linked Formations Modal */}
            {linkedPub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Suppression impossible</h2>
                        <p className="text-gray-600 text-sm mb-4">{linkedMessage}</p>

                        {linkedFormations.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {linkedFormations.map((f) => (
                                    <div key={f.id} className="flex items-center justify-between px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{f.title}</p>
                                            <p className="text-xs text-gray-500">{f.learners_count} collaborateur(s) assigné(s)</p>
                                        </div>
                                        <button
                                            onClick={() => setRemovePubConfirm({ formationId: f.id, formationTitle: f.title, pubId: linkedPub.id, pubTitle: linkedPub.title })}
                                            disabled={removingPub}
                                            className="ml-3 shrink-0 px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Retirer
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={() => { setLinkedPub(null); setLinkedFormations([]); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove From Formation Confirmation */}
            {removePubConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Retirer la publication</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            La publication &quot;{removePubConfirm.pubTitle}&quot; va être retirée de la formation &quot;{removePubConfirm.formationTitle}&quot;. Cela peut impacter la progression des collaborateurs assignés déjà à cette formation. Voulez-vous continuer ?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setRemovePubConfirm(null)}
                                disabled={removingPub}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleRemoveFromFormation()}
                                disabled={removingPub}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-lg transition-colors"
                            >
                                {removingPub ? 'Retrait...' : 'Oui, retirer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publication Detail Modal */}
            {viewingPublication && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setViewingPublication(null)}>
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate pr-4">
                                {viewingPublication.title}
                            </h2>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => {
                                        document.getElementById('publication-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                                >
                                    Ajouter un commentaire
                                </button>
                                <button
                                    onClick={() => setViewingPublication(null)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div>
                                <p className="text-sm text-gray-600">{viewingPublication.description}</p>
                                <p className="mt-3 text-sm text-gray-800 whitespace-pre-wrap">{viewingPublication.content}</p>
                                <p className="mt-2 text-xs text-gray-400">
                                    Publié par {viewingPublication.creator?.name || 'Inconnu'} le {new Date(viewingPublication.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            {viewingPublication.files && viewingPublication.files.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                        Fichiers ({viewingPublication.files.length})
                                    </h3>
                                    <div className="grid gap-4">
                                        {viewingPublication.files.map((pf) => (
                                            <div key={pf.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-lg">{getFileIcon(pf.file_name)}</span>
                                                    <span className="text-sm font-medium text-gray-700">{getFileNameLabel(pf.file_name)}</span>
                                                    {pf.file_size !== null && (
                                                        <span className="text-xs text-gray-400">({formatFileSize(pf.file_size)})</span>
                                                    )}
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        {canPreviewInline(pf.file_name) && (
                                                            <button
                                                                onClick={() => setFullscreenFile({
                                                                    url: fileUrl(viewingPublication.id, pf.id),
                                                                    filename: getFileNameLabel(pf.file_name),
                                                                    isPdf: isPdfFile(pf.file_name),
                                                                    isImage: isImageFile(pf.file_name),
                                                                    pubId: viewingPublication.id,
                                                                    fileId: pf.id,
                                                                })}
                                                                className="text-xs text-primary-600 hover:text-primary-800 underline"
                                                            >
                                                                Plein écran
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => downloadFile(viewingPublication.id, pf.id, getFileNameLabel(pf.file_name))}
                                                            className="text-xs text-primary-600 hover:text-primary-800 underline"
                                                        >
                                                            Télécharger
                                                        </button>
                                                    </div>
                                                </div>
                                                {isPdfFile(pf.file_name) ? (
                                                    <iframe
                                                        src={fileUrl(viewingPublication.id, pf.id)}
                                                        className="w-full rounded-lg border border-gray-200"
                                                        style={{ height: '60vh' }}
                                                        title={pf.file_name}
                                                    />
                                                ) : isImageFile(pf.file_name) ? (
                                                    <img
                                                        src={fileUrl(viewingPublication.id, pf.id)}
                                                        alt={pf.file_name}
                                                        className="max-w-full max-h-[60vh] rounded-lg border border-gray-200 object-contain"
                                                    />
                                                ) : isDocFile(pf.file_name) || isSheetFile(pf.file_name) || isPresentationFile(pf.file_name) ? (
                                                    <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                        <span className="text-4xl mb-3">
                                                            {isDocFile(pf.file_name) ? '📝' : isSheetFile(pf.file_name) ? '📊' : '📽️'}
                                                        </span>
                                                        <span>Aperçu non disponible pour ce type de fichier.</span>
                                                        <button
                                                            onClick={() => downloadFile(viewingPublication.id, pf.id, getFileNameLabel(pf.file_name))}
                                                            className="mt-3 text-xs text-primary-600 hover:text-primary-800 underline"
                                                        >
                                                            Télécharger le fichier
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                        <span className="text-4xl mb-3">📎</span>
                                                        <span>Aperçu non disponible pour ce type de fichier.</span>
                                                        <button
                                                            onClick={() => downloadFile(viewingPublication.id, pf.id, getFileNameLabel(pf.file_name))}
                                                            className="mt-3 text-xs text-primary-600 hover:text-primary-800 underline"
                                                        >
                                                            Télécharger le fichier
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewingPublication.files && viewingPublication.files.length === 0 && (
                                <div className="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
                                    Aucun fichier joint à cette publication.
                                </div>
                            )}

                            {(viewingPublication as any).summary && (
                                <div className="border-t pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-700">
                                            Résumé IA
                                        </h3>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const headers = await CommonFunction.createHeaders({ withToken: true });
                                                    const res = await fetch(`/api/publications/${viewingPublication.id}/summary/pdf`, { headers });
                                                    if (!res.ok) {
                                                        toast.error('Erreur lors du téléchargement du PDF. Le résumé est peut-être vide ou en cours de génération.');
                                                        return;
                                                    }
                                                    const blob = await res.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `${(viewingPublication.title || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_resume.pdf`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                    toast.success('PDF téléchargé avec succès.');
                                                } catch {
                                                    toast.error('Une erreur est survenue lors du téléchargement.');
                                                }
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-lg transition-colors shadow-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Télécharger PDF
                                        </button>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-5 text-sm leading-relaxed space-y-3">
                                        {renderMarkdownSummary((viewingPublication as any).summary as string)}
                                    </div>
                                </div>
                            )}

                            <Comments
                                publicationId={viewingPublication.id}
                                currentUserId={user?.id}
                                currentUserRole={isAdmin ? 'Admin' : isFormateur ? 'Formateur' : 'Collaborateur'}
                                canCreate={can('creer-commentaires')}
                                onCountChange={handleCommentsCountChange(viewingPublication.id)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen File Viewer */}
            {fullscreenFile && (
                <div
                    className="fixed inset-0 z-[60] bg-black"
                    onClick={() => setFullscreenFile(null)}
                >
                    <div
                        ref={controlsRef}
                        className="controls-idle absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 px-6 py-5 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!fullscreenFile.isPdf && (
                            <button
                                onClick={(e) => { e.stopPropagation(); downloadFile(fullscreenFile.pubId!, fullscreenFile.fileId!, fullscreenFile.filename); }}
                                className="flex items-center justify-center w-14 h-14 rounded-lg bg-gray-800 hover:bg-gray-700 text-primary-400 hover:text-primary-300 transition-all"
                                title="Télécharger"
                            >
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setFullscreenFile(null); }}
                            className="flex items-center justify-center w-14 h-14 rounded-lg bg-gray-800 hover:bg-gray-700 text-primary-400 hover:text-primary-300 transition-all"
                            title="Fermer"
                        >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div
                        ref={overlayRef}
                        className="absolute inset-0 z-[1] pointer-events-none"
                        onMouseMove={(e) => { e.stopPropagation(); restartRef.current(); }}
                        onMouseDown={(e) => { e.stopPropagation(); restartRef.current(); }}
                        onClick={(e) => { e.stopPropagation(); }}
                    />
                    <div className="w-full h-full relative z-0" onClick={(e) => e.stopPropagation()}>
                        {fullscreenFile.isPdf ? (
                            <iframe
                                src={fullscreenFile.url}
                                className="w-full h-full"
                                title={fullscreenFile.filename}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-8">
                                <img
                                    src={fullscreenFile.url}
                                    alt={fullscreenFile.filename}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
            </>)}
        </div>
        </PermissionGuard>
    );
}
