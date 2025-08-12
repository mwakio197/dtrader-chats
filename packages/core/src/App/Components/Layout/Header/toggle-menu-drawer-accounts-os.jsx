import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { Div100vhContainer, Icon, MobileDrawer } from '@deriv/components';
import { useOauth2 } from '@deriv/api';
import { routes } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { localize } from '@deriv/translations';
// eslint-disable-next-line no-unused-vars, import/no-unresolved -- Kept for future restoration of Analytics functionality
import { Analytics } from '@deriv-com/analytics';

import getRoutesConfig from 'App/Constants/routes-config';

import MenuLink from './menu-link';

const ToggleMenuDrawerAccountsOS = observer(() => {
    const { ui, client } = useStore();
    const { disableApp, enableApp, is_mobile, is_mobile_language_menu_open, setMobileLanguageMenuOpen } = ui;
    const {
        account_status,
        has_wallet,
        is_logged_in,
        logout: logoutClient,
        should_allow_authentication,
        is_passkey_supported,
    } = client;

    const { pathname: route } = useLocation();

    const [is_open, setIsOpen] = React.useState(false);
    const [transitionExit, setTransitionExit] = React.useState(false);
    const [primary_routes_config, setPrimaryRoutesConfig] = React.useState([]);

    const timeout = React.useRef();
    const history = useHistory();

    // Cleanup timeout on unmount or route change
    React.useEffect(() => {
        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
                setTransitionExit(false);
                setIsOpen(false);
            }
        };
    }, [route]);

    React.useEffect(() => {
        const processRoutes = () => {
            const routes_config = getRoutesConfig();
            setPrimaryRoutesConfig(getFilteredRoutesConfig(routes_config, []));
        };

        if (account_status || should_allow_authentication) {
            processRoutes();
        }

        return () => clearTimeout(timeout.current);
    }, [account_status, should_allow_authentication, has_wallet, is_mobile, is_passkey_supported]);

    const toggleDrawer = React.useCallback(() => {
        if (is_mobile_language_menu_open) setMobileLanguageMenuOpen(false);
        if (!is_open) setIsOpen(!is_open);
        else {
            setTransitionExit(true);
            timeout.current = setTimeout(() => {
                setIsOpen(false);
                setTransitionExit(false);
            }, 400);
        }
    }, [is_open, is_mobile_language_menu_open, setMobileLanguageMenuOpen]);

    const handleLogout = React.useCallback(async () => {
        toggleDrawer();
        history.push(routes.index);
        await logoutClient();
    }, [history, logoutClient, toggleDrawer]);

    const { oAuthLogout } = useOauth2({ handleLogout });

    const getFilteredRoutesConfig = (all_routes_config, routes_to_filter) => {
        const subroutes_config = all_routes_config.flatMap(i => i.routes || []);

        return routes_to_filter
            .map(path => all_routes_config.find(r => r.path === path) || subroutes_config.find(r => r.path === path))
            .filter(route => route);
    };

    const getRoutesWithSubMenu = (route_config, idx) => {
        const has_access = route_config.is_authenticated ? is_logged_in : true;
        if (!has_access) return null;

        if (!route_config.routes) {
            return (
                <MobileDrawer.Item key={idx}>
                    <MenuLink
                        link_to={route_config.path}
                        icon={route_config.icon_component}
                        text={route_config.getTitle()}
                        onClickLink={toggleDrawer}
                    />
                </MobileDrawer.Item>
            );
        }

        const has_subroutes = route_config.routes.some(route => route.subroutes);

        return (
            <React.Fragment key={idx}>
                {has_subroutes &&
                    route_config.routes.map((route, index) => {
                        return route.subroutes ? (
                            <MobileDrawer.SubMenuSection
                                key={index}
                                section_icon={route.icon}
                                section_title={route.getTitle()}
                            >
                                {route.subroutes.map((subroute, subindex) => (
                                    <MenuLink
                                        key={subindex}
                                        is_disabled={subroute.is_disabled}
                                        link_to={subroute.path}
                                        text={subroute.getTitle()}
                                        onClickLink={() => {
                                            toggleDrawer();
                                        }}
                                    />
                                ))}
                            </MobileDrawer.SubMenuSection>
                        ) : (
                            <MobileDrawer.Item key={index}>
                                <MenuLink
                                    link_to={route.path}
                                    icon={route.icon_component}
                                    text={route.getTitle()}
                                    onClickLink={toggleDrawer}
                                />
                            </MobileDrawer.Item>
                        );
                    })}
            </React.Fragment>
        );
    };
    return (
        <React.Fragment>
            <a id='dt_mobile_drawer_toggle' onClick={toggleDrawer} className='header__mobile-drawer-toggle'>
                <Icon icon='IcHamburger' width='16px' height='16px' className='header__mobile-drawer-icon' />
            </a>
            <MobileDrawer
                alignment='left'
                icon_class='header__menu-toggle'
                is_open={is_open}
                transitionExit={transitionExit}
                toggle={toggleDrawer}
                id='dt_mobile_drawer'
                enableApp={enableApp}
                disableApp={disableApp}
                title={<div>{localize('Account settings')}</div>}
                height='100vh'
                width='295px'
                className='pre-appstore'
            >
                <Div100vhContainer height_offset='40px'>
                    <div className='header__menu-mobile-body-wrapper'>
                        <React.Fragment>
                            <MobileDrawer.Body className='tradershub-os-header'>
                                {primary_routes_config.map((route_config, idx) =>
                                    getRoutesWithSubMenu(route_config, idx)
                                )}
                                {is_logged_in && (
                                    <MobileDrawer.Item onClick={oAuthLogout} className='dc-mobile-drawer__item'>
                                        <MenuLink icon='IcLogout' text={localize('Log out')} />
                                    </MobileDrawer.Item>
                                )}
                            </MobileDrawer.Body>
                        </React.Fragment>
                    </div>
                </Div100vhContainer>
            </MobileDrawer>
        </React.Fragment>
    );
});

ToggleMenuDrawerAccountsOS.displayName = 'ToggleMenuDrawerAccountsOS';

export default ToggleMenuDrawerAccountsOS;
