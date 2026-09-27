<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Notifications', description: 'Gestion des notifications utilisateur')]
class NotificationController extends Controller
{
    #[OA\Get(
        path: '/notifications',
        summary: 'Liste des notifications',
        description: 'Retourne la liste des notifications de l\'utilisateur connecté avec le nombre de notifications non lues.',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        responses: [
            new OA\Response(response: 200, description: 'Liste des notifications récupérée avec succès'),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $unreadCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    #[OA\Put(
        path: '/notifications/{notification}/read',
        summary: 'Marquer une notification comme lue',
        description: 'Marque une notification spécifique comme lue.',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        parameters: [
            new OA\Parameter(name: 'notification', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Notification marquée comme lue'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Notification non trouvée'),
        ]
    )]
    public function markAsRead(Request $request, Notification $notification)
    {
        $user = $request->user();

        if ($notification->user_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        $unreadCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'message' => 'Notification marquée comme lue.',
            'notification' => $notification,
            'unread_count' => $unreadCount,
        ]);
    }

    #[OA\Put(
        path: '/notifications/read-all',
        summary: 'Marquer toutes les notifications comme lues',
        description: 'Marque toutes les notifications non lues de l\'utilisateur comme lues.',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        responses: [
            new OA\Response(response: 200, description: 'Toutes les notifications marquées comme lues'),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues.',
            'unread_count' => 0,
        ]);
    }

    #[OA\Delete(
        path: '/notifications/{notification}',
        summary: 'Supprimer une notification',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        responses: [
            new OA\Response(response: 200, description: 'Notification supprimée'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Notification non trouvée'),
        ]
    )]
    #[OA\Parameter(
        name: 'notification',
        in: 'path',
        required: true,
        schema: new OA\Schema(type: 'integer')
    )]
    public function destroy(Request $request, Notification $notification)
    {
        $user = $request->user();

        if ($notification->user_id !== $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $notification->delete();

        return response()->json(['message' => 'Notification supprimée.']);
    }

    #[OA\Post(
        path: '/notifications/delete',
        summary: 'Supprimer plusieurs notifications',
        security: [['bearerAuth' => []]],
        tags: ['Notifications'],
        responses: [
            new OA\Response(response: 200, description: 'Notifications supprimées'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'ids', type: 'array', items: new OA\Items(type: 'integer')),
        ])
    )]
    public function destroyMultiple(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:notifications,id',
        ]);

        Notification::where('user_id', $user->id)
            ->whereIn('id', $request->ids)
            ->delete();

        return response()->json(['message' => 'Notifications supprimées.']);
    }
}
