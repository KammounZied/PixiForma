const CLIENTS_BASE = '/clients'

export const Routes = {
    // Public routes
    Login: '/login',
    ForgotPassword: '/forgot-password',
    ResetPassword: '/reset-password',
    Home: '/',
    CreateAnAccountNow: '/creer-compte',

    // Private routes
    Dashboard: '/dashboard',
    Notifications: '/notifications',
    Clients: {
        index: CLIENTS_BASE
    }
} as const;

export const PublicRoutes = [
    Routes.Login,
    Routes.ForgotPassword,
    Routes.ResetPassword,
    Routes.Home,
    Routes.CreateAnAccountNow,
] as const;

export const PrivateRoutes = [
    Routes.Clients,
    Routes.Dashboard,
    Routes.Notifications,
] as const;
