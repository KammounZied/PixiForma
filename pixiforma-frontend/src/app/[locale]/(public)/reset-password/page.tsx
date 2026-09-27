'use client';

import { useState, useEffect } from "react";
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
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);

    useEffect(() => {
        if (!token || !email) {
            setTokenValid(false);
            return;
        }

        fetch("/api/verify-reset-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, token }),
        })
            .then((res) => {
                if (res.ok) {
                    setTokenValid(true);
                } else {
                    setTokenValid(false);
                }
            })
            .catch(() => {
                setTokenValid(false);
            });
    }, [token, email]);

    useEffect(() => {
        if (tokenValid === false) {
            toast.error(t("auth.tokenExpired") || "Token expiré", {
                position: "top-right",
                autoClose: 2000,
            });
            const timeout = setTimeout(() => {
                router.push("/login");
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [tokenValid, router, t]);

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

    if (tokenValid === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">Vérification du token...</p>
            </div>
        );
    }

    if (tokenValid === false) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">Token invalide ou expiré. Redirection...</p>
            </div>
        );
    }

    return <TemplateResetPassword form={form} />;
}
