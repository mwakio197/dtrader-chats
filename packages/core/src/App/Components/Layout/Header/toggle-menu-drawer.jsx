import React from 'react';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';

import { /* useOauth2, */ useRemoteConfig } from '@deriv/api';
import { Div100vhContainer, Icon, MobileDrawer, ToggleSwitch } from '@deriv/components';
// eslint-disable-next-line no-unused-vars -- getDomainUrl kept for future handleTradershubRedirect restoration
import { getStaticUrl, routes } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { localize } from '@deriv/translations';
// eslint-disable-next-line no-unused-vars, import/no-unresolved -- Kept for future restoration of Analytics functionality
import { Analytics } from '@deriv-com/analytics';

// eslint-disable-next-line no-unused-vars, import/no-unresolved -- Kept for future restoration of LiveChat functionality
import LiveChat from 'App/Components/Elements/LiveChat';
// eslint-disable-next-line no-unused-vars, import/no-unresolved -- Kept for future restoration of WhatsApp functionality
import WhatsApp from 'App/Components/Elements/WhatsApp';
import NetworkStatus from 'App/Components/Layout/Footer';
import getRoutesConfig from 'App/Constants/routes-config';
import ServerTime from 'App/Containers/server-time.jsx';

import { MenuTitle, MobileLanguageMenu } from './Components/ToggleMenu';
import MenuLink from './menu-link';

const ToggleMenuDrawer = observer(() => {
    const { ui, client, traders_hub } = useStore();
    const {
        disableApp,
        enableApp,
        is_mobile,
        is_mobile_language_menu_open,
        is_dark_mode_on: is_dark_mode,
        setDarkMode: toggleTheme,
        setMobileLanguageMenuOpen,
    } = ui;
    const {
        account_status,
        has_wallet,
        is_logged_in,
        is_virtual,
        logout: logoutClient,
        should_allow_authentication,
        is_eu,
        is_passkey_supported,
    } = client;
    const { show_eu_related_content } = traders_hub;

    const { pathname: route } = useLocation();

    const should_show_regulatory_information = is_eu && show_eu_related_content && !is_virtual;

    const { data } = useRemoteConfig(true);
    // eslint-disable-next-line no-unused-vars -- Variables kept for future LiveChat/WhatsApp restoration
    const { cs_chat_livechat, cs_chat_whatsapp } = data;

    const [is_open, setIsOpen] = React.useState(false);
    const [transitionExit, setTransitionExit] = React.useState(false);
    const [primary_routes_config, setPrimaryRoutesConfig] = React.useState([]);
    const [, expandSubMenu] = React.useState(false);

    const timeout = React.useRef();

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
        expandSubMenu(false);
    }, [expandSubMenu, is_open, is_mobile_language_menu_open, setMobileLanguageMenuOpen]);

    // TODO: Remove if no longer needed
    // const handleLogout = React.useCallback(async () => {
    //     setIsLoggingOut(true);
    //     toggleDrawer();
    //     history.push(routes.index);
    //     await logoutClient();
    // }, [history, logoutClient, toggleDrawer, setIsLoggingOut]);

    // Simple logout handler that closes drawer and calls logout
    const handleLogout = React.useCallback(async () => {
        toggleDrawer();
        await logoutClient();
    }, [logoutClient, toggleDrawer]);

    // const { oAuthLogout } = useOauth2({ handleLogout });

    const getFilteredRoutesConfig = (all_routes_config, routes_to_filter) => {
        const subroutes_config = all_routes_config.flatMap(i => i.routes || []);

        return routes_to_filter
            .map(path => all_routes_config.find(r => r.path === path) || subroutes_config.find(r => r.path === path))
            .filter(route => route && route.getTitle && route.getTitle() !== 'Error 404'); // Filter out 404 routes
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
            <MobileDrawer.SubMenu
                key={idx}
                has_subheader
                submenu_icon={route_config.icon_component}
                submenu_title={route_config.getTitle()}
                submenu_suffix_icon='IcChevronRight'
                onToggle={expandSubMenu}
                route_config_path={route_config.path}
            >
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
            </MobileDrawer.SubMenu>
        );
    };

    // const HelpCentreRoute = has_border_bottom => {
    //     return (
    //         <MobileDrawer.Item className={classNames({ 'header__menu-mobile-theme': has_border_bottom })}>
    //             <MenuLink
    //                 link_to={getStaticUrl('/help-centre')}
    //                 icon='IcHelpCentre'
    //                 text={localize('Help centre')}
    //                 onClickLink={toggleDrawer}
    //             />
    //         </MobileDrawer.Item>
    //     );
    // };

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
                title={<MenuTitle />}
                height='100vh'
                width='295px'
                className='pre-appstore'
            >
                <Div100vhContainer height_offset='40px'>
                    <div className='header__menu-mobile-body-wrapper'>
                        <React.Fragment>
                            <MobileDrawer.Body>
                                <MobileDrawer.Item>
                                    <MenuLink
                                        link_to={getStaticUrl('/')}
                                        icon='IcBrandShortLogo'
                                        text='Deriv.com'
                                        onClickLink={toggleDrawer}
                                    />
                                </MobileDrawer.Item>
                                {route !== routes.index && (
                                    <MobileDrawer.Item>
                                        <MenuLink
                                            link_to={routes.index}
                                            icon='IcTrade'
                                            text={localize('Trade')}
                                            onClickLink={toggleDrawer}
                                            is_active={route === routes.index}
                                        />
                                    </MobileDrawer.Item>
                                )}
                                {primary_routes_config.map((route_config, idx) =>
                                    getRoutesWithSubMenu(route_config, idx)
                                )}
                                {!has_wallet && (
                                    <MobileDrawer.Item
                                        className='header__menu-mobile-theme'
                                        onClick={e => {
                                            e.preventDefault();
                                            toggleTheme(!is_dark_mode);
                                        }}
                                    >
                                        <div className={classNames('header__menu-mobile-link')}>
                                            <Icon className='header__menu-mobile-link-icon' icon={'IcTheme'} />
                                            <span className='header__menu-mobile-link-text'>
                                                {localize('Dark theme')}
                                            </span>
                                            <ToggleSwitch
                                                id='dt_mobile_drawer_theme_toggler'
                                                handleToggle={() => toggleTheme(!is_dark_mode)}
                                                is_enabled={is_dark_mode}
                                            />
                                        </div>
                                    </MobileDrawer.Item>
                                )}
                                {/* {HelpCentreRoute()} */}
                                {is_logged_in ? (
                                    <React.Fragment>
                                        {/* <MobileDrawer.Item
                                            className={
                                                should_show_regulatory_information
                                                    ? ''
                                                    : 'header__menu-mobile-theme--trader-hub'
                                            }
                                        >
                                            <MenuLink
                                                link_to={getStaticUrl('/responsible')}
                                                icon='IcVerification'
                                                text={localize('Responsible trading')}
                                                onClickLink={toggleDrawer}
                                            />
                                        </MobileDrawer.Item> */}
                                        {should_show_regulatory_information && (
                                            <MobileDrawer.Item className='header__menu-mobile-theme--trader-hub'>
                                                <MenuLink
                                                    link_to={getStaticUrl('/regulatory')}
                                                    icon='IcRegulatoryInformation'
                                                    text={localize('Regulatory information')}
                                                    onClickLink={toggleDrawer}
                                                />
                                            </MobileDrawer.Item>
                                        )}
                                    </React.Fragment>
                                ) : (
                                    <React.Fragment>
                                        {/* <MobileDrawer.Item className='header__menu-mobile-theme--trader-hub'>
                                            <MenuLink
                                                link_to={getStaticUrl('/responsible')}
                                                icon='IcVerification'
                                                text={localize('Responsible trading')}
                                                onClickLink={toggleDrawer}
                                            />
                                        </MobileDrawer.Item> */}
                                    </React.Fragment>
                                )}
                                {/* {cs_chat_whatsapp && (
                                    <MobileDrawer.Item className='header__menu-mobile-whatsapp'>
                                        <WhatsApp onClick={toggleDrawer} />
                                    </MobileDrawer.Item>
                                )}
                                {cs_chat_livechat && (
                                    <MobileDrawer.Item className='header__menu-mobile-livechat'>
                                        <LiveChat />
                                    </MobileDrawer.Item>
                                )} */}
                                {is_logged_in && (
                                    <MobileDrawer.Item onClick={handleLogout} className='dc-mobile-drawer__item'>
                                        <MenuLink icon='IcLogout' text={localize('Log out')} />
                                    </MobileDrawer.Item>
                                )}
                            </MobileDrawer.Body>
                            <MobileDrawer.Footer className={is_logged_in ? 'dc-mobile-drawer__footer--servertime' : ''}>
                                <ServerTime is_mobile />
                                <NetworkStatus is_mobile />
                            </MobileDrawer.Footer>
                            {is_mobile_language_menu_open && (
                                <MobileLanguageMenu expandSubMenu={expandSubMenu} toggleDrawer={toggleDrawer} />
                            )}
                        </React.Fragment>
                    </div>
                </Div100vhContainer>
            </MobileDrawer>
        </React.Fragment>
    );
});

ToggleMenuDrawer.displayName = 'ToggleMenuDrawer';

export default ToggleMenuDrawer;
