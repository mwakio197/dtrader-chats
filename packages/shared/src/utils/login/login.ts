import { isStorageSupported } from '../storage/storage';
import { getHubSignupUrl } from '../url';
import { routes } from '../routes/routes';
import { getBrandHubLoginUrl } from '../brand';

export const redirectToLogin = (is_logged_in: boolean, language: string, has_params = true, redirect_delay = 0) => {
    if (!is_logged_in && isStorageSupported(sessionStorage)) {
        const l = window.location;
        const redirect_url = has_params ? window.location.href : `${l.protocol}//${l.host}${l.pathname}`;
        sessionStorage.setItem('redirect_url', redirect_url);
        setTimeout(() => {
            // Use external login instead of OAuth
            window.location.href = getBrandHubLoginUrl();
        }, redirect_delay);
    }
};

export const redirectToSignUp = () => {
    const location = window.location.href;
    const isDtraderRoute = window.location.pathname.includes(routes.index);

    if (isDtraderRoute) {
        window.open(getHubSignupUrl(location));
    } else {
        window.open(getHubSignupUrl());
    }
};

type TLoginUrl = {
    language: string;
};

// Simplified login URL - always use external login from brand url
export const loginUrl = ({ language }: TLoginUrl) => {
    return getBrandHubLoginUrl();
};
