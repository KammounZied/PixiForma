<?php

namespace App\Http\Controllers;

use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Password Reset')]
class PasswordController extends Controller
{
    #[OA\Post(
        path: '/forgot-password',
        summary: 'Demande de réinitialisation du mot de passe',
        description: 'Demande de réinitialisation du mot de passe.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(
                        property: 'email',
                        type: 'string',
                        format: 'email',
                        example: 'user@test.com'
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Email envoyé (si le compte existe)',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'message',
                            type: 'string',
                            example: 'Si un compte existe avec cet email, un lien a été envoyé.'
                        )
                    ]
                )
            ),
            new OA\Response(response: 422,description: 'Erreur de validation')
        ]
    )]
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink($request->only('email'));
        return response()->json(['message' => 'Si un compte existe avec cet email, un lien a été envoyé.']);
    }

    #[OA\Post(
        path: '/verify-reset-token',
        summary: 'Vérifier la validité d\'un token de réinitialisation',
        description: 'Vérifie si un token de réinitialisation de mot de passe est valide et non expiré.',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'token'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@test.com'),
                    new OA\Property(property: 'token', type: 'string', example: 'abc123')
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Token valide',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'valid', type: 'boolean', example: true)
                    ]
                )
            ),
            new OA\Response(
                response: 422,
                description: 'Token invalide ou expiré'
            )
        ]
    )]
    public function verifyToken(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
        ]);

        $record = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json(['valid' => false, 'message' => 'Token invalide ou expiré.'], 422);
        }

        $expiresAt = \Carbon\Carbon::parse($record->created_at)->addMinutes(5);

        if (now()->greaterThan($expiresAt)) {
            return response()->json(['valid' => false, 'message' => 'Token invalide ou expiré.'], 422);
        }

        if (!\Illuminate\Support\Facades\Hash::check($request->token, $record->token)) {
            return response()->json(['valid' => false, 'message' => 'Token invalide ou expiré.'], 422);
        }

        return response()->json(['valid' => true]);
    }

    #[OA\Post(
        path: '/reset-password',
        summary: 'Réinitialisation du mot de passe',
        tags: ['Authentification'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['token', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\Property(property: 'token', type: 'string', example: 'abc123'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'user@test.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'Password123'),
                    new OA\Property(property: 'password_confirmation', type: 'string', example: 'Password123')
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mot de passe mis à jour avec succès',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'message',
                            type: 'string',
                            example: 'Mot de passe modifié avec succès.'
                        )
                    ]
                )
            ),
            new OA\Response(
                response: 422,
                description: 'Lien invalide ou données incorrectes'
            )
        ]
    )]
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->mixedCase()->numbers()->symbols()]
        ]);

        $status = Password::reset(
            $request->only(
                'email',
                'password',
                'password_confirmation',
                'token'
            ),
            function ($user, $password) {

                $user->forceFill([
                    'password' => Hash::make($password)
                ])->save();

                $user->setRememberToken(Str::random(60));

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Mot de passe modifié avec succès.'
            ]);
        }

        return response()->json([
            'message' => 'Lien invalide ou expiré.'
        ], 422);
    }
}
