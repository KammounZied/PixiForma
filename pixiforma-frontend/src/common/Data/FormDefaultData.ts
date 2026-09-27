import { useTranslation } from "next-i18next"

class FormDefaultData {
    private static instance: FormDefaultData
    private t: ReturnType<typeof useTranslation>['t']

    constructor(t: ReturnType<typeof useTranslation>['t']) {
        this.t = t
    }

    public static getInstance(t: ReturnType<typeof useTranslation>['t']): FormDefaultData {
        if (!FormDefaultData.instance) {
            FormDefaultData.instance = new FormDefaultData(t)
        }
        return FormDefaultData.instance
    }

    public static loginDefaultValues(): { email: string; password: string; rememberMe: boolean } {
        return {
            email: "",
            password: '',
            rememberMe: false
        }
    }

    public static registerDefaultValues(): {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        confirmPassword: string;
    } {
        return {
            firstName: "",
            lastName: '',
            email: '',
            password: '',
            confirmPassword: ''
        }
    }

    public static CreateClientDefaultValues(): {
        entrepriseName: string;
        contactOneFirstName: string;
        contactOneSecondName: string;
        emailAddressContact1: string;
        contactOneComment: string;
        secondContactFirstName: string;
        secondContactSecondName: string;
        emailAddressContact2: string;
        secondContactComment: string;
    } {
        return {
            entrepriseName: "",
            contactOneFirstName: '',
            contactOneSecondName: '',
            emailAddressContact1: '',
            contactOneComment: '',
            secondContactFirstName: '',
            secondContactSecondName: '',
            emailAddressContact2: '',
            secondContactComment: ''
        }
    }

    public static forgotPasswordDefaultValues(): {
        email: string;
    } {
        return {
            email: "",
        }
    }

    public static resetPasswordDefaultValues(): {
        password: string;
        confirmPassword: string;
    } {
        return {
            password: "",
            confirmPassword: "",
        }
    }
}
export { FormDefaultData }