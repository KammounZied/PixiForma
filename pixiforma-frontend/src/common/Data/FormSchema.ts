import { useTranslation } from "next-i18next";
import { z } from "zod";

class FormSchema {
    private static instance: FormSchema
    private t: ReturnType<typeof useTranslation>['t']

    constructor(t: ReturnType<typeof useTranslation>['t']) {
        this.t = t
    }

    public static getInstance(t: ReturnType<typeof useTranslation>['t']): FormSchema {
        if (!FormSchema.instance) {
            FormSchema.instance = new FormSchema(t)
        }
        return FormSchema.instance
    }

    public static loginFormSchema() {
        return z.object({
            email: z
                .email("Format d'email invalide")
                .min(1, "Email requis"),
            password: z
                .string()
                .min(1, "Le mot de passe ne peut pas être vide")
                .max(120, "Le mot de passe est trop long"),
            rememberMe: z.
                boolean()
        });
    }

    public static registerFormSchema() {
        return z.object({
            firstName: z
                .string()
                .min(1, "Le prénom est requis"),

            lastName: z
                .string()
                .min(1, "Le nom est requis"),

            email: z
                .string()
                .email("Format d'email invalide")
                .min(1, "Email requis"),

            password: z
                .string()
                .min(8, "Le mot de passe doit contenir au moins 8 caractères")
                .max(120, "Le mot de passe est trop long")
                .regex(/[a-z]/, "Doit contenir au moins une lettre minuscule")
                .regex(/[A-Z]/, "Doit contenir au moins une lettre majuscule")
                .regex(/\d/, "Doit contenir au moins un chiffre")
                .regex(/[^A-Za-z0-9]/, "Doit contenir au moins un caractère spécial"),

            confirmPassword: z
                .string()
                .min(1, "Confirmation du mot de passe requise")
                .max(120, "La confirmation est trop longue"),
        })
            .refine((data) => data.password === data.confirmPassword, {
                message: "Les mots de passe ne correspondent pas",
                path: ["confirmPassword"],
            });
    }

    public static createClientSchema() {
        return z.object({
            entrepriseName: z
                .string()
                .min(1, "Le nom de l'entreprise est requis"),
            contactOneFirstName: z
                .string()
                .min(1, "Le prénom du contact est requis"),
            contactOneSecondName: z
                .string()
                .min(1, "Le nom du contact est requis"),
            emailAddressContact1: z
                .email("Format d'email invalide")
                .min(1, "Email requis"),
            contactOneComment: z
                .string()
                .min(1, "Un commentaire est requis"),
            secondContactFirstName: z
                .string()
                .min(1, "Le prénom du contact est requis"),
            secondContactSecondName: z
                .string()
                .min(1, "Le nom du contact est requis"),
            emailAddressContact2: z
                .email("Format d'email invalide")
                .min(1, "Email requis"),
            secondContactComment: z
                .string()
                .min(1, "Un commentaire est requis"),
        });
    }
    public static forgotPasswordSchema() {
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
                .regex(/\d/, "Doit contenir au moins un chiffre")
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
export { FormSchema }