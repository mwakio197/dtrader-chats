export const routes = {
    // Essential routes
    index: '/',
    callback_page: '/callback',
    error404: '/404',
    redirect: '/redirect',
    endpoint: '/endpoint',

    // Trading routes
    trader_positions: '/positions',
    contract: '/contract/:contract_id',

    // Reports routes
    reports: '/reports',
    positions: '/reports/positions',
    profit: '/reports/profit',
    statement: '/reports/statement',

    // Utility routes
    os_redirect: '/os-redirect',
};

// External URLs for brand navigation
export const brand_url = {
    base: 'https://staging-app.champion.trade/champion',
    home: 'https://staging-app.champion.trade/champion/home',
    login: 'https://staging-app.champion.trade/champion/login',
};

export const DISABLE_LANDSCAPE_BLOCKER_ROUTES = [
    routes.index,
    routes.reports,
    routes.endpoint,
    /** because contract route has dynamic id */
    '/contract',
];

export const isDisabledLandscapeBlockerRoute = (path: string) => {
    // Root path is now the trade page
    if (path === '/') return true;
    return DISABLE_LANDSCAPE_BLOCKER_ROUTES.some(route => path.startsWith(route));
};
