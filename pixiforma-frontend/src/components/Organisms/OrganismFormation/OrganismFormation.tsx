'use client';

import { useState, useEffect, useRef } from 'react';
import { CommonFunction } from '@/common';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
import { sendNotifications } from '@/common/Notifications/notify';
import { AtomInput } from '@/components/Atoms';
import OrganismQuizReview from '@/components/Organisms/OrganismQuizReview/OrganismQuizReview';
import OrganismQuizTaking from '@/components/Organisms/OrganismQuizTaking/OrganismQuizTaking';

interface Publication {
    id: number;
    title: string;
    description: string;
    content: string;
    files?: {
        id: number;
        file_name: string;
        file_url?: string;
        url?: string;
    }[];
}

interface FormationPublication {
    id: number;
    publication_id: number;
    order: number;
    recommended_duration_minutes: number | null;
    publication: Publication;
}

interface Formation {
    id: number;
    title: string;
    description: string;
    pedagogical_objective: string | null;
    start_date: string | null;
    duration_days: number | null;
    progression_mode: 'guided' | 'free';
    is_visible: boolean;
    max_attempts: number | null;
    min_pass_percentage: number | null;
    quiz_question_count: number | null;
    quiz_difficulty: string | null;
    quiz_time_per_question: number | null;
    creator: { id: number; name: string };
    publications: Publication[];
    formation_publications: FormationPublication[];
    my_status?: string;
    started_at?: string | null;
    deadline?: string | null;
    deadline_extended_days?: number;
    all_quizzes_ready?: boolean;
    created_at: string;
}

interface LearnerProgress {
    id: number;
    user_id: number;
    formation_id: number;
    status: string;
    started_at: string | null;
    blocked_at: string | null;
    deadline_extended_days?: number;
    user: { id: number; name: string; email: string };
    publication_progress: {
        id: number;
        publication_id: number;
        status: string;
        quiz_attempts: number;
        bonus_attempts?: number;
        quiz_highest_score: number | null;
        completed_at: string | null;
        publication: { id: number; title: string };
    }[];
    enriched_publications?: {
        publication_id: number;
        order: number;
        title: string;
        status: string;
        is_locked: boolean;
        lock_reason: string | null;
        quiz_attempts: number;
        quiz_highest_score: number | null;
        completed_at: string | null;
    }[];
}

interface Props {
    groupId: string;
    isFormateur: boolean;
    isAdmin: boolean;
    onViewPublication?: (publication: any) => void;
    initialFormationId?: string | null;
    initialQuizPubId?: string | null;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

export default function OrganismFormation({ groupId, isFormateur, isAdmin, onViewPublication, initialFormationId, initialQuizPubId }: Props) {
    useAuth();
    const isFormateurUser = isFormateur || isAdmin;
    const [formations, setFormations] = useState<Formation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
    const [formData, setFormData] = useState({
        title: '', description: '', pedagogical_objective: '',
        start_date: '', duration_days: '',
        progression_mode: 'guided',
        max_attempts: '3', min_pass_percentage: '70',
        quiz_question_count: '10', quiz_time_per_question: '15',
    });
    const [selectedPubIds, setSelectedPubIds] = useState<number[]>([]);
    const [recommendedDurations, setRecommendedDurations] = useState<Record<number, number>>({});
    const [availablePubs, setAvailablePubs] = useState<Publication[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Formation | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [removePubConfirm, setRemovePubConfirm] = useState<{ formation: Formation; fp: FormationPublication } | null>(null);
    const [removingPub, setRemovingPub] = useState(false);
    const [detailFormation, setDetailFormation] = useState<Formation | null>(null);
    const [learners, setLearners] = useState<LearnerProgress[]>([]);
    const [collaborators, setCollaborators] = useState<{ id: number; name: string; email: string }[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [loadingCollaborators, setLoadingCollaborators] = useState(false);
    const [remainingTime, setRemainingTime] = useState<string>('');
    const [quizReviewPub, setQuizReviewPub] = useState<{ pubId: number; pubTitle: string } | null>(null);
    const [quizTakingPub, setQuizTakingPub] = useState<{ pubId: number; pubTitle: string } | null>(null);
    const createdFormationIds = useRef<Set<number>>(new Set());
    const [generatingQuizPubId, setGeneratingQuizPubId] = useState<number | null>(null);
    const [blockRequests, setBlockRequests] = useState<any[]>([]);
    const [, setLoadingBlockRequests] = useState(false);
    const [blockRequestLoading, setBlockRequestLoading] = useState<number | null>(null);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);

    useEffect(() => {
        if (!detailFormation || !detailFormation.started_at || !detailFormation.duration_days) {
            setRemainingTime('');
            return;
        }
        const extendedDays = detailFormation.deadline_extended_days || 0;
        const deadline = new Date(detailFormation.started_at).getTime() + (detailFormation.duration_days + extendedDays) * 24 * 60 * 60 * 1000;
        const update = () => {
            const now = Date.now();
            const diff = deadline - now;
            if (diff <= 0) { setRemainingTime('Temps écoulé'); return; }
            const totalDays = Math.floor(diff / (24 * 60 * 60 * 1000));
            const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            setRemainingTime(`${totalDays} jours ${hours}h`);
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [detailFormation?.started_at, detailFormation?.duration_days]);

    useEffect(() => {
        fetchFormations();
    }, [groupId]);

    const deepLinkFormationHandled = useRef(false);
    const deepLinkQuizHandled = useRef(false);

    useEffect(() => {
        if (deepLinkFormationHandled.current) return;
        if (!initialFormationId || formations.length === 0) return;
        const formation = formations.find(f => f.id === Number(initialFormationId));
        if (formation) {
            deepLinkFormationHandled.current = true;
            openDetail(formation);
        }
    }, [initialFormationId, formations]);

    useEffect(() => {
        if (deepLinkQuizHandled.current) return;
        if (!initialQuizPubId || !detailFormation) return;
        const fp = detailFormation.formation_publications?.find(
            (fp: any) => fp.publication_id === Number(initialQuizPubId)
        );
        if (fp) {
            deepLinkQuizHandled.current = true;
            const pubTitle = fp.publication?.title || '';
            if (isFormateurUser) {
                setQuizReviewPub({ pubId: Number(initialQuizPubId), pubTitle });
            } else {
                setQuizTakingPub({ pubId: Number(initialQuizPubId), pubTitle });
            }
        }
    }, [initialQuizPubId, detailFormation]);

    const fetchFormations = async () => {
        setLoading(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/formations`, { headers });
            if (res.ok) {
                const data = await res.json();
                setFormations(data.data || data || []);
            }
        } catch (error) {
            console.error('Error fetching formations', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = async () => {
        setEditingFormation(null);
        setFormData({ title: '', description: '', pedagogical_objective: '', start_date: '', duration_days: '', progression_mode: 'guided', max_attempts: '3', min_pass_percentage: '70', quiz_question_count: '10', quiz_time_per_question: '15' });
        setSelectedPubIds([]);
        setRecommendedDurations({});
        await fetchAvailablePublications();
        await fetchGroupMembers();
        setShowFormModal(true);
    };

    const openEditModal = async (formation: Formation) => {
        setEditingFormation(formation);
        setFormData({
            title: formation.title,
            description: formation.description,
            pedagogical_objective: formation.pedagogical_objective || '',
            start_date: formation.start_date || '',
            duration_days: formation.duration_days ? String(formation.duration_days) : '',
            progression_mode: formation.progression_mode,
            max_attempts: String(formation.max_attempts || ''),
            min_pass_percentage: String(formation.min_pass_percentage || ''),
            quiz_question_count: String(formation.quiz_question_count || '10'),
            quiz_time_per_question: String(formation.quiz_time_per_question || '15'),
        });
        setSelectedPubIds(formation.formation_publications?.map((fp: any) => fp.publication_id) || formation.publications?.map((p: any) => p.id) || []);
        const durations: Record<number, number> = {};
        formation.formation_publications?.forEach((fp: any) => {
            if (fp.recommended_duration_minutes) {
                durations[fp.publication_id] = fp.recommended_duration_minutes;
            }
        });
        setRecommendedDurations(durations);
        await fetchAvailablePublications();
        await fetchGroupMembers();
        setShowFormModal(true);
    };

    const fetchGroupMembers = async () => {
        setLoadingCollaborators(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/members`, { headers });
            if (res.ok) {
                const data = await res.json();
                const members = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (Array.isArray(data.members) ? data.members : data.data?.members || []));
                setCollaborators(members);
                setSelectedUserIds(members.map((m: { id: number }) => m.id));
            } else {
                console.error('Failed to fetch group members:', res.status, await res.text().catch(() => ''));
            }
        } catch (err) {
            console.error('Error in fetchGroupMembers:', err);
        } finally {
            setLoadingCollaborators(false);
        }
    };

    const fetchAvailablePublications = async () => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/groups/${groupId}/publications`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAvailablePubs(data.data || data || []);
            }
        } catch { /* ignored */ }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) {
            toast.error('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        const duplicateTitle = formations.some((f) =>
            f.id !== editingFormation?.id &&
            f.title.trim().toLowerCase() === formData.title.trim().toLowerCase()
        );
        if (duplicateTitle) {
            toast.error('Une formation avec ce titre existe déjà dans ce groupe.');
            return;
        }

        if (formData.progression_mode === 'guided') {
            const totalDurationDays = Number(formData.duration_days) || 0;
            const totalRecommendedDays = Object.values(recommendedDurations).reduce((sum, d) => sum + (d || 0), 0);
            if (totalDurationDays > 0 && totalRecommendedDays > totalDurationDays) {
                toast.error('La somme des durées recommandées des publications dépasse la durée totale de la formation.');
                return;
            }

            if (formData.start_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const selected = new Date(formData.start_date + 'T00:00:00');
                if (selected < today) {
                    toast.error('La date de début ne peut pas être antérieure à la date d\'aujourd\'hui.');
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const body: Record<string, any> = {
                title: formData.title,
                description: formData.description,
                pedagogical_objective: formData.pedagogical_objective || null,
                progression_mode: formData.progression_mode,
            };

            if (formData.progression_mode === 'guided') {
                body.start_date = formData.start_date || null;
                body.duration_days = Number(formData.duration_days) || null;
                body.max_attempts = formData.max_attempts ? Number(formData.max_attempts) : null;
                body.min_pass_percentage = formData.min_pass_percentage ? Number(formData.min_pass_percentage) : null;
                body.quiz_question_count = formData.quiz_question_count ? Number(formData.quiz_question_count) : null;
                body.quiz_time_per_question = formData.quiz_time_per_question ? Number(formData.quiz_time_per_question) : null;
            }

            let url = `/api/groups/${groupId}/formations`;
            let method = 'POST';

            if (editingFormation) {
                url = `/api/formations/${editingFormation.id}`;
                method = 'PUT';
                body.publication_ids = selectedPubIds;
                body.recommended_durations = recommendedDurations;
            }

            const res = await fetch(url, {
                method,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
                const formationId = editingFormation ? editingFormation.id : (data.data?.id || data.id);
                if (formationId) {
                    const assignRes = await fetch(`/api/formations/${formationId}/assign`, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_ids: selectedUserIds }),
                    });
                    const assignData = await assignRes.json();
                    toast.success(editingFormation ? 'Formation modifiée.' : 'Formation créée.');
                    if (!editingFormation && formationId) createdFormationIds.current.add(formationId);
                    if (!assignRes.ok) {
                        toast.warn(assignData.message || 'Erreur lors de l\'assignation des apprenants.');
                    }

                    if (editingFormation && selectedUserIds.length > 0) {
                        const oldPubIds = editingFormation.formation_publications?.map((fp: any) => fp.publication_id) || [];
                        const newPubIds = selectedPubIds;
                        const added = newPubIds.filter((id: number) => !oldPubIds.includes(id));
                        const removed = oldPubIds.filter((id: number) => !newPubIds.includes(id));
                        if (added.length > 0 || removed.length > 0) {
                            sendNotifications({
                                user_ids: selectedUserIds,
                                type: 'training_publications_updated',
                                title: 'Formation mise à jour',
                                message: `La formation "${formData.title}" a été modifiée : ${added.length > 0 ? `+${added.length} publication(s) ajoutée(s)` : ''}${added.length > 0 && removed.length > 0 ? ', ' : ''}${removed.length > 0 ? `-${removed.length} publication(s) supprimée(s)` : ''}.`,
                                data: { formation_id: formationId, group_id: Number(groupId) },
                            });
                        }
                    }

                    if (!editingFormation && selectedPubIds.length > 0) {
                        const pubRes = await fetch(`/api/formations/${formationId}/publications`, {
                            method: 'POST',
                            headers: { ...headers, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                publication_ids: selectedPubIds,
                                recommended_durations: recommendedDurations,
                            }),
                        });
                        if (!pubRes.ok) {
                            const pubErr = await pubRes.json().catch(() => ({}));
                            toast.warn(pubErr.message || 'Formation créée, mais erreur lors de l\'association des publications.');
                        }
                    }
                } else {
                    toast.success(data.message || (editingFormation ? 'Formation modifiée.' : 'Formation créée.'));
                }
                setShowFormModal(false);
                setEditingFormation(null);
                fetchFormations();
            } else {
                toast.error(data.message || 'Erreur lors de la sauvegarde.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (formation: Formation, deletePublications: boolean = false) => {
        setDeleting(true);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });

            let learnerIds: number[] = [];
            try {
                const learnersRes = await fetch(`/api/formations/${formation.id}/learners`, { headers });
                if (learnersRes.ok) {
                    const learnersData = await learnersRes.json();
                    const learners = learnersData.data || learnersData || [];
                    learnerIds = learners.map((l: any) => l.user_id);
                }
            } catch { /* ignored */ }

            const res = await fetch(`/api/formations/${formation.id}`, {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                // La formation est supprimée : les publications ne sont plus liées,
                // on peut alors les supprimer définitivement
                if (deletePublications) {
                    const pubs = formation.publications || [];
                    for (const pub of pubs) {
                        if (pub.files && pub.files.length > 0) {
                            for (const file of pub.files) {
                                await fetch(`/api/publications/${pub.id}/files/${file.id}`, {
                                    method: 'DELETE',
                                    headers,
                                });
                            }
                        }
                        await fetch(`/api/groups/${groupId}/publications/${pub.id}`, {
                            method: 'DELETE',
                            headers,
                        });
                    }
                }

                toast.success(data.message || 'Formation supprimée.');
                setDeleteConfirm(null);
                fetchFormations();

                if (learnerIds.length > 0) {
                    sendNotifications({
                        user_ids: learnerIds,
                        type: 'training_deleted',
                        title: 'Formation supprimée',
                        message: `La formation "${formation.title}" a été supprimée.`,
                        data: { group_id: Number(groupId) },
                    });
                }
            } else {
                toast.error(data.message || 'Erreur lors de la suppression.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setDeleting(false);
        }
    };

    const handleRemovePublication = async () => {
        if (!removePubConfirm) return;
        setRemovingPub(true);
        const { formation, fp } = removePubConfirm;
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formation.id}/publications/${fp.publication_id}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Publication retirée de la formation.');
                setRemovePubConfirm(null);
                await fetchFormations();
                if (detailFormation && detailFormation.id === formation.id) {
                    await openDetail(formation);
                }
            } else {
                toast.error(data.message || 'Erreur lors du retrait de la publication.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setRemovingPub(false);
        }
    };

    const checkFormationQuizReadiness = async (formationId: number): Promise<boolean> => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const detailRes = await fetch(`/api/formations/${formationId}`, { headers });
            if (!detailRes.ok) return false;
            const detail = await detailRes.json();
            const detailData = detail.data || detail;
            const pubs = detailData.formation_publications || [];
            if (pubs.length === 0) return true;
            const results = await Promise.all(pubs.map(async (fp: any) => {
                const res = await fetch(
                    `/api/formations/${formationId}/publications/${fp.publication_id}/quiz/review?_t=${Date.now()}`,
                    { headers, cache: 'no-store' }
                );
                if (!res.ok) return false;
                const data = await res.json();
                return data.data && data.data.id != null;
            }));
            return results.every(Boolean);
        } catch {
            return false;
        }
    };

    const toggleVisibility = async (formation: Formation) => {
        if (!formation.is_visible && formation.start_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(formation.start_date + 'T00:00:00');
            if (start > today) {
                toast.error("Date début pas encore arrivé — la formation ne peut pas être rendue visible avant la date de début.");
                return;
            }
        }
        if (!formation.is_visible && formation.progression_mode === 'guided' && createdFormationIds.current.has(formation.id)) {
            const ready = await checkFormationQuizReadiness(formation.id);
            if (!ready) {
                toast.error('Préparez tous les quiz avant de publier.');
                return;
            }
            createdFormationIds.current.delete(formation.id);
        }
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formation.id}/visibility`, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_visible: !formation.is_visible }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Visibilité mise à jour.');
                fetchFormations();
            } else {
                toast.error(data.message || 'Erreur de visibilité.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const openDetail = async (formation: Formation) => {
        setDetailFormation(null);
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const endpoints = [
                fetch(`/api/formations/${formation.id}`, { headers }),
                isFormateurUser
                    ? fetch(`/api/formations/${formation.id}/learners`, { headers })
                    : fetch(`/api/formations/${formation.id}/my-progress`, { headers }),
            ];
            const [detailRes, progressRes] = await Promise.all(endpoints);
            if (detailRes.ok) {
                const data = await detailRes.json();
                const detail = data.data || data;
                setDetailFormation({ ...detail, my_status: detail.my_status || formation.my_status });
            }
            if (progressRes.ok) {
                const data = await progressRes.json();
                if (isFormateurUser) {
                    setLearners(data.data || data || []);
                } else {
                    const myProgress = data.data || data;
                    setLearners([myProgress]);
                }
            }
            if (isFormateurUser && generatingQuizPubId) {
                const fp = formation.formation_publications?.find(
                    (fp: any) => fp.publication_id === generatingQuizPubId
                );
                if (fp) {
                    setQuizReviewPub({ pubId: generatingQuizPubId, pubTitle: fp.publication?.title || '' });
                }
            }
            if (isFormateurUser) {
                fetchBlockRequests(formation.id);
            } else {
                checkPendingRequest(formation.id);
            }
        } catch (e) {
            console.error('Error loading detail', e);
        }
    };

    const handleStartFormation = async (formationId: number) => {
        if (detailFormation?.progression_mode === 'guided' && detailFormation.start_date) {
            const startDate = new Date(detailFormation.start_date);
            const now = new Date();
            if (now < startDate) {
                toast.warning(`Cette formation n'a pas encore commencé. Veuillez patienter jusqu'au ${formatDate(detailFormation.start_date)}.`);
                return;
            }
        }

        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formationId}/my-progress`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_progress' }),
            });
            if (res.ok) {
                toast.success('Formation commencée avec succès.');
                openDetail(detailFormation!);
            } else {
                console.error('[startMyProgress]', res.status, res.statusText);
                const data = await res.json().catch(() => ({}));
                console.error('[startMyProgress] body:', data);
                toast.error(data.message || `Erreur ${res.status} lors du démarrage.`);
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        }
    };

    const fetchBlockRequests = async (formationId: number) => {
        try {
            setLoadingBlockRequests(true);
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formationId}/block-requests`, { headers });
            if (res.ok) {
                const data = await res.json();
                const requests = data.data || data || [];
                setBlockRequests(requests);
                setHasPendingRequest(requests.some((r: any) => r.status === 'pending'));
            }
        } catch { /* empty */ } finally {
            setLoadingBlockRequests(false);
        }
    };

    const checkPendingRequest = async (formationId: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/formations/${formationId}/block-requests/check`, { headers });
            if (res.ok) {
                const data = await res.json();
                setHasPendingRequest(data.has_pending_request === true);
            }
        } catch { /* empty */ }
    };

    const handleRequestUnblock = async (formationId: number, publicationId?: number, blockReason?: string) => {
        try {
            setBlockRequestLoading(formationId);
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const body: any = {};
            if (publicationId) body.publication_id = publicationId;
            if (blockReason) body.block_reason = blockReason;
            const res = await fetch(`/api/formations/${formationId}/block-requests`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Demande envoyée au formateur.');
                setHasPendingRequest(true);
            } else {
                toast.error(data.message || 'Erreur lors de l\'envoi de la demande.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setBlockRequestLoading(null);
        }
    };

    const handleBlockRequestAction = async (blockRequestId: number, action: 'approve' | 'pass' | 'decline', reason?: string) => {
        try {
            setBlockRequestLoading(blockRequestId);
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const body: any = {};
            if (action === 'approve') body.bonus_attempt = true;
            if (action === 'decline') {
                if (reason) body.reason = reason;
                body.mark_failed = true;
            }
            if (action === 'pass' && reason) body.reason = reason;
            const endpoint = `/api/block-requests/${blockRequestId}/${action}`;
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Action effectuée.');
                const br = blockRequests.find((r: any) => r.id === blockRequestId);
                const userId = br?.user?.id;
                if (userId) {
                    if (action === 'approve') {
                        sendNotifications({
                            user_ids: [userId],
                            type: 'bonus_attempt_granted',
                            title: 'Tentative supplémentaire accordée',
                            message: 'Votre formateur vous a accordé une tentative supplémentaire pour terminer votre formation.',
                            data: { block_request_id: blockRequestId },
                        });
                    } else if (action === 'decline') {
                        sendNotifications({
                            user_ids: [userId],
                            type: 'block_request_declined',
                            title: 'Demande de déblocage refusée',
                            message: 'Votre formateur a refusé votre demande de déblocage.',
                            data: { block_request_id: blockRequestId, reason },
                        });
                    }
                }
                if (detailFormation) fetchBlockRequests(detailFormation.id);
                if (detailFormation) openDetail(detailFormation);
            } else {
                toast.error(data.message || 'Erreur lors de l\'action.');
            }
        } catch {
            toast.error('Une erreur inattendue est survenue.');
        } finally {
            setBlockRequestLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; class: string }> = {
            not_started: { label: 'Non commencé', class: 'bg-gray-100 text-gray-600' },
            in_progress: { label: 'En cours', class: 'bg-blue-100 text-blue-700' },
            completed: { label: 'Clôturé', class: 'bg-green-100 text-green-700' },
            blocked: { label: 'Bloqué', class: 'bg-red-100 text-red-700' },
            definitive_failure: { label: 'Échec définitif', class: 'bg-red-800 text-white' },
            not_assigned: { label: 'Non assigné', class: 'bg-gray-50 text-gray-400' },
        };
        return map[status] || { label: status, class: 'bg-gray-100 text-gray-600' };
    };

    return (
        <div>
            {isFormateurUser && (
                <div className="flex justify-end mb-4">
                    <button onClick={openCreateModal} className="px-4 py-2 bg-primary-400 text-white rounded-[50px] hover:bg-primary-500 transition-colors font-medium text-sm">
                        + Créer une formation
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-lg shadow border border-gray-100 p-6">
                            <div className="animate-pulse">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-5 w-48 bg-gray-200 rounded" />
                                        </div>
                                        <div className="h-4 w-full bg-gray-200 rounded mt-2" />
                                        <div className="h-4 w-3/4 bg-gray-200 rounded mt-1" />
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="h-3 w-28 bg-gray-200 rounded" />
                                            <div className="h-3 w-20 bg-gray-200 rounded" />
                                            <div className="h-3 w-16 bg-gray-200 rounded" />
                                            <div className="h-3 w-24 bg-gray-200 rounded" />
                                            <div className="h-5 w-14 bg-gray-200 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : formations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100">
                    <p className="text-gray-500">Aucune formation pour le moment.</p>
                    {isFormateurUser && (
                        <button onClick={openCreateModal} className="mt-4 px-4 py-2 bg-primary-400 text-white rounded-[50px] hover:bg-primary-500 transition-colors font-medium text-sm">
                            Créer votre première formation
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {formations.map((formation) => {
                        const badge = getStatusBadge(formation.my_status || 'not_assigned');
                        return (
                            <div key={formation.id} className="bg-white rounded-lg shadow border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between" onClick={() => openDetail(formation)}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900 truncate">{formation.title}</h3>
                                            {!isFormateurUser && formation.progression_mode === 'guided' && (
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.class}`}>{badge.label}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formation.description}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs text-gray-400">{formation.progression_mode === 'guided' ? 'Progression guidée' : 'Mode libre'}</span>
                                            {formation.start_date && (
                                                <span className="text-xs text-gray-400">Début {formatDate(formation.start_date)}</span>
                                            )}
                                            {formation.duration_days && (
                                                <span className="text-xs text-gray-400">{formation.duration_days} jour{formation.duration_days > 1 ? 's' : ''}</span>
                                            )}
                                            <span className="text-xs text-gray-400">{formation.publications?.length || 0} publication(s)</span>
                                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${formation.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {formation.is_visible ? 'Visible' : 'Masquée'}
                                            </span>
                                        </div>
                                    </div>
                                    {isFormateurUser && (
                                        <div className="flex items-center space-x-2 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {(() => {
                                                const quizzesNotReady = formation.progression_mode === 'guided' && !formation.is_visible && (!formation.all_quizzes_ready || createdFormationIds.current.has(formation.id));
                                                const today = new Date(); today.setHours(0, 0, 0, 0);
                                                const isFutureStart = !formation.is_visible && !!formation.start_date && new Date(formation.start_date + 'T00:00:00') > today;
                                                const isDisabled = !!(quizzesNotReady || isFutureStart);
                                                const title = isFutureStart
                                                    ? "Date début pas encore arrivé — vous pourrez rendre visible après le début de la formation"
                                                    : quizzesNotReady
                                                        ? 'Préparez tous les quiz avant de publier'
                                                        : formation.is_visible ? 'Masquer' : 'Rendre visible';
                                                return (
                                                    <button onClick={(e) => { e.stopPropagation(); if (!isDisabled) toggleVisibility(formation); }}
                                                        className={`p-1.5 rounded-[50px] transition-colors ${
                                                            isDisabled
                                                                ? 'text-gray-300 cursor-not-allowed'
                                                                : formation.is_visible ? 'text-primary hover:bg-primary-50' : 'text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                        disabled={isDisabled}
                                                        title={title}>
                                                        {formation.is_visible ? (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                        )}
                                                    </button>
                                                );
                                            })()}
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(formation); }}
                                                className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-[50px] transition-colors">
                                                Modifier
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(formation); }}
                                                className="px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-[50px] transition-colors">
                                                Supprimer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{editingFormation ? 'Modifier la formation' : 'Créer une formation'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                                    <AtomInput id="form-title" type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto" placeholder="Titre de la formation" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                    <AtomInput id="form-desc" isTextArea={true} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none bg-white h-auto" placeholder="Description de la formation" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Objectif pédagogique</label>
                                    <AtomInput id="form-objective" isTextArea={true} value={formData.pedagogical_objective} onChange={(e) => setFormData({ ...formData, pedagogical_objective: e.target.value })} rows={2}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none bg-white h-auto" placeholder="Objectif pédagogique (optionnel)" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de progression</label>
                                <select value={formData.progression_mode} onChange={(e) => setFormData({ ...formData, progression_mode: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                                    <option value="guided">Progression guidée (avec validation par quiz)</option>
                                    <option value="free">Mode libre (accès sans verrouillage)</option>
                                </select>
                            </div>

                            {formData.progression_mode === 'guided' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de création / début <span className="text-gray-400 font-normal">(à titre indicatif)</span></label>
                                        <AtomInput id="form-start-date" type="date" min={new Date().toISOString().split('T')[0]} value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white h-auto" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Durée (jours)</label>
                                        <AtomInput id="form-duration" type="number" min="0" value={formData.duration_days} onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-white h-auto" placeholder="0" />
                                    </div>
                                </div>
                            )}

                            {formData.progression_mode === 'guided' && (
                                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Paramètres des quiz</p>
                                    <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre maximal de tentatives par quiz</label>
                                        <AtomInput id="form-max-attempts" type="number" min="1" max="100" value={formData.max_attempts} onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white h-auto" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Score minimal de validation (%)</label>
                                        <AtomInput id="form-min-pass" type="number" min="0" max="100" value={formData.min_pass_percentage} onChange={(e) => setFormData({ ...formData, min_pass_percentage: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white h-auto" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de questions par quiz</label>
                                        <select id="form-quiz-question-count" value={formData.quiz_question_count} onChange={(e) => setFormData({ ...formData, quiz_question_count: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white h-auto">
                                            <option value="5">5 questions</option>
                                            <option value="10">10 questions</option>
                                            <option value="15">15 questions</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Temps par question (secondes)</label>
                                        <select id="form-quiz-time" value={formData.quiz_time_per_question} onChange={(e) => setFormData({ ...formData, quiz_time_per_question: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white h-auto">
                                            <option value="10">10 secondes</option>
                                            <option value="12">12 secondes</option>
                                            <option value="15">15 secondes</option>
                                        </select>
                                    </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Publications associées</label>
                                {availablePubs.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Aucune publication disponible. Créez d&apos;abord des publications.</p>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                                        {availablePubs.map((pub) => {
                                            const isSelected = selectedPubIds.includes(pub.id);
                                            return (
                                                <div key={pub.id} className={`border-b border-gray-100 last:border-0 ${isSelected ? 'bg-primary-50' : ''}`}>
                                                    <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                                                        <AtomInput id={`pub-check-${pub.id}`} type="checkbox" checked={isSelected}
                                                            onChange={() => {
                                                                setSelectedPubIds(prev => prev.includes(pub.id) ? prev.filter(id => id !== pub.id) : [...prev, pub.id]);
                                                                if (selectedPubIds.includes(pub.id)) {
                                                                    const next = { ...recommendedDurations };
                                                                    delete next[pub.id];
                                                                    setRecommendedDurations(next);
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-primary-600 rounded border-gray-300 mr-3" />
                                                        <span className="text-sm text-gray-900">{pub.title}</span>
                                                    </label>
                                                    {isSelected && formData.progression_mode === 'guided' && (
                                                        <div className="px-4 pb-2 flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 shrink-0">Durée recommandée (en jours) :</span>
                                                            <AtomInput id={`pub-duration-${pub.id}`} type="number" min="0" value={recommendedDurations[pub.id] ?? ''}
                                                                onChange={(e: any) => setRecommendedDurations(prev => ({ ...prev, [pub.id]: Number(e.target.value) }))}
                                                                className="w-20 px-2 py-1 h-auto text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 outline-none" placeholder="Jours" />
                                                            <span className="text-xs text-gray-400 italic">Temps conseillé pour terminer cette publication (non limitatif)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-1">{selectedPubIds.length} publication(s) sélectionnée(s)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assigner aux collaborateurs</label>
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                                    {loadingCollaborators ? (
                                        <div className="animate-pulse divide-y divide-gray-100">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="flex items-center px-4 py-3">
                                                    <div className="w-4 h-4 bg-gray-200 rounded mr-3 shrink-0" />
                                                    <div className="flex-1">
                                                        <div className="h-4 w-36 bg-gray-200 rounded" />
                                                        <div className="h-3 w-48 bg-gray-200 rounded mt-1" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : collaborators.length === 0 ? (
                                        <p className="text-center py-8 text-gray-400 text-sm">Aucun collaborateur trouvé.</p>
                                    ) : (
                                        collaborators.map((collab) => (
                                            <label key={collab.id} className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${selectedUserIds.includes(collab.id) ? 'bg-primary-50' : ''}`}>
                                                <AtomInput id={`collab-check-${collab.id}`} type="checkbox" checked={selectedUserIds.includes(collab.id)}
                                                    onChange={() => setSelectedUserIds(prev => prev.includes(collab.id) ? prev.filter(id => id !== collab.id) : [...prev, collab.id])}
                                                    className="w-4 h-4 text-primary-600 rounded border-gray-300 mr-3" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{collab.name}</p>
                                                    <p className="text-xs text-gray-500">{collab.email}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{selectedUserIds.length} collaborateur(s) sélectionné(s)</p>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => { setShowFormModal(false); setEditingFormation(null); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors">Annuler</button>
                                <button type="submit" disabled={saving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-[50px] transition-colors ${saving ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'}`}>
                                    {saving ? 'Enregistrement...' : editingFormation ? 'Enregistrer' : 'Créer la formation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (() => {
                const pubCount = deleteConfirm.publications?.length || deleteConfirm.formation_publications?.length || 0;
                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Supprimer la formation</h2>
                        <p className="text-gray-600 text-sm mb-4">Êtes-vous sûr de vouloir supprimer la formation &quot;{deleteConfirm.title}&quot; ?</p>

                        {pubCount > 0 && (
                            <>
                            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-5">
                                <p className="text-sm text-primary-700">
                                    Cette formation contient <strong>{pubCount} publication(s)</strong> associée(s).
                                </p>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">Que souhaitez-vous faire ?</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleDelete(deleteConfirm, false)}
                                    disabled={deleting}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary transition-all text-left disabled:opacity-50"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Supprimer uniquement la formation</p>
                                        <p className="text-xs text-gray-500">Les publications associées seront conservées</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleDelete(deleteConfirm, true)}
                                    disabled={deleting}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-tertiaires-rouge/40 rounded-lg hover:bg-tertiaires-rouge/5 hover:border-tertiaires-rouge transition-all text-left disabled:opacity-50"
                                >
                                    <div className="w-8 h-8 rounded-full bg-tertiaires-rouge/10 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4 text-tertiaires-rouge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-tertiaires-rouge">Supprimer aussi les publications</p>
                                        <p className="text-xs text-tertiaires-rouge/70">Action irréversible — les publications seront définitivement supprimées</p>
                                    </div>
                                </button>
                            </div>
                            </>
                        )}

                        {pubCount === 0 && (
                            <div className="flex justify-end space-x-3 mt-2">
                                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors disabled:opacity-50">
                                    Annuler
                                </button>
                                <button onClick={() => handleDelete(deleteConfirm, false)} disabled={deleting}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-[50px] transition-colors disabled:opacity-50 ${deleting ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'}`}>
                                    {deleting ? 'Suppression...' : 'Supprimer'}
                                </button>
                            </div>
                        )}

                        {pubCount > 0 && (
                            <div className="flex justify-center mt-5">
                                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors disabled:opacity-50">
                                    Annuler
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}

            {/* Detail Modal */}
            {detailFormation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setDetailFormation(null)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{detailFormation.title}</h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    {detailFormation.progression_mode === 'guided' ? 'Progression guidée' : 'Mode libre'}
                                    {detailFormation.start_date && ` · Début ${formatDate(detailFormation.start_date)}`}
                                    {detailFormation.duration_days ? ` · ${detailFormation.duration_days} jours` : ''}
                                </p>
                            </div>
                            <button onClick={() => setDetailFormation(null)}
                                className="w-8 h-8 rounded-[50px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                                <p className="text-sm text-gray-600">{detailFormation.description}</p>
                                {detailFormation.pedagogical_objective && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs font-medium text-blue-700 mb-1">Objectif pédagogique</p>
                                        <p className="text-sm text-blue-900">{detailFormation.pedagogical_objective}</p>
                                    </div>
                                )}
                                {detailFormation.max_attempts && detailFormation.progression_mode === 'guided' && (
                                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                                        <span className="text-xs text-gray-500">Tentatives max par quiz : {detailFormation.max_attempts}</span>
                                        <span className="text-xs text-gray-500">Score minimal : {detailFormation.min_pass_percentage}%</span>
                                        {detailFormation.quiz_question_count && (
                                            <span className="text-xs text-gray-500">Questions par quiz : {detailFormation.quiz_question_count}</span>
                                        )}
                                        {detailFormation.quiz_time_per_question && (
                                            <span className="text-xs text-gray-500">Temps par question : {detailFormation.quiz_time_per_question}s</span>
                                    )}
                                </div>
                            )}

                            {/* Block Requests for Formateur */}
                            {isFormateurUser && blockRequests.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Demandes de déblocage ({blockRequests.filter((r: any) => r.status === 'pending').length} en attente)</h3>
                                    <div className="space-y-3">
                                        {blockRequests.map((br: any) => (
                                            <div key={br.id} className={`border rounded-lg p-4 ${br.status === 'pending' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900">{br.user?.name || 'Inconnu'}</span>
                                                        <span className="text-xs text-gray-500 ml-2">{br.user?.email}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        br.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        br.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {br.status === 'pending' ? 'En attente' : br.status === 'approved' ? 'Approuvée' : 'Refusée'}
                                                    </span>
                                                </div>
                                                {br.publication && (
                                                    <p className="text-xs text-gray-600 mb-1">Publication concernée : <span className="font-medium">{br.publication.title}</span></p>
                                                )}
                                                {br.block_reason === 'deadline_exceeded' && (
                                                    <p className="text-xs text-red-600 mb-1 font-medium">Délai dépassé</p>
                                                )}
                                                {br.formateur_response && (
                                                    <p className="text-xs text-gray-500 italic mb-1">Réponse du formateur : {br.formateur_response}</p>
                                                )}
                                                {br.status === 'pending' && br.block_reason !== 'deadline_exceeded' && (
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <button
                                                            onClick={() => handleBlockRequestAction(br.id, 'approve')}
                                                            disabled={blockRequestLoading === br.id}
                                                            className="px-3 py-1.5 text-xs font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-full transition-colors disabled:opacity-50"
                                                        >
                                                            {blockRequestLoading === br.id ? '...' : 'Ajouter une tentative'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Motif du refus (optionnel) :');
                                                                if (reason !== null) handleBlockRequestAction(br.id, 'decline', reason || undefined);
                                                            }}
                                                            disabled={blockRequestLoading === br.id}
                                                            className="px-3 py-1.5 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-50"
                                                        >
                                                            {blockRequestLoading === br.id ? '...' : 'Refuser'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            </div>

                            {/* Publications */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Publications ({detailFormation.formation_publications?.length || 0})</h3>
                                {!isFormateurUser && detailFormation.progression_mode === 'guided' && detailFormation.my_status === 'not_started' && (
                                    <div className="mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-700">
                                            Cette formation est actuellement verrouillée. Cliquez sur <span className="font-semibold">&laquo;&nbsp;Commencer&nbsp;&raquo;</span> pour y accéder. En démarrant la formation, vous acceptez le délai imparti pour la terminer.
                                        </p>
                                    </div>
                                )}
                                {(!detailFormation.formation_publications || detailFormation.formation_publications.length === 0) ? (
                                    <p className="text-xs text-gray-400 italic">Aucune publication associée.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {(() => {
                                            const collabPubStatus: Record<number, string> = {};
                                            if (!isFormateurUser && learners.length > 0 && learners[0]?.enriched_publications) {
                                                for (const ep of learners[0].enriched_publications) {
                                                    collabPubStatus[ep.publication_id] = ep.status;
                                                }
                                            }
                                            return detailFormation.formation_publications.map((fp, idx) => {
                                                const pubStatus = collabPubStatus[fp.publication_id] || null;
                                                const isLocked = detailFormation.progression_mode === 'guided' && !isFormateurUser && (pubStatus === 'locked' || detailFormation.my_status === 'not_started');
                                                const isAvailable = detailFormation.progression_mode === 'guided' && !isFormateurUser && pubStatus === 'available';
                                                const isCompleted = detailFormation.progression_mode === 'guided' && !isFormateurUser && pubStatus === 'completed';
                                                
                                                // Check for blocked status
                                                let isBlocked = false;
                                                let isDefinitive = false;
                                                if (!isFormateurUser && detailFormation.progression_mode === 'guided') {
                                                    const ep = learners[0]?.enriched_publications?.find((p: any) => p.publication_id === fp.publication_id);
                                                    if (ep && ep.status === 'blocked') {
                                                        isBlocked = true;
                                                    }
                                                    // Also if formation is blocked and this is the active pub
                                                    if (detailFormation.my_status === 'blocked' && pubStatus !== 'completed' && pubStatus !== 'locked') {
                                                        isBlocked = true;
                                                    }
                                                    
                                                    // Definitively blocked if bonus attempts were used
                                                    if (isBlocked) {
                                                        const pp = learners[0]?.publication_progress?.find((p: any) => p.publication_id === fp.publication_id);
                                                        if (pp && (pp.bonus_attempts || 0) > 0) {
                                                            isDefinitive = true;
                                                        }
                                                    }
                                                }

                                                const canOpen = isFormateurUser || detailFormation.progression_mode === 'free' || (detailFormation.my_status !== 'not_started' && !isLocked && !isBlocked);
                                                return (
                                                    <div key={fp.id}
                                                        className={`flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg transition-colors ${canOpen ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-60'}`}
                                                        onClick={() => canOpen && onViewPublication?.(fp.publication)}>
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                                            <span className="text-sm font-medium text-gray-900">{fp.publication?.title || 'Publication #' + fp.publication_id}</span>
                                                            {isLocked && !isBlocked && (
                                                                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                            )}
                                                            {isCompleted && (
                                                                <span className="text-xs font-medium text-green-600">Publication achevée !</span>
                                                            )}
                                                            {isBlocked && (
                                                                <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${isDefinitive ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'}`}>
                                                                    {isDefinitive ? 'Échec définitif' : 'Bloqué'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                                            {isFormateurUser && detailFormation.progression_mode === 'guided' && (
                                                                <button
                                                                    onClick={() => setQuizReviewPub({ pubId: fp.publication_id, pubTitle: fp.publication?.title || '' })}
                                                                    className="px-3 py-1 text-xs font-medium text-primary-400 bg-primary-400/10 hover:bg-primary-400/20 rounded-[50px] transition-colors"
                                                                >
                                                                    Quiz
                                                                </button>
                                                            )}
                                                            {!isFormateurUser && detailFormation.progression_mode === 'guided' && detailFormation.my_status === 'in_progress' && (isAvailable || isCompleted) && (
                                                                <button
                                                                    onClick={() => setQuizTakingPub({ pubId: fp.publication_id, pubTitle: fp.publication?.title || '' })}
                                                                    className="px-3 py-1 text-xs font-medium text-primary-400 bg-primary-400/10 hover:bg-primary-400/20 rounded-[50px] transition-colors"
                                                                >
                                                                    {isCompleted ? 'Repasser le quiz' : 'Répondre au quiz'}
                                                                </button>
                                                            )}
                                                            {isFormateurUser && (
                                                                <button
                                                                    onClick={() => setRemovePubConfirm({ formation: detailFormation, fp })}
                                                                    className="px-3 py-1 text-xs font-medium text-primary-500 bg-white border border-primary-300 hover:bg-primary-50 rounded-[50px] transition-colors"
                                                                >
                                                                    Retirer
                                                                </button>
                                                            )}
                                                            {detailFormation.progression_mode === 'guided' && fp.recommended_duration_minutes != null && fp.recommended_duration_minutes > 0 && (
                                                                <span className="text-xs text-gray-400">{fp.recommended_duration_minutes} jour{fp.recommended_duration_minutes > 1 ? 's' : ''}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Start button for collaborators */}
                            {!isFormateurUser && detailFormation.progression_mode === 'guided' && detailFormation.my_status === 'not_started' && (
                                <div className="flex justify-center pt-2">
                                    <button onClick={() => handleStartFormation(detailFormation.id)}
                                        className="bg-primary-400 text-white font-semibold rounded-full px-8 py-3 transition-all hover:bg-primary-500">
                                        Commencer
                                    </button>
                                </div>
                            )}

                            {/* Start info for collaborators who have started */}
                            {!isFormateurUser && detailFormation.progression_mode === 'guided' && detailFormation.my_status !== 'not_started' && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    {detailFormation.my_status === 'in_progress' && detailFormation.started_at && (
                                        <div className="flex flex-col gap-1">
                                            <span>Commencé le {formatDate(detailFormation.started_at)}</span>
                                            {remainingTime && (
                                                <span className="text-xs text-gray-400">Temps restant : {remainingTime}</span>
                                            )}
                                        </div>
                                    )}
                                    {detailFormation.my_status === 'completed' && (
                                        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                                            <div>
                                                <span className="text-sm font-bold text-green-700">Formation clôturée</span>
                                                <span className="text-sm text-green-600 ml-2">Vous avez bien réussi — bravo !</span>
                                    </div>
                                </div>
                            )}
                                        {detailFormation.my_status === 'blocked' && (
                                        <div className="w-full mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-sm font-semibold text-red-700">Formation bloquée</span>
                                            </div>
                                            <p className="text-xs text-red-600 mb-3">
                                                {(() => {
                                                    const isDeadline = detailFormation.deadline && new Date(detailFormation.deadline + 'T23:59:59').getTime() < Date.now();
                                                    if (isDeadline) return 'Le délai de la formation a été dépassée.';
                                                    const blockedPubProgress = detailFormation.formation_publications?.map((fp: any) => {
                                                        return learners[0]?.publication_progress?.find((p: any) => p.publication_id === fp.publication_id);
                                                    }).find((pp: any) => pp && pp.status !== 'completed');
                                                    if (blockedPubProgress && (blockedPubProgress.bonus_attempts || 0) > 0) {
                                                        return 'Vous avez échoué la formation définitivement car vous avez épuisé votre tentative supplémentaire.';
                                                    }
                                                    return 'Vous avez épuisé le nombre maximum de tentatives. Votre formateur a été notifié.';
                                                })()}
                                            </p>
                                            {(() => {
                                                const isDeadline = detailFormation.deadline && new Date(detailFormation.deadline + 'T23:59:59').getTime() < Date.now();
                                                if (isDeadline) return null;
                                                return hasPendingRequest ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                                        Demande en attente de réponse
                                                    </span>
                                                ) : (() => {
                                                    const blockedPubProgress = detailFormation.formation_publications?.map((fp: any) => {
                                                        return learners[0]?.publication_progress?.find((p: any) => p.publication_id === fp.publication_id);
                                                    }).find((pp: any) => pp && pp.status !== 'completed');
                                                    if (blockedPubProgress && (blockedPubProgress.bonus_attempts || 0) > 0) {
                                                        return null;
                                                    }
                                                    return (
                                                        <button
                                                            onClick={() => {
                                                                const blockedPub = detailFormation.formation_publications?.find((fp: any) => {
                                                                    const pp = learners[0]?.publication_progress?.find((p: any) => p.publication_id === fp.publication_id);
                                                                    return pp && pp.status !== 'completed';
                                                                });
                                                                handleRequestUnblock(detailFormation.id, blockedPub?.publication_id);
                                                            }}
                                                            disabled={blockRequestLoading === detailFormation.id}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-400 hover:bg-primary-500 rounded-full transition-colors disabled:opacity-50"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                                                            {blockRequestLoading === detailFormation.id ? 'Envoi...' : 'Demander au formateur de déverrouiller'}
                                                        </button>
                                                    );
                                                })()
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Learners List */}
                            {isFormateurUser && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Apprenants assignés ({learners.length})</h3>
                                    {learners.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">Aucun apprenant assigné.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {learners.map((fu) => {
                                                const isDefinitiveFailure = fu.status === 'blocked' && fu.publication_progress?.some((pp: any) => pp.status !== 'completed' && (pp.bonus_attempts || 0) > 0);
                                                const effectiveStatus = isDefinitiveFailure ? 'definitive_failure' : fu.status;
                                                const badge = getStatusBadge(effectiveStatus);
                                                const total = detailFormation.formation_publications?.length || 1;
                                                const completed = fu.publication_progress?.filter((p: any) => p.status === 'completed').length || 0;
                                                const progress = Math.round((completed / total) * 100);
                                                return (
                                                    <div key={fu.id} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-900">{fu.user?.name || 'Inconnu'}</span>
                                                                <span className="text-xs text-gray-500 ml-2">{fu.user?.email}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {detailFormation.progression_mode === 'guided' && (
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.class}`}>{badge.label}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {detailFormation.progression_mode === 'guided' && (
                                                            <>
                                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                                    <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                                                                </div>
                                                                <p className="text-xs text-gray-500">{completed}/{total} publications · {progress}%</p>
                                                                {fu.started_at && (
                                                                    <p className="text-xs text-gray-400 mt-1">
                                                                        Commencé le {formatDate(fu.started_at)}
                                                                        {detailFormation.duration_days && (
                                                                            (() => {
                                                                                const extendedDays = fu.deadline_extended_days || 0;
                                                                                const deadlineDate = new Date(new Date(fu.started_at).getTime() + (detailFormation.duration_days + extendedDays) * 86400000);
                                                                                return <> · À terminer avant le {deadlineDate.toISOString().split('T')[0]}</>;
                                                                            })()
                                                                        )}
                                                                    </p>
                                                                )}
                                                                {fu.publication_progress && fu.publication_progress.length > 0 && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {fu.publication_progress.map((pp: any) => (
                                                                            <div key={pp.id} className="flex items-center justify-between text-xs">
                                                                                <span className="text-gray-600">{pp.publication?.title || 'Publication'}</span>
                                                                                <span className={`font-medium ${pp.status === 'completed' ? 'text-green-600' : pp.status === 'available' || detailFormation.progression_mode === 'free' ? 'text-blue-600' : 'text-gray-400'}`}>
                                                                                    {pp.status === 'completed' ? '✓ Validé' : pp.status === 'available' || detailFormation.progression_mode === 'free' ? 'Disponible' : '🔒 Verrouillé'}
                                                                                    {detailFormation.progression_mode !== 'free' && pp.status !== 'completed' && pp.quiz_attempts > 0 && ` (${pp.quiz_attempts} tentative${pp.quiz_attempts > 1 ? 's' : ''})`}
                                                                                    {detailFormation.progression_mode !== 'free' && pp.status !== 'completed' && pp.quiz_highest_score !== null && ` · ${pp.quiz_highest_score}%`}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Locked publication message for collaborators */}
            {!isFormateurUser && detailFormation && detailFormation.progression_mode === 'guided' && detailFormation.my_status === 'in_progress' && (
                <div className="mt-4">
                    {learners.length > 0 && learners[0]?.enriched_publications?.map((ep: any) => {
                        if (ep.is_locked) {
                            return (
                                <div key={ep.publication_id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                                    <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" /></svg>
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">« {ep.title} » est verrouillée</p>
                                        <p className="text-xs text-amber-600">{ep.lock_reason || 'Complétez la publication précédente pour y accéder.'}</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            )}

            {quizReviewPub && detailFormation && (
                <OrganismQuizReview
                    formationId={detailFormation.id}
                    publicationId={quizReviewPub.pubId}
                    publicationTitle={quizReviewPub.pubTitle}
                    onClose={() => {
                        setQuizReviewPub(null);
                        setGeneratingQuizPubId(null);
                    }}
                    onGenerationStateChange={(isGenerating) => {
                        if (isGenerating) {
                            setGeneratingQuizPubId(quizReviewPub.pubId);
                        } else {
                            setGeneratingQuizPubId(null);
                        }
                    }}
                />
            )}

            {quizTakingPub && detailFormation && (
                <OrganismQuizTaking
                    formationId={detailFormation.id}
                    publicationId={quizTakingPub.pubId}
                    publicationTitle={quizTakingPub.pubTitle}
                    onClose={() => setQuizTakingPub(null)}
                    onComplete={() => {
                        openDetail(detailFormation);
                    }}
                />
            )}

            {/* Remove Publication Confirmation */}
            {removePubConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Retirer la publication</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            La publication «&nbsp;{removePubConfirm.fp.publication?.title || 'Publication'}&nbsp;» va être retirée de la formation «&nbsp;{removePubConfirm.formation.title}&nbsp;». Cela peut impacter la progression des collaborateurs assignés déjà à cette formation. Voulez-vous continuer ?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setRemovePubConfirm(null)}
                                disabled={removingPub}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[50px] transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleRemovePublication()}
                                disabled={removingPub}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-[50px] transition-colors ${removingPub ? 'bg-primary-300' : 'bg-primary-400 hover:bg-primary-500'}`}
                            >
                                {removingPub ? 'Retrait...' : 'Oui, retirer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
