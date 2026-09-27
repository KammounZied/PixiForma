'use client';

import { useTranslations } from 'next-intl';
import Label from '@/components/Atoms/AtomLabel/AtomLabel';
import { ECheckBoxStatus, ETypographyType } from '@/Enum/Enum';
import { Button, Checkbox } from '@/components/Atoms';
import { Input } from '@/components/Molecules';
import { ITemplateLogin } from '@/interfaces';
import Image from 'next/image';
import LoginImg from '../../../assets/images/login_image.jpg';
import Logo from '../../../assets/images/logo.png';
import Link from 'next/link';

export default function TemplateLogin({ form }: Readonly<ITemplateLogin>) {
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
                            alt="Field"
                            className= "mb-4"
                            priority
                        />
                        <Label
                            className='text-black text-[32px]'
                            //typeStyle={ETypographyType.H1Desktop}
                        >
                            {t('auth.welcome')}
                        </Label>
                        <Label
                            className='text-secondary-gris-fonce text-base'
                            weight={400}
                        >
                            {t('auth.loginRequired')}
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
                                    containerClassName='mb-3'
                                    label={t('auth.email')}
                                    placeholder={t('auth.enterYourEmail')}
                                    value={state.value}
                                    id={"login-email"}
                                    onChange={(e) => handleChange(e.target.value)}
                                    hintText={state.meta.errors[0]?.message}
                                    error={state.meta.errors[0]}
                                    required
                                />
                            )}
                        </form.Field>

                        <form.Field name="password">
                            {({ state, handleChange }: any) => (
                                <Input
                                    containerClassName='mb-2'
                                    label={t('auth.password')}
                                    isPassword
                                    placeholder={t('auth.enterYourPassword')}
                                    value={state.value}
                                    id={"login-password"}
                                    onChange={(e) => handleChange(e.target.value)}
                                    hintText={state.meta.errors[0]?.message}
                                    error={state.meta.errors[0]}
                                    required
                                />
                            )}
                        </form.Field>

                        <div className="flex items-center justify-between mb-8">
                            <form.Field name="rememberMe">
                                {({ state, handleChange }: any) => (
                                    <div
                                        onClick={() => handleChange(!state.value)}
                                        className="flex items-center hover:cursor-pointer"
                                        role='none'
                                    >
                                        <Checkbox
                                            id='login-remember-me'
                                            status={state.value ? ECheckBoxStatus.checked : ECheckBoxStatus.unchecked}
                                        />
                                        <Label
                                            className="ml-2 text-black"
                                            typeStyle={ETypographyType.BodyRegular}
                                        >
                                            {t('auth.rememberMe')}
                                        </Label>
                                    </div>
                                )}
                            </form.Field>
                            <Link href="/forgot-password">
                                <Label
                                    weight={600}
                                    className="block text-black text-sm hover:cursor-pointer"
                                >
                                    {t('auth.forgotPassword')}
                                </Label>
                            </Link>
                        </div>

                        <form.Subscribe
                            selector={(state: any) => [state.canSubmit, state.isSubmitting]}
                        >
                            {([canSubmit, isSubmitting]: [boolean, boolean]) => (
                                <Button
                                    id={"login-submit-btn"}
                                    className="group relative w-full flex justify-center"
                                    disabled={!canSubmit}
                                    isLoading={isSubmitting}
                                    text={isSubmitting ? "Submitting..." : t('auth.signIn')}
                                />
                            )}
                        </form.Subscribe>
                    </form>

                    <div className='flex justify-center mt-8 whitespace-nowrap flex-nowrap items-center'>
                        <Label
                            typeStyle={ETypographyType.BodyMedium}
                            className="text-secondary-gris-fonce"
                        >
                            {t('auth.noAccount')}
                        </Label>
                        <a
                            href="mailto:support@pixiforma.com"
                            className="text-black cursor-pointer inline-block px-2"
                        >
                            <Label typeStyle={ETypographyType.BodyMediumBold}>
                                {t('auth.contactSupport')}
                            </Label>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
