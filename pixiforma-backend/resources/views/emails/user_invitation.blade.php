<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bienvenue sur PixiForma</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 2px solid #e2e8f0; }
        .content { padding: 20px; }
        .password-box { background-color: #f1f5f9; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; text-align: center; letter-spacing: 2px; margin: 20px 0; font-weight: bold; }
        .button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Bienvenue sur PixiForma</h2>
        </div>
        <div class="content">
            <p>Bonjour {{ $user->name }},</p>
            <p>Un compte a été créé pour vous sur la plateforme PixiForma.</p>
            <p>Voici vos identifiants de connexion temporaires :</p>
            <ul>
                <li><strong>Email :</strong> {{ $user->email }}</li>
                <li><strong>Mot de passe temporaire :</strong></li>
            </ul>
            <div class="password-box">
                {{ $temporaryPassword }}
            </div>
            <p>Pour des raisons de sécurité, il vous sera demandé de modifier ce mot de passe lors de votre première connexion.</p>
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{ $loginUrl }}" class="button">Se connecter</a>
            </p>
        </div>
        <div class="footer">
            <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            <p>&copy; {{ date('Y') }} PixiForma. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
