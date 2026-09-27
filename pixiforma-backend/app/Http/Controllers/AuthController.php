<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Laravel\Passport\Passport;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Authentification', description: 'Connexion, déconnexion, renouvellement du token, récupération du mot de passe')]
class AuthController extends Controller
{
    #[OA\Post(
        path: '/register',
        summary: 'Inscription d\'un nouvel utilisateur',
        description: 'Crée un compte utilisateur et retourne ses informations.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', description: 'Nom complet', example: 'Jean Dupont'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Adresse e-mail', example: 'jean@example.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', description: 'Mot de passe'),
                    new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', description: 'Confirmation du mot de passe'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Utilisateur créé avec succès',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'user', type: 'object', description: 'Utilisateur créé'),
                        new OA\Property(property: 'access_token', type: 'string', description: 'Jeton d\'accès Bearer'),
                        new OA\Property(property: 'refresh_token', type: 'string', description: 'Jeton de rafraîchissement'),
                        new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
                        new OA\Property(property: 'expires_in', type: 'integer', example: 900),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Données invalides'),
        ]
    )]
public function register(RegisterRequest $request)
{
    return response()->json([
        'message' => 'Inscription désactivée. Utilisez l’invitation admin.'
    ], 403);
}

    #[OA\Post(
        path: '/login',
        summary: 'Connexion',
        description: 'Authentifie un utilisateur avec son e-mail et son mot de passe.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', description: 'Adresse e-mail', example: 'jean@example.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', description: 'Mot de passe', example: 'motdepasse123'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Connexion réussie',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'access_token', type: 'string', description: 'Jeton d\'accès Bearer'),
                        new OA\Property(property: 'refresh_token', type: 'string', description: 'Jeton de rafraîchissement'),
                        new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
                        new OA\Property(property: 'expires_in', type: 'integer', example: 900),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Identifiants invalides'),
        ]
    )]
    public function login(LoginRequest $request)
{
    if (!Auth::attempt($request->only(['email', 'password']))) {
        return response()->json([
            'message' => 'Aucun utilisateur avec ces identifiants'
        ], 422);
    }

    $user = Auth::user();

    if (!$user->is_active) {
        Auth::logout();
        return response()->json([
            'message' => 'Votre compte a été désactivé. Veuillez contacter un administrateur.'
        ], 403);
    }

    if ($request->boolean('rememberMe', false)) {
        Passport::personalAccessTokensExpireIn(now()->addDays(30));
        $tokenResult = $user->createToken('Remember Me', ['*']);
        return response()->json([
            'user' => $user->load('roles.permissions'),
            'force_password_change' => (bool) $user->force_password_change,
            'access_token' => $tokenResult->accessToken,
            'token_type' => 'Bearer',
            'expires_in' => 30 * 24 * 60 * 60,
        ]);
    }

    $response = $this->requestPassportToken([
        'grant_type' => 'password',
        'client_id' => env('PASSPORT_PASSWORD_CLIENT_ID'),
        'client_secret' => env('PASSPORT_PASSWORD_CLIENT_SECRET'),
        'username' => $request->email,
        'password' => $request->password,
        'scope' => '*',
    ]);

        return response()->json([
        'user' => $user->load('roles.permissions'),
        'force_password_change' => (bool) $user->force_password_change,
        'access_token' => $response['access_token'] ?? null,
        'refresh_token' => $response['refresh_token'] ?? null,
        'token_type' => $response['token_type'] ?? 'Bearer',
        'expires_in' => $response['expires_in'] ?? null,
    ]);
}

    #[OA\Post(
        path: '/refresh',
        summary: 'Renouvellement du token',
        description: 'Renouvelle l\'access token à partir d\'un refresh token valide.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['refresh_token'],
                properties: [
                    new OA\Property(property: 'refresh_token', type: 'string', description: 'Le refresh token issu de la connexion précédente'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Token renouvelé avec succès',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'access_token', type: 'string', description: 'Nouveau jeton d\'accès Bearer'),
                        new OA\Property(property: 'refresh_token', type: 'string', description: 'Refresh token renouvelé ou identique selon la configuration Passport'),
                        new OA\Property(property: 'token_type', type: 'string', example: 'Bearer'),
                        new OA\Property(property: 'expires_in', type: 'integer', example: 900),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Refresh token invalide'),
        ]
    )]
    public function refresh(Request $request)
    {
        $request->validate([
            'refresh_token' => ['required', 'string'],
        ]);

        $response = $this->requestPassportToken([
            'grant_type' => 'refresh_token',
            'refresh_token' => $request->refresh_token,
            'client_id' => env('PASSPORT_PASSWORD_CLIENT_ID'),
            'client_secret' => env('PASSPORT_PASSWORD_CLIENT_SECRET'),
        ]);

        return response()->json($response, $response['status'] ?? 200);
    }

    #[OA\Post(
        path: '/logout',
        summary: 'Déconnexion',
        description: 'Révoque le jeton d\'authentification de l\'utilisateur connecté.',
        tags: ['Authentification'],
        security: [['bearerAuth' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Déconnexion réussie'),
            new OA\Response(response: 401, description: 'Utilisateur non authentifié'),
        ]
    )]
    public function logout(Request $request)
    {
        $user = Auth::user();

        if ($user && $user->token()) {
            $user->token()->revoke();
            return response()->json(['message' => 'User Logged Out'], 200);
        }

        return response()->json(['message' => 'Utilisateur non authentifié'], 401);
    }

    protected function requestPassportToken(array $data): array
    {
        try {
            $tokenRequest = \Illuminate\Http\Request::create('/oauth/token', 'POST', $data);
            $response = app()->handle($tokenRequest);
            $content = json_decode($response->getContent(), true);
            
            return array_merge($content ?: [], ['status' => $response->getStatusCode()]);
        } catch (\Exception $e) {
            return [
                'error' => 'token_request_failed',
                'message' => $e->getMessage(),
                'status' => 500
            ];
        }
    }
}
