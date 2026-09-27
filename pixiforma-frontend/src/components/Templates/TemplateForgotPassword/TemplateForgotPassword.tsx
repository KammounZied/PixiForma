'use client';

import { useTranslations } from 'next-intl';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { ETypographyType } from '@/Enum/Enum';
import { Button } from '@/components/Atoms';
import { Input } from '@/components/Molecules';
import { ITemplateLogin } from '@/interfaces';
import Image from 'next/image';
import LoginImg from '../../../assets/images/login_image.jpg';
import Logo from '../../../assets/images/logo.png';

export default function TemplateForgotPassword({ form }: Readonly<ITemplateLogin>) {
    const t = useTranslations();

    return (
        <div className='flex'>
            <div className="md:flex w-2/5 items-center justify-center relative p-4">
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
                                    id="forgot-password-submit-btn"
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
