'use client';

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
