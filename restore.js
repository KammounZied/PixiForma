const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'pixiforma-backend');
const frontendDir = path.join(__dirname, 'pixiforma-frontend');

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeFile(filePath, content) {
    ensureDir(filePath);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Wrote ${filePath}`);
}

// BACKEND RESTORATION
writeFile(path.join(backendDir, 'app/Http/Controllers/PasswordController.php'), `<?php

namespace App\\Http\\Controllers;

use Illuminate\\Auth\\Events\\PasswordReset;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Hash;
use Illuminate\\Support\\Facades\\Password;
use Illuminate\\Validation\\Rules\\Password as PasswordRule;
use Illuminate\\Support\\Str;
use OpenApi\\Attributes as OA;

#[OA\\Tag(name: 'Password Reset')]
class PasswordController extends Controller
{
    #[OA\\Post(
        path: '/forgot-password',
        summary: 'Demande de réinitialisation du mot de passe',
        description: 'Demande de réinitialisation du mot de passe.',
        tags: ['Forget-Reset Password'],
        requestBody: new OA\\RequestBody(
            required: true,
            content: new OA\\JsonContent(
                required: ['email'],
                properties: [
                    new OA\\Property(
                        property: 'email',
                        type: 'string',
                        format: 'email',
                        example: 'user@test.com'
                    )
                ]
            )
        ),
        responses: [
            new OA\\Response(
                response: 200,
                description: 'Email envoyé (si le compte existe)',
                content: new OA\\JsonContent(
                    properties: [
                        new OA\\Property(
                            property: 'message',
                            type: 'string',
                            example: 'Si un compte existe avec cet email, un lien a été envoyé.'
                        )
                    ]
                )
            ),
            new OA\\Response(
                response: 422,
                description: 'Erreur de validation'
            )
        ]
    )]
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email']
        ]);

        Password::sendResetLink(
            $request->only('email')
        );

        return response()->json([
            'message' => 'Si un compte existe avec cet email, un lien a été envoyé.'
        ]);
    }

    #[OA\\Post(
        path: '/reset-password',
        summary: 'Réinitialisation du mot de passe',
        tags: ['Forget-Reset Password'],
        requestBody: new OA\\RequestBody(
            required: true,
            content: new OA\\JsonContent(
                required: ['token', 'email', 'password', 'password_confirmation'],
                properties: [
                    new OA\\Property(property: 'token', type: 'string', example: 'abc123'),
                    new OA\\Property(property: 'email', type: 'string', format: 'email', example: 'user@test.com'),
                    new OA\\Property(property: 'password', type: 'string', example: 'Password123'),
                    new OA\\Property(property: 'password_confirmation', type: 'string', example: 'Password123')
                ]
            )
        ),
        responses: [
            new OA\\Response(
                response: 200,
                description: 'Mot de passe mis à jour avec succès',
                content: new OA\\JsonContent(
                    properties: [
                        new OA\\Property(
                            property: 'message',
                            type: 'string',
                            example: 'Mot de passe modifié avec succès.'
                        )
                    ]
                )
            ),
            new OA\\Response(
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
`);

writeFile(path.join(backendDir, 'app/Notifications/ResetPasswordNotification.php'), `<?php

namespace App\\Notifications;

use Illuminate\\Bus\\Queueable;
use Illuminate\\Notifications\\Messages\\MailMessage;
use Illuminate\\Notifications\\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected string $token
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = config('app.frontend_url')
            . '/reset-password?token='
            . $this->token
            . '&email='
            . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Réinitialisation du mot de passe')
            ->greeting('Bonjour')
            ->line('Vous avez demandé la réinitialisation de votre mot de passe.')
            ->action('Réinitialiser mon mot de passe', $url)
            ->line('Ce lien expire dans 60 minutes.')
            ->line('Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.');
    }
}
`);

writeFile(path.join(backendDir, 'lang/fr.json'), `{
    "Regards": "Cordialement",
    "If you're having trouble clicking the \\":actionText\\" button, copy and paste the URL below\\ninto your web browser:": "Si vous rencontrez des problèmes pour cliquer sur le bouton \\":actionText\\", copiez et collez l'URL ci-dessous dans votre navigateur Web :"
}
`);

// FRONTEND RESTORATION
writeFile(path.join(frontendDir, 'src/app/api/forgot-password/route.ts'), `import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        const response = await fetch(\`\${apiUrl}/forgot-password\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        console.error('Error in forgot-password route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}
`);

writeFile(path.join(frontendDir, 'src/app/api/reset-password/route.ts'), `import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        const response = await fetch(\`\${apiUrl}/reset-password\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        console.error('Error in reset-password route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}
`);

writeFile(path.join(frontendDir, 'src/app/api/register/route.ts'), `import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        const response = await fetch(\`\${apiUrl}/register\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error in register route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}
`);

writeFile(path.join(frontendDir, 'src/app/[locale]/(public)/forgot-password/page.tsx'), `'use client';

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { TemplateForgotPassword } from "@/components/Templates";
import { FormSchema } from "@/common/Data/FormSchema";
import { FormDefaultData } from "@/common/Data/FormDefaultData";

export default function ForgotPasswordPage() {

    const t = useTranslations();

    type FormData = z.infer<ReturnType<typeof FormSchema.forgotPasswordSchema>>;

    const defaultValues: FormData = FormDefaultData.forgotPasswordDefaultValues();

    const form = useForm({
        defaultValues,
        validators: {
            onSubmit: FormSchema.forgotPasswordSchema(),
        },
        onSubmit: async ({ value }) => {
            await handleSubmit(value);
        },
    });

    const handleSubmit = async (data: { email: string }) => {
        try {
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.message || "Error");
            }

            toast.success(t("auth.resetEmailSent"), {
                position: "top-right",
            });

        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : t("auth.error"),
                {
                    position: "top-right",
                }
            );
        }
    };

    return <TemplateForgotPassword form={form} />;
}
`);

writeFile(path.join(frontendDir, 'src/app/[locale]/(public)/reset-password/page.tsx'), `'use client';

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { TemplateResetPassword } from "@/components/Templates";
import { FormSchema } from "@/common/Data/FormSchema";
import { FormDefaultData } from "@/common/Data/FormDefaultData";

export default function ResetPasswordPage() {

    const t = useTranslations();
    const router = useRouter();

    const searchParams = useSearchParams();

    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    type FormData = z.infer<ReturnType<typeof FormSchema.resetPasswordSchema>>;

    const defaultValues: FormData = FormDefaultData.resetPasswordDefaultValues();

    const form = useForm({
        defaultValues,
        validators: {
            onSubmit: FormSchema.resetPasswordSchema(),
        },
        onSubmit: async ({ value }) => {
            await handleSubmit(value);
        },
    });

    const handleSubmit = async (data: {
        password: string;
        confirmPassword: string;
    }) => {
        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    token,
                    password: data.password,
                    password_confirmation: data.confirmPassword,
                }),
            });

            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.message || "Error");
            }

            toast.success(t("auth.passwordResetSuccess"), {
                position: "top-right",
            });

            router.push("/login");

        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : t("auth.error"),
                {
                    position: "top-right",
                }
            );
        }
    };

    return <TemplateResetPassword form={form} />;
}
`);

writeFile(path.join(frontendDir, 'src/components/Templates/TemplateForgotPassword/TemplateForgotPassword.tsx'), `'use client';

import { useTranslations } from 'next-intl';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { ETypographyType } from '@/Enum/Enum';
import { Button } from '@/components/Atoms';
import { Input } from '@/components/Molecules';
import { ITemplateLogin } from '@/interfaces';
import Image from 'next/image';
import LoginImg from '../../../assets/images/login_image.jpg';
import Logo from '../../../assets/images/integra_logo.png';

export default function TemplateForgotPassword({ form }: Readonly<ITemplateLogin>) {
    const t = useTranslations();

    return (
        <div className='flex'>
            <div className="md:flex w-2/5 items-center justify-center bg-[repeating-linear-gradient(-45deg,var(--tw-gradient-from),var(--tw-gradient-from),transparent_1px,transparent_10px)] from-yellow-primary-500 relative p-4">
                <Image
                    src={LoginImg}
                    alt="Field"
                    className="object-cover w-full h-full rounded-xl"
                    priority
                />
            </div>

            <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-3/5">
                <div className="max-w-md w-full flex-1 flex flex-col justify-center">

                    <div className="flex flex-col items-center text-center mb-12">
                        <Image
                            src={Logo}
                            alt="Logo"
                            className="rounded-xl mb-12"
                            priority
                        />

                        <Label typeStyle={ETypographyType.H1Desktop} className="text-black">
                            {t('auth.forgotPassword')}
                        </Label>

                        <Label className="text-secondary-gris-fonce text-base" weight={400}>
                            {t('auth.forgotPasswordDescription')}
                        </Label>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                    >
                        <form.Field name="email">
                            {({ state, handleChange }: any) => (
                                <Input
                                    containerClassName="mb-3"
                                    label={t('auth.email')}
                                    placeholder={t('auth.enterYourEmail')}
                                    value={state.value}
                                    id="forgot-email"
                                    onChange={(e) => handleChange(e.target.value)}
                                    hintText={state.meta.errors[0]?.message}
                                    error={state.meta.errors[0]}
                                    required
                                />
                            )}
                        </form.Field>

                        <form.Subscribe selector={(state: any) => [state.canSubmit, state.isSubmitting]}>
                            {([canSubmit, isSubmitting]: [boolean, boolean]) => (
                                <Button
                                    className="group relative w-full flex justify-center"
                                    disabled={!canSubmit}
                                    isLoading={isSubmitting}
                                    text={isSubmitting ? "Sending..." : t('auth.sendResetLink')}
                                />
                            )}
                        </form.Subscribe>
                    </form>
                </div>
            </div>
        </div>
    );
}
`);

writeFile(path.join(frontendDir, 'src/components/Templates/TemplateResetPassword/TemplateResetPassword.tsx'), `'use client';

import { useTranslations } from 'next-intl';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { ETypographyType } from '@/Enum/Enum';
import { Button } from '@/components/Atoms';
import { Input } from '@/components/Molecules';
import { ITemplateLogin } from '@/interfaces';
import Image from 'next/image';
import LoginImg from '../../../assets/images/login_image.jpg';
import Logo from '../../../assets/images/integra_logo.png';

export default function TemplateResetPassword({ form }: Readonly<ITemplateLogin>) {
    const t = useTranslations();

    return (
        <div className='flex'>
            <div className="md:flex w-2/5 items-center justify-center bg-[repeating-linear-gradient(-45deg,var(--tw-gradient-from),var(--tw-gradient-from),transparent_1px,transparent_10px)] from-yellow-primary-500 relative p-4">
                <Image
                    src={LoginImg}
                    alt="Field"
                    className="object-cover w-full h-full rounded-xl"
                    priority
                />
            </div>

            <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-3/5">
                <div className="max-w-md w-full flex-1 flex flex-col justify-center">

                    <div className="flex flex-col items-center text-center mb-12">
                        <Image
                            src={Logo}
                            alt="Logo"
                            className="rounded-xl mb-12"
                            priority
                        />

                        <Label typeStyle={ETypographyType.H1Desktop} className="text-black">
                            {t('auth.resetPassword')}
                        </Label>

                        <Label className="text-secondary-gris-fonce text-base" weight={400}>
                            {t('auth.resetPasswordDescription')}
                        </Label>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                    >
                        <form.Field name="password">
                            {({ state, handleChange }: any) => (
                                <Input
                                    containerClassName="mb-3"
                                    label={t('auth.newPassword')}
                                    isPassword
                                    placeholder={t('auth.enterYourPassword')}
                                    value={state.value}
                                    id="reset-password"
                                    onChange={(e) => handleChange(e.target.value)}
                                    hintText={state.meta.errors[0]?.message}
                                    error={state.meta.errors[0]}
                                    required
                                />
                            )}
                        </form.Field>

                        <form.Field name="confirmPassword">
                            {({ state, handleChange }: any) => (
                                <Input
                                    containerClassName="mb-3"
                                    label={t('auth.confirmPassword')}
                                    isPassword
                                    placeholder={t('auth.enterYourConfirmPassword')}
                                    value={state.value}
                                    id="reset-confirm-password"
                                    onChange={(e) => handleChange(e.target.value)}
                                    hintText={state.meta.errors[0]?.message}
                                    error={state.meta.errors[0]}
                                    required
                                />
                            )}
                        </form.Field>

                        <form.Subscribe selector={(state: any) => [state.canSubmit, state.isSubmitting]}>
                            {([canSubmit, isSubmitting]: [boolean, boolean]) => (
                                <Button
                                    className="group relative w-full flex justify-center"
                                    disabled={!canSubmit}
                                    isLoading={isSubmitting}
                                    text={isSubmitting ? "Updating..." : t('auth.resetPassword')}
                                />
                            )}
                        </form.Subscribe>
                    </form>
                </div>
            </div>
        </div>
    );
}
`);
