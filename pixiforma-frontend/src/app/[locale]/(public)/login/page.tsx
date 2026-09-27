'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { TemplateLogin } from '@/components/Templates';
import { FormSchema } from '@/common/Data/FormSchema';
import { FormDefaultData } from '@/common/Data/FormDefaultData';
import { toast } from "react-toastify";
import { useTranslations } from 'next-intl';

export default function LoginPage() {
    const router = useRouter();
    type FormData = z.infer<ReturnType<typeof FormSchema.loginFormSchema>>;
    const defaultValues: FormData = FormDefaultData.loginDefaultValues()
    const t = useTranslations();
    const form = useForm({
        defaultValues,
        validators: {
            onSubmit: FormSchema.loginFormSchema(),
        },
        onSubmit: async ({ value }) => {
            await handleSubmit(value)
        },
    });

    const handleSubmit = async (user: { email: string, password: string, rememberMe: boolean }) => {
        try {
            const result = await signIn('credentials', {
                email: user.email,
                password: user.password,
                rememberMe: user.rememberMe,
                redirect: false,
            });
            if (result?.error) {
                toast.error(t('auth.loginFailed'), {
                    position: "top-right"
                });
            } else {
                const session = await getSession();
                if (session) {
                    router.push('/dashboard');
                }
            }
        } catch (error) {
            console.error(t('auth.loginFailed'), error);
            toast.error(t('auth.loginFailed'), {
                position: "top-right"
            });
        }
    };

    return (
        <TemplateLogin form={form} />
    );
}
