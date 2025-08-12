import React from 'react';
import classNames from 'classnames';

import { useIsHubRedirectionEnabled } from '@deriv/api';
import { routes } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { useDevice } from '@deriv-com/ui';

import { MenuLinks } from 'App/Components/Layout/Header';
import { AccountsInfoLoader } from 'App/Components/Layout/Header/Components/Preloader';
import ToggleMenuDrawer from 'App/Components/Layout/Header/toggle-menu-drawer.jsx';
import ToggleMenuDrawerAccountsOS from 'App/Components/Layout/Header/toggle-menu-drawer-accounts-os.jsx';
import NewVersionNotification from 'App/Containers/new-version-notification.jsx';

import BrandShortLogo from './brand-short-logo';
import HeaderAccountActions from './header-account-actions';
import HubButton from './hub-button';

const HeaderLegacy = observer(() => {
    const { client, common, ui, notifications } = useStore();
    const {
        currency,
        has_wallet,
        is_logged_in,
        is_logging_in,
        is_single_logging_in,
        is_switching,
        is_client_store_initialized,
    } = client;
    const { is_from_tradershub_os } = common;
    const { header_extension, is_app_disabled, is_route_modal_on, toggleReadyToDepositModal } = ui;
    const { addNotificationMessage, client_notifications, removeNotificationMessage } = notifications;
    const { isHubRedirectionEnabled, isHubRedirectionLoaded } = useIsHubRedirectionEnabled();

    const { isDesktop } = useDevice();

    const addUpdateNotification = () => addNotificationMessage(client_notifications?.new_version_available);
    const removeUpdateNotification = React.useCallback(
        () => removeNotificationMessage({ key: 'new_version_available' }),
        [removeNotificationMessage]
    );

    React.useEffect(() => {
        document.addEventListener('IgnorePWAUpdate', removeUpdateNotification);
        return () => document.removeEventListener('IgnorePWAUpdate', removeUpdateNotification);
    }, [removeUpdateNotification]);

    const excludedRoutes = [
        routes.index,
        routes.trader_positions,
        routes.endpoint,
        routes.redirect,
        routes.index,
        routes.error404,
    ];

    const isExcludedRoute = excludedRoutes.some(route => window.location.pathname.includes(route));

    if (
        (!is_client_store_initialized && !isExcludedRoute) ||
        (has_wallet && !isHubRedirectionLoaded && !isExcludedRoute) ||
        (has_wallet && isHubRedirectionLoaded && !isExcludedRoute && isHubRedirectionEnabled)
    ) {
        return null;
    }

    return (
        <header
            className={classNames('header', {
                'header--is-disabled': is_app_disabled || is_route_modal_on,
                'header--tradershub_os_mobile': is_logged_in && is_from_tradershub_os && !isDesktop,
                'header--tradershub_os_desktop': is_logged_in && is_from_tradershub_os && isDesktop,
            })}
        >
            <div className='header__menu-items'>
                <div className='header__menu-left'>
                    {isDesktop ? (
                        <React.Fragment>
                            <BrandShortLogo />
                            <div className='header__divider' />
                            {/* <TradersHubHomeButton /> */}
                            {is_logged_in && <HubButton />}
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            {is_from_tradershub_os ? (
                                <>
                                    <ToggleMenuDrawerAccountsOS />
                                    <BrandShortLogo />
                                </>
                            ) : (
                                <>
                                    <ToggleMenuDrawer />
                                    <BrandShortLogo />
                                    {header_extension && is_logged_in && (
                                        <div className='header__menu-left-extensions'>{header_extension}</div>
                                    )}
                                </>
                            )}
                        </React.Fragment>
                    )}
                    <MenuLinks />
                </div>

                <div
                    className={classNames('header__menu-right', {
                        'header__menu-right--hidden': !isDesktop && is_logging_in,
                    })}
                >
                    {is_logging_in || is_single_logging_in || is_switching ? (
                        <div
                            id='dt_core_header_acc-info-preloader'
                            className={classNames('acc-info__preloader', {
                                'acc-info__preloader--no-currency': !currency,
                            })}
                        >
                            <AccountsInfoLoader is_logged_in={is_logged_in} is_desktop={isDesktop} speed={3} />
                        </div>
                    ) : (
                        !is_from_tradershub_os && <HeaderAccountActions />
                    )}
                </div>
            </div>
            <NewVersionNotification onUpdate={addUpdateNotification} />
        </header>
    );
});

export default HeaderLegacy;
