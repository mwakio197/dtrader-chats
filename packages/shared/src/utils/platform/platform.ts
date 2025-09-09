import { getPlatformName, getPlatformLogo } from '../brand';
import { routes } from '../routes';

type TRoutingHistory = {
    action: string;
    hash: string;
    key: string;
    pathname: string;
    search: string;
}[];

/*
 * These functions exist because we want to refresh the browser page on switch between Bot and the rest of the platforms.
 * */

export const platform_name = Object.freeze({
    DTrader: getPlatformName(),
});

export const getPathname = () => {
    switch (window.location.pathname.split('/')[1]) {
        case '':
            return platform_name.DTrader;
        case 'reports':
            return 'Reports';
        default:
            return platform_name.DTrader;
    }
};

export const getPlatformInformation = () => {
    return { header: platform_name.DTrader, icon: getPlatformLogo() };
};

export const getActivePlatform = (routing_history: TRoutingHistory) => {
    switch (true) {
        case isNavigationFromPlatform(routing_history, '/'):
            return '';
        default:
            return platform_name.DTrader;
    }
};

export const getPlatformRedirect = () => {
    return { name: platform_name.DTrader, route: routes.index };
};

export const isNavigationFromPlatform = (
    app_routing_history: TRoutingHistory,
    platform_route: string,
    should_ignore_parent_path = false
) => {
    if (app_routing_history.length > 0) {
        const getParentPath = (pathname: string) => (/^http/.test(pathname) ? false : pathname.split('/')[1]);

        for (let i = 0; i < app_routing_history.length; i++) {
            const history_item = app_routing_history[i];
            const history_item_parent_path = getParentPath(history_item.pathname);
            const next_history_item = app_routing_history.length > i + 1 && app_routing_history[i + 1];

            if (
                history_item_parent_path === getParentPath(platform_route) ||
                (should_ignore_parent_path && history_item.pathname === platform_route)
            ) {
                return true;
            } else if (!next_history_item) {
                return false;
            } else if (history_item_parent_path === getParentPath(next_history_item.pathname)) {
                // Continue walking until we see passed in platform_route.
                continue; // eslint-disable-line no-continue
            } else {
                // Return false when path matches a platform parent path, but don't return anything
                // when a non-platform path was seen. i.e. navigating between /cashier and /reports
                // should not affect navigating back to platform when clicking cross.
                const platform_parent_paths = [routes.index].map(route => getParentPath(route));
                const is_other_platform_path = platform_parent_paths.includes(history_item_parent_path);

                if (is_other_platform_path) {
                    break;
                }
            }
        }
    }

    return false;
};

export const isNavigationFromExternalPlatform = (routing_history: TRoutingHistory, platform_route: string) => {
    /*
     *  Check if the client is navigating from external platform(SmartTrader)
     *  and has not visited Dtrader after it.
     */

    const platform_index = routing_history.findIndex(history_item => history_item.pathname === platform_route);
    const dtrader_index = routing_history.findIndex(history_item => history_item.pathname === routes.index);
    const has_visited_platform = platform_index !== -1;
    const has_visited_dtrader = dtrader_index !== -1;

    if (has_visited_platform) {
        return has_visited_dtrader ? platform_index < dtrader_index : true;
    }

    return false;
};
