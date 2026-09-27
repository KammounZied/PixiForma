const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'pixiforma-backend');
const frontendDir = path.join(__dirname, 'pixiforma-frontend');

function replaceInFile(filePath, searchRegex, replacement) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(searchRegex, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Patched ${filePath}`);
    } else {
        console.error(`File not found: ${filePath}`);
    }
}

// 1. routes/api.php
replaceInFile(
    path.join(backendDir, 'routes/api.php'),
    /use App\\Http\\Controllers\\AuthController;\\r?\\n/,
    "use App\\Http\\Controllers\\AuthController;\\nuse App\\Http\\Controllers\\PasswordController;\\n"
);
replaceInFile(
    path.join(backendDir, 'routes/api.php'),
    /Route::post\\('refresh', \\[AuthController::class, 'refresh'\\]\\)->name\\('refresh'\\);\\r?\\n/,
    "Route::post('refresh', [AuthController::class, 'refresh'])->name('refresh');\\nRoute::post('forgot-password', [PasswordController::class, 'forgotPassword']);\\nRoute::post('reset-password', [PasswordController::class, 'resetPassword']);\\n"
);

// 2. app/Models/User.php
replaceInFile(
    path.join(backendDir, 'app/Models/User.php'),
    /use Laravel\\Passport\\HasApiTokens;\\r?\\n/,
    "use Laravel\\Passport\\HasApiTokens;\\nuse App\\Notifications\\ResetPasswordNotification;\\n"
);
replaceInFile(
    path.join(backendDir, 'app/Models/User.php'),
    /\\s*\\}\\r?\\n\\}\\r?\\n?$/,
    "\\n    }\\n\\n    public function sendPasswordResetNotification($token): void\\n    {\\n        $this->notify(new ResetPasswordNotification($token));\\n    }\\n}\\n"
);

// 3. AuthController.php (change tags)
replaceInFile(
    path.join(backendDir, 'app/Http/Controllers/AuthController.php'),
    /tags: \\['Authentification'\\]/g,
    "tags: ['Gestion des comptes']"
);

// 4. FormSchema.ts
replaceInFile(
    path.join(frontendDir, 'src/common/Data/FormSchema.ts'),
    /\\}\\r?\\nexport \\{ FormSchema \\}/,
    `    public static forgotPasswordSchema() {
        return z.object({
            email: z
                .string()
                .email("Adresse e-mail invalide")
                .min(1, "Adresse e-mail requise"),
        });
    }

    public static resetPasswordSchema() {
        return z.object({
            password: z
                .string()
                .min(8, "Le mot de passe doit contenir au moins 8 caractères")
                .max(120, "Le mot de passe est trop long")
                .regex(/[a-z]/, "Doit contenir au moins une lettre minuscule")
                .regex(/[A-Z]/, "Doit contenir au moins une lettre majuscule")
                .regex(/\\d/, "Doit contenir au moins un chiffre")
                .regex(/[^A-Za-z0-9]/, "Doit contenir au moins un caractère spécial"),

            confirmPassword: z
                .string()
                .min(1, "Confirmation du mot de passe requise"),
        }).refine(
            (data) => data.password === data.confirmPassword,
            {
                message: "Les mots de passe ne correspondent pas",
                path: ["confirmPassword"],
            }
        );
    }
}
export { FormSchema }`
);

// 5. FormDefaultData.ts
replaceInFile(
    path.join(frontendDir, 'src/common/Data/FormDefaultData.ts'),
    /\\}\\r?\\n\\r?\\nexport \\{ FormDefaultData \\}/,
    `    }

    public static forgotPasswordDefaultValues(): { email: string; } {
        return { email: "" };
    }

    public static resetPasswordDefaultValues(): { password: string; confirmPassword: string; } {
        return { password: "", confirmPassword: "" };
    }
}

export { FormDefaultData }`
);

// 6. Templates/index.ts
replaceInFile(
    path.join(frontendDir, 'src/components/Templates/index.ts'),
    /export \\{ default as TemplateRegister \\} from "\\.\\/TemplateRegister\\/TemplateRegister";\\r?\\n/,
    `export { default as TemplateRegister } from "./TemplateRegister/TemplateRegister";
export { default as TemplateForgotPassword } from "./TemplateForgotPassword/TemplateForgotPassword";
export { default as TemplateResetPassword } from "./TemplateResetPassword/TemplateResetPassword";
`
);

// 7. config/app.php
replaceInFile(
    path.join(backendDir, 'config/app.php'),
    /'store' => env\\('APP_MAINTENANCE_STORE', 'database'\\),\\r?\\n\\s*\\],\\r?\\n/,
    `'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],
    'frontend_url' => env('FRONTEND_URL'),
`
);

// 8. RegisterRequest.php
replaceInFile(
    path.join(backendDir, 'app/Http/Requests/Auth/RegisterRequest.php'),
    /'password' => \\['required', 'string', 'min:8', 'confirmed'\\],/,
    `'password' => ['required', 'string', 'confirmed', \\Illuminate\\Validation\\Rules\\Password::min(8)->letters()->mixedCase()->numbers()->symbols()],`
);

// 9. creer-compte/page.tsx
replaceInFile(
    path.join(frontendDir, 'src/app/[locale]/(public)/creer-compte/page.tsx'),
    /firstName: user\\.firstName,\\s*lastName: user\\.lastName,\\s*email: user\\.email,\\s*password: user\\.password,/,
    `name: \`\${user.firstName} \${user.lastName}\`,
                        email: user.email,
                        password: user.password,
                        password_confirmation: user.confirmPassword,`
);

// 10. TemplateLogin.tsx
replaceInFile(
    path.join(frontendDir, 'src/components/Templates/TemplateLogin/TemplateLogin.tsx'),
    /<Label\\s+weight=\\{600\\}\\s+className="block text-black text-sm hover:cursor-pointer"\\s*>\\s*\\{t\\('auth\\.forgotPassword'\\)\\}\\s*<\\/Label>/,
    `<Link href="/forgot-password">
                                <Label
                                    weight={600}
                                    className="block text-black text-sm hover:cursor-pointer"
                                >
                                    {t('auth.forgotPassword')}
                                </Label>
                            </Link>`
);

console.log("Patch complete!");
