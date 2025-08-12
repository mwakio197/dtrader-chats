import Cookies from 'js-cookie';
import { action, computed, makeObservable, observable, reaction, runInAction, when } from 'mobx';
import moment from 'moment';

import {
    // CFD_PLATFORMS import removed for simplified authentication
    deriv_urls,
    excludeParamsFromUrlQuery,
    filterUrlQuery,
    getAppId,
    isCryptocurrency,
    isEmptyObject,
    isLocal,
    isMobile,
    isProduction,
    isStaging,
    isTestDerivApp,
    isTestLink,
    LocalStore,
    redirectToLogin,
    removeCookies,
    routes,
    SessionStore,
    setCurrencies,
    // sortApiData removed - was only used by CFD methods
    urlForLanguage,
} from '@deriv/shared';
import { getLanguage, getRedirectionLanguage, localize } from '@deriv/translations';
import { Analytics } from '@deriv-com/analytics';
import { CountryUtils } from '@deriv-com/utils';
import { logError } from '@deriv/utils';

import { requestLogout, WS } from 'Services';
import BinarySocketGeneral from 'Services/socket-general';

import { getAccountTitle, getClientAccountType } from './Helpers/client';
import { buildCurrenciesList } from './Modules/Trading/Helpers/currency';
import BaseStore from './base-store';

import BinarySocket from '_common/base/socket_base';
import * as SocketCache from '_common/base/socket_cache';
import { getRegion, isEuCountry, isMultipliersOnly, isOptionsBlocked } from '_common/utility';
import { CURRENCY_CONSTANTS } from '../Constants/currency';

const LANGUAGE_KEY = 'i18n_language';
const storage_key = 'client.accounts';
const store_name = 'client_store';
const eu_shortcode_regex = /^maltainvest$/;
const eu_excluded_regex = /^mt$/;

export default class ClientStore extends BaseStore {
    loginid;
    preferred_language;
    upgrade_info;
    email;
    accounts = {};
    authorize_accounts_list = [];
    is_trading_platform_available_account_loaded = false;
    initialized_broadcast = false;
    currencies_list = {};
    selected_currency = '';
    is_populating_account_list = false;
    is_logging_out = false;
    should_redirect_user_to_login = false;
    website_status = {};
    account_settings = {};
    account_status = {};
    device_data = {};
    is_authorize = false;
    is_logging_in = false;
    is_client_store_initialized = false;
    has_logged_out = false;
    is_account_setting_loaded = false;
    landing_companies = {};
    is_new_session = false;
    standpoint = {
        svg: false,
        maltainvest: false,
        gaming_company: false,
        financial_company: false,
    };

    upgradeable_landing_companies = [];
    obj_total_balance = {
        amount_real: undefined,
        currency: '',
    };
    local_currency_config = {
        currency: '',
        decimal_places: undefined,
    };
    has_cookie_account = false;

    subscriptions = {};
    client_kyc_status = {};
    is_tradershub_tracking = false;

    constructor(root_store) {
        const local_storage_properties = ['device_data'];
        super({ root_store, local_storage_properties, store_name });
        makeObservable(this, {
            loginid: observable,
            preferred_language: observable,
            upgrade_info: observable,
            email: observable,
            accounts: observable,
            initialized_broadcast: observable,
            currencies_list: observable,
            selected_currency: observable,
            is_populating_account_list: observable,
            is_logging_out: observable,
            website_status: observable,
            account_settings: observable,
            account_status: observable,
            device_data: observable,
            is_authorize: observable,
            is_logging_in: observable,
            is_client_store_initialized: observable,
            has_logged_out: observable,
            is_account_setting_loaded: observable,
            should_redirect_user_to_login: observable,
            landing_companies: observable,
            standpoint: observable,
            upgradeable_landing_companies: observable,
            obj_total_balance: observable,
            local_currency_config: observable,
            has_cookie_account: observable,
            balance: computed,
            account_open_date: computed,
            is_svg: computed,
            has_active_real_account: computed,
            has_maltainvest_account: computed,
            has_any_real_account: computed,
            can_change_fiat_currency: computed,
            legal_allowed_currencies: computed,
            upgradeable_currencies: computed,
            current_currency_type: computed,
            available_crypto_currencies: computed,
            available_onramp_currencies: computed,
            has_fiat: computed,
            current_fiat_currency: computed,
            current_landing_company: computed,
            account_list: computed,
            active_accounts: computed,
            all_loginids: computed,
            account_title: computed,
            currency: computed,
            is_crypto: action.bound,
            default_currency: computed,
            should_allow_authentication: computed,
            should_allow_poinc_authentication: computed,
            is_financial_assessment_needed: computed,
            is_authentication_needed: computed,
            is_identity_verification_needed: computed,
            is_poa_expired: computed,
            real_account_creation_unlock_date: computed,
            is_social_signup: computed,
            setShouldRedirectToLogin: action.bound,
            is_financial_information_incomplete: computed,
            is_deposit_lock: computed,
            is_duplicate_dob_phone: computed,
            is_withdrawal_lock: computed,
            is_trading_experience_incomplete: computed,
            authentication_status: computed,
            social_identity_provider: computed,
            is_from_restricted_country: computed,
            is_fully_authenticated: computed,
            is_financial_account: computed,
            landing_company_shortcode: computed,
            landing_company: computed,
            is_logged_in: computed,
            has_wallet: computed,
            should_restrict_bvi_account_creation: computed,
            should_restrict_vanuatu_account_creation: computed,
            reset_bvi_account_creation: computed,
            should_show_eu_error: computed,
            is_virtual: computed,
            is_eu: computed,
            can_upgrade: computed,
            can_upgrade_to: computed,
            virtual_account_loginid: computed,
            is_single_currency: computed,
            account_type: computed,
            is_bot_allowed: computed,
            clients_country: computed,
            is_eu_country: computed,
            is_options_blocked: computed,
            is_multipliers_only: computed,
            is_proof_of_ownership_enabled: computed,
            resetLocalStorageValues: action.bound,
            getBasicUpgradeInfo: action.bound,
            setPreferredLanguage: action.bound,
            setCookieAccount: action.bound,
            responsePayoutCurrencies: action.bound,
            responseAuthorize: action.bound,
            setWebsiteStatus: action.bound,
            accountRealReaction: action.bound,
            setLoginInformation: action.bound,
            realAccountSignup: action.bound,
            setAccountCurrency: action.bound,
            updateAccountCurrency: action.bound,
            createCryptoAccount: action.bound,
            residence: computed,
            email_address: computed,
            updateAccountList: action.bound,
            resetVirtualBalance: action.bound,
            init: action.bound,
            responseWebsiteStatus: action.bound,
            responseLandingCompany: action.bound,
            setIsLoggingOut: action.bound,
            setStandpoint: action.bound,
            setLoginId: action.bound,
            setAccounts: action.bound,
            setUrlParams: action.bound,
            setIsAuthorize: action.bound,
            setIsLoggingIn: action.bound,
            setBalanceActiveAccount: action.bound,
            setBalanceOtherAccounts: action.bound,
            selectCurrency: action.bound,
            setResidence: action.bound,
            setEmail: action.bound,
            setAccountSettings: action.bound,
            setAccountStatus: action.bound,
            updateAccountStatus: action.bound,
            setInitialized: action.bound,
            setIsClientStoreInitialized: action.bound,
            cleanUp: action.bound,
            logout: action.bound,
            setLogout: action.bound,
            storeClientAccounts: action.bound,
            setUserLogin: action.bound,
            canStoreClientAccounts: action.bound,
            getToken: action.bound,
            fetchAccountSettings: action.bound,
            is_high_risk: computed,
            is_low_risk: computed,
            has_residence: computed,
            is_eu_or_multipliers_only: computed,
            is_cr_account: computed,
            is_mf_account: computed,
            is_tradershub_tracking: observable,
            setTradersHubTracking: action.bound,
            account_time_of_closure: computed,
            is_account_to_be_closed_by_residence: computed,
            setClientKYCStatus: action.bound,
            client_kyc_status: observable,
            should_show_trustpilot_notification: computed,
        });

        reaction(
            () => [
                this.is_logged_in,
                this.loginid,
                this.email,
                this.landing_company,
                this.currency,
                this.residence,
                this.account_settings,
                this.preferred_language,
            ],
            () => {
                this.setCookieAccount();
                if (!this.is_logged_in) {
                    this.root_store.traders_hub.cleanup();
                }
            }
        );

        reaction(
            () => [this.account_settings],
            async () => {
                const language = getRedirectionLanguage(this.account_settings?.preferred_language, this.is_new_session);
                const should_update_preferred_language =
                    language !== this.account_settings?.preferred_language &&
                    this.preferred_language !== this.account_settings?.preferred_language;
                window.history.replaceState({}, document.title, urlForLanguage(language));
                if (should_update_preferred_language) {
                    this.setPreferredLanguage(language);
                    await WS.setSettings({
                        set_settings: 1,
                        preferred_language: language,
                    });
                }
            }
        );

        // Passkey reaction removed for simplified authentication

        when(
            () => !this.is_logged_in && this.root_store.ui && this.root_store.ui.is_real_acc_signup_on,
            () => this.root_store.ui.closeRealAccountSignup()
        );
    }

    get balance() {
        if (isEmptyObject(this.accounts) || !this.loginid || !this.accounts[this.loginid]) {
            return undefined;
        }

        const account = this.accounts[this.loginid];

        // Multi-account logic with enhanced checks
        if (account && 'balance' in account && typeof account.balance !== 'undefined' && account.balance !== null) {
            return account.balance.toString();
        }

        return undefined;
    }

    get account_open_date() {
        if (isEmptyObject(this.accounts) || !this.loginid || !this.accounts[this.loginid]) return undefined;
        return Object.keys(this.accounts[this.loginid]).includes('created_at')
            ? this.accounts[this.loginid].created_at
            : undefined;
    }

    get is_svg() {
        if (!this.landing_company_shortcode) {
            return false;
        }
        return this.landing_company_shortcode === 'svg' || this.landing_company_shortcode === 'costarica';
    }

    get has_active_real_account() {
        return this.active_accounts.some(acc => acc.is_virtual === 0);
    }

    get has_maltainvest_account() {
        return this.active_accounts.some(acc => acc.landing_company_shortcode === 'maltainvest');
    }

    hasAnyRealAccount = () => {
        // Multi-account logic
        return this.account_list.some(acc => acc.is_virtual === 0);
    };

    get has_any_real_account() {
        return this.hasAnyRealAccount();
    }

    get has_wallet() {
        return Object.values(this.accounts).some(account => account.account_category === 'wallet');
    }

    get can_change_fiat_currency() {
        // Simplified for single account - no CFD platforms to check
        return !this.is_virtual && this.current_currency_type === 'fiat';
    }

    get legal_allowed_currencies() {
        const getDefaultAllowedCurrencies = () => {
            if (this.landing_companies?.gaming_company) {
                return this.landing_companies?.gaming_company?.legal_allowed_currencies;
            }
            if (this.landing_companies?.financial_company) {
                return this.landing_companies?.financial_company?.legal_allowed_currencies;
            }
            return [];
        };

        if (!this.landing_companies || !this.root_store.ui) {
            return [];
        }
        if (!this.root_store.ui.real_account_signup_target) {
            return getDefaultAllowedCurrencies();
        }
        if (
            ['set_currency', 'manage'].includes(this.root_store.ui.real_account_signup_target) &&
            this.current_landing_company
        ) {
            return this.current_landing_company.legal_allowed_currencies;
        }
        const target = this.root_store.ui.real_account_signup_target === 'maltainvest' ? 'financial' : 'gaming';

        if (this.landing_companies[`${target}_company`]) {
            return this.landing_companies[`${target}_company`].legal_allowed_currencies;
        }

        return getDefaultAllowedCurrencies();
    }

    get upgradeable_currencies() {
        if (!this.legal_allowed_currencies || !this.website_status.currencies_config) return [];
        return this.legal_allowed_currencies.map(currency => ({
            value: currency,
            ...this.website_status.currencies_config[currency],
        }));
    }

    get current_currency_type() {
        if (this.account_type === 'virtual') return 'virtual';
        if (
            this.website_status &&
            this.website_status.currencies_config &&
            this.website_status.currencies_config[this.currency]
        ) {
            return this.website_status.currencies_config[this.currency].type;
        }

        return undefined;
    }

    get available_crypto_currencies() {
        const values = Object.values(this.accounts).reduce((acc, item) => {
            acc.push(item.currency);
            return acc;
        }, []);

        return this.upgradeable_currencies.filter(acc => !values.includes(acc.value) && acc.type === 'crypto');
    }

    get available_onramp_currencies() {
        if (!this.website_status?.currencies_config) return [];

        return Object.entries(this.website_status?.currencies_config).reduce((currencies, [currency, values]) => {
            if (values.platform.ramp.length > 0) {
                currencies.push(currency);
            }
            return currencies;
        }, []);
    }

    get has_fiat() {
        return Object.values(this.accounts).some(
            item =>
                item.currency_type === 'fiat' &&
                !item.is_virtual &&
                item.landing_company_shortcode === this.landing_company_shortcode
        );
    }

    get current_fiat_currency() {
        const account = Object.values(this.accounts).find(
            item =>
                item.currency_type === 'fiat' &&
                !item.is_virtual &&
                item.landing_company_shortcode === this.landing_company_shortcode
        );
        return account?.currency;
    }

    // return the landing company object that belongs to the current client by matching shortcode
    // note that it will be undefined for logged out and virtual clients
    get current_landing_company() {
        const landing_company =
            this.landing_companies &&
            Object.keys(this.landing_companies).find(
                company => this.landing_companies[company]?.shortcode === this.landing_company_shortcode
            );
        return landing_company ? this.landing_companies[landing_company] : undefined;
    }
    // Hiding UST account from the Authorization call, as it should be not just disabled, but temporary removed
    get account_list() {
        // Multi-account logic
        return this.all_loginids
            .map(id => this.getAccountInfo(id))
            .filter(account => !(account.title === CURRENCY_CONSTANTS.UST && account.is_disabled));
    }

    // CFD login getters removed for simplified authentication

    get active_accounts() {
        // Multi-account logic
        return this.accounts instanceof Object
            ? Object.values(this.accounts).filter(account => !account.is_disabled)
            : [];
    }

    get all_loginids() {
        // Multi-account logic
        return !isEmptyObject(this.accounts) ? Object.keys(this.accounts) : [];
    }

    get account_title() {
        return getAccountTitle(this.loginid);
    }

    get currency() {
        if (this.selected_currency.length) {
            return this.selected_currency;
        } else if (this.is_logged_in && this.loginid && this.accounts && this.accounts[this.loginid]) {
            return this.accounts[this.loginid].currency;
        }

        return this.default_currency;
    }

    is_crypto(currency) {
        return isCryptocurrency(currency || this.currency);
    }

    get default_currency() {
        if (Object.keys(this.currencies_list).length > 0) {
            const keys = Object.keys(this.currencies_list);
            // Fix for edge case when logging out from crypto accounts causes Fiat list to be empty
            if (this.currencies_list[localize('Fiat')]?.length < 1) return 'USD';
            return Object.values(this.currencies_list[`${keys[0]}`])[0].text;
        }

        return 'USD';
    }

    get should_allow_authentication() {
        return this.account_status?.status?.some(
            status => status === 'allow_document_upload' || status === 'allow_poi_resubmission'
        );
    }

    get should_allow_poinc_authentication() {
        return (
            this.is_fully_authenticated && this.account_status?.authentication?.needs_verification?.includes('income')
        );
    }

    get is_financial_assessment_needed() {
        return this.account_status?.status?.includes('financial_assessment_notification');
    }

    get is_poa_expired() {
        return this.account_status?.status?.includes('poa_expired');
    }

    get is_authentication_needed() {
        return !this.is_fully_authenticated && !!this.account_status?.authentication?.needs_verification?.length;
    }

    get is_identity_verification_needed() {
        const needs_verification = this.account_status?.authentication?.needs_verification;
        return needs_verification?.length === 1 && needs_verification?.includes('identity');
    }

    get real_account_creation_unlock_date() {
        const { cooling_off_expiration_date } = this.account_settings;
        return cooling_off_expiration_date;
    }

    get is_social_signup() {
        return this.account_status?.status?.includes('social_signup');
    }

    // CFD password status getters removed for simplified authentication

    get is_financial_information_incomplete() {
        return this.account_status?.status?.some(status => status === 'financial_information_not_complete');
    }

    get is_deposit_lock() {
        return this.account_status?.status?.some(status_name => status_name === 'deposit_locked');
    }

    get is_duplicate_dob_phone() {
        return this.account_status?.status?.some(status_name => status_name === 'duplicate_dob_phone');
    }

    get is_withdrawal_lock() {
        return this.account_status?.status?.some(status_name => status_name === 'withdrawal_locked');
    }

    get is_trading_experience_incomplete() {
        return this.account_status?.status?.some(status => status === 'trading_experience_not_complete');
    }

    get authentication_status() {
        const document_status = this.account_status?.authentication?.document?.status;
        const identity_status = this.account_status?.authentication?.identity?.status;
        return { document_status, identity_status };
    }

    get social_identity_provider() {
        return this.account_status?.social_identity_provider;
    }

    get is_from_restricted_country() {
        // Simplified - no residence list needed for simplified auth
        return false;
    }

    get is_fully_authenticated() {
        return this.account_status?.status?.some(status => status === 'authenticated');
    }

    get is_financial_account() {
        if (!this.landing_companies) return false;
        return this.account_type === 'financial';
    }

    get landing_company_shortcode() {
        if (this.loginid && this.accounts && this.accounts[this.loginid]) {
            return this.accounts[this.loginid].landing_company_shortcode;
        }
        return undefined;
    }

    get landing_company() {
        return this.landing_companies;
    }

    get is_logged_in() {
        if (
            isEmptyObject(this.accounts) ||
            !Object.keys(this.accounts).length ||
            !this.loginid ||
            !this.accounts[this.loginid]
        ) {
            return false;
        }

        // For multi-account auth, require a valid token
        return !!this.accounts[this.loginid].token;
    }

    get should_show_eu_error() {
        return this.is_eu && !this.is_low_risk;
    }

    get is_virtual() {
        return (
            !isEmptyObject(this.accounts) &&
            this.loginid &&
            this.accounts[this.loginid] &&
            !!this.accounts[this.loginid].is_virtual
        );
    }

    get is_eu() {
        if (!this.landing_companies) return false;
        const { gaming_company, financial_company, mt_gaming_company } = this.landing_companies;
        const financial_shortcode = financial_company?.shortcode;
        const gaming_shortcode = gaming_company?.shortcode;
        const mt_gaming_shortcode = mt_gaming_company?.financial.shortcode || mt_gaming_company?.swap_free.shortcode;
        const is_current_mf = this.landing_company_shortcode === 'maltainvest';
        return (
            is_current_mf || //is_currently logged in mf account via tradershub
            (financial_shortcode || gaming_shortcode || mt_gaming_shortcode
                ? (eu_shortcode_regex.test(financial_shortcode) && gaming_shortcode !== 'svg') ||
                  eu_shortcode_regex.test(gaming_shortcode)
                : eu_excluded_regex.test(this.residence))
        );
    }

    // Account upgrade getters simplified for trading-focused application
    get can_upgrade() {
        return false;
    }

    get can_upgrade_to() {
        return null;
    }

    get virtual_account_loginid() {
        return this.all_loginids.find(loginid => !!this.accounts[loginid].is_virtual);
    }

    get is_single_currency() {
        return (
            Object.keys(this.currencies_list)
                .map(type => Object.values(this.currencies_list[type]).length)
                .reduce((acc, cur) => acc + cur, 0) === 1
        );
    }

    get account_type() {
        return getClientAccountType(this.loginid);
    }

    get is_bot_allowed() {
        return this.isBotAllowed();
    }

    setIsLoggingOut(is_logging_out) {
        this.is_logging_out = is_logging_out;
    }

    setTradersHubTracking(is_tradershub_tracking = false) {
        this.is_tradershub_tracking = is_tradershub_tracking;
    }

    // Backward compatibility stubs for removed BVI account creation methods
    get should_restrict_bvi_account_creation() {
        return false;
    }

    get should_restrict_vanuatu_account_creation() {
        return false;
    }

    get reset_bvi_account_creation() {
        return false;
    }

    isBotAllowed = () => {
        // Stop showing Bot, DBot, DSmartTrader for logged out EU IPs
        if (!this.is_logged_in && this.is_eu_country) return false;
        const is_mf = this.landing_company_shortcode === 'maltainvest';
        return this.is_virtual ? this.is_eu_or_multipliers_only : !is_mf && !this.is_options_blocked;
    };

    get is_eu_or_multipliers_only() {
        // Check whether account is multipliers only and if the account is from eu countries
        return !this.is_multipliers_only ? !isEuCountry(this.residence) : !this.is_multipliers_only;
    }

    get clients_country() {
        return this.website_status?.clients_country;
    }

    get is_eu_country() {
        const country = this.website_status.clients_country;
        if (country) return isEuCountry(country);
        return false;
    }

    get is_options_blocked() {
        return isOptionsBlocked(this.residence);
    }

    get is_multipliers_only() {
        return isMultipliersOnly(this.residence);
    }

    /**
     * Store Values relevant to the loginid to local storage.
     *
     * @param loginid
     */
    resetLocalStorageValues(loginid) {
        this.accounts[loginid].accepted_bch = 0;
        LocalStore.setObject(storage_key, this.accounts);
        if (/^(CR|MF|VRTC)\d/.test(loginid)) sessionStorage.setItem('active_loginid', loginid);
        if (/^(CRW|MFW|VRW)\d/.test(loginid)) sessionStorage.setItem('active_wallet_loginid', loginid);
        this.setUrlParams();
        // Legacy platform sync removed as part of cleanup
        this.loginid = loginid;
    }

    setUrlParams() {
        const url = new URL(window.location.href);
        const loginid = sessionStorage.getItem('active_wallet_loginid') || sessionStorage.getItem('active_loginid');
        const account_param = /^VR/.test(loginid) ? 'demo' : this.accounts[loginid]?.currency;
        if (account_param) {
            url.searchParams.set('account', account_param);
            window.history.replaceState({}, '', url.toString());
        }
    }

    setIsAuthorize(value) {
        this.is_authorize = value;
    }

    // Account upgrade functionality removed for trading-focused application
    getBasicUpgradeInfo() {
        return {
            type: null,
            can_upgrade: false,
            can_upgrade_to: null,
            can_open_multi: false,
        };
    }

    setPreferredLanguage = lang => {
        this.preferred_language = lang;
        LocalStore.setObject(LANGUAGE_KEY, lang);
    };

    setCookieAccount() {
        const domain = /deriv\.(com|me|be)/.test(window.location.hostname)
            ? deriv_urls.DERIV_HOST_NAME
            : window.location.hostname;

        // eslint-disable-next-line max-len
        const { loginid, landing_company_shortcode, currency, account_settings, preferred_language, user_id } = this;

        const client_accounts = JSON.parse(LocalStore.get(storage_key) || '{}');
        const email = this.email || client_accounts[loginid]?.email;
        const residence = this.residence || client_accounts[loginid]?.residence;

        // const { first_name, last_name, name } = account_settings;
        if (loginid && email) {
            const client_information = {
                loginid,
                email,
                landing_company_shortcode,
                currency,
                residence,
                first_name: account_settings.first_name,
                last_name: account_settings.last_name,
                name: account_settings.name,
                preferred_language,
                user_id,
            };
            Cookies.set('region', getRegion(landing_company_shortcode, residence), { domain });
            Cookies.set('client_information', client_information, { domain });

            this.has_cookie_account = true;
        } else {
            removeCookies('region', 'client_information');
            this.has_cookie_account = false;
        }
    }

    responsePayoutCurrencies(response) {
        const list = response?.payout_currencies || response;
        this.currencies_list = buildCurrenciesList(Array.isArray(list) ? list : []);
        this.selectCurrency('');
    }

    responseAuthorize(response) {
        // Check if this is a V2 response (no account_list)
        const isV2Response = !response.authorize.account_list;

        if (isV2Response) {
            // V2 simplified processing - only update essential fields
            // Ensure the account object exists before setting properties
            if (!this.accounts[this.loginid]) {
                this.accounts[this.loginid] = {};
            }

            this.accounts[this.loginid].email = response.authorize.email || '';
            this.accounts[this.loginid].currency = response.authorize.currency;
            this.accounts[this.loginid].is_virtual = +response.authorize.is_virtual;
            this.accounts[this.loginid].session_start = parseInt(moment().utc().valueOf() / 1000);
            this.accounts[this.loginid].landing_company_shortcode = response.authorize.landing_company_name || '';
            this.accounts[this.loginid].country = response.authorize.country || '';
            this.user_id = response.authorize.user_id || '';

            if (this.user_id) {
                localStorage.setItem('active_user_id', this.user_id);
            }
            localStorage.setItem(storage_key, JSON.stringify(this.accounts));

            // Skip complex legacy processing for V2
            this.upgrade_info = this.getBasicUpgradeInfo();
            this.upgradeable_landing_companies = [];
            this.local_currency_config.currency = '';
            this.local_currency_config.decimal_places = 2;
        } else {
            // Legacy multi-account logic
            this.accounts[this.loginid].email = response.authorize.email;
            this.accounts[this.loginid].currency = response.authorize.currency;
            this.accounts[this.loginid].is_virtual = +response.authorize.is_virtual;
            this.accounts[this.loginid].session_start = parseInt(moment().utc().valueOf() / 1000);
            this.accounts[this.loginid].landing_company_shortcode = response.authorize.landing_company_name;
            this.accounts[this.loginid].country = response.country;
            this.updateAccountList(response.authorize.account_list);
            this.upgrade_info = this.getBasicUpgradeInfo();
            this.user_id = response.authorize.user_id;
            localStorage.setItem('active_user_id', this.user_id);
            localStorage.setItem(storage_key, JSON.stringify(this.accounts));
            this.upgradeable_landing_companies = [...new Set(response.authorize.upgradeable_landing_companies)];
            this.local_currency_config.currency = Object.keys(response.authorize.local_currencies)[0];

            // delete all notifications key when set new account except notifications for this account
            // need this because when the user switchs accounts we don't use logout
            const notification_messages = LocalStore.getObject('notification_messages');
            const messages = notification_messages[this.loginid] ?? [];
            LocalStore.setObject('notification_messages', {
                [this.loginid]: messages,
            });

            // For residences without local currency (e.g. ax)
            const default_fractional_digits = 2;
            this.local_currency_config.decimal_places = isEmptyObject(response.authorize.local_currencies)
                ? default_fractional_digits
                : +response.authorize.local_currencies[this.local_currency_config.currency].fractional_digits;
        }
    }

    setWebsiteStatus(response) {
        this.website_status = response.website_status;
        this.responseWebsiteStatus(response);
        setCurrencies(this.website_status);

        // TODO: remove the below lines after full smartcharts v2 launch.
        const domain = /deriv\.(com|me)/.test(window.location.hostname)
            ? deriv_urls.DERIV_HOST_NAME
            : window.location.hostname;
        const { clients_country } = this.website_status;

        const options = {
            domain,
            expires: 7,
        };

        try {
            const cookie = Cookies.get('website_status') ? JSON.parse(Cookies.get('website_status')) : {};
            cookie.clients_country = clients_country;
            Cookies.set('website_status', cookie, options);
        } catch (e) {
            Cookies.set('website_status', { clients_country }, options);
        }
    }

    async accountRealReaction(response) {
        return new Promise(resolve => {
            let client_accounts;
            const has_client_accounts = !!LocalStore.get(storage_key);

            runInAction(() => {
                this.is_populating_account_list = true;
            });

            if (this.is_logged_in && !has_client_accounts) {
                localStorage.setItem(storage_key, JSON.stringify(this.accounts));
                LocalStore.set(storage_key, JSON.stringify(this.accounts));
                // Legacy platform sync removed as part of cleanup
            }

            try {
                client_accounts = JSON.parse(LocalStore.get(storage_key));
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('JSON parse failed, invalid value (client.accounts): ', error);
            }

            const { oauth_token, client_id, currency_type } =
                response.new_account_real ?? response.new_account_maltainvest;
            BinarySocket.authorize(oauth_token)
                .then(authorize_response => {
                    const new_data = {};
                    new_data.token = oauth_token;
                    new_data.residence = authorize_response.authorize.country;
                    new_data.currency = authorize_response.authorize.currency;
                    new_data.is_virtual = authorize_response.authorize.is_virtual;
                    new_data.landing_company_name = authorize_response.authorize.landing_company_fullname;
                    new_data.landing_company_shortcode = authorize_response.authorize.landing_company_name;
                    new_data.currency_type = currency_type;
                    runInAction(() => (client_accounts[client_id] = new_data));
                    this.setLoginInformation(client_accounts);
                    WS.authorized.storage.getSettings().then(get_settings_response => {
                        this.setAccountSettings(get_settings_response.get_settings);
                        resolve();
                    });
                    // Legacy platform sync removed as part of cleanup
                })
                .catch(error => {
                    // eslint-disable-next-line no-console
                    console.error('Something went wrong while registering a real account: ', error);
                });
        });
    }

    setLoginInformation(client_accounts) {
        this.setAccounts(client_accounts);
        localStorage.setItem(storage_key, JSON.stringify(client_accounts));
        LocalStore.set(storage_key, JSON.stringify(client_accounts));
        this.is_populating_account_list = false;
        this.upgrade_info = this.getBasicUpgradeInfo();
        // Legacy platform sync removed as part of cleanup
    }

    // Account creation methods removed for trading-focused application
    // These methods are not needed for trading operations and can be safely removed
    // to simplify the codebase while maintaining authentication compatibility

    // Stub methods for external dependencies that may still call these methods
    async realAccountSignup() {
        return Promise.reject(new Error('Account creation not available in trading-focused mode'));
    }

    async setAccountCurrency() {
        return Promise.reject(new Error('Currency setting not available in trading-focused mode'));
    }

    async updateAccountCurrency() {
        return Promise.reject(new Error('Currency updates not available in trading-focused mode'));
    }

    async createCryptoAccount() {
        return Promise.reject(new Error('Account creation not available in trading-focused mode'));
    }

    get residence() {
        if (this.is_logged_in) {
            return this.account_settings?.country_code ?? '';
        }
        return '';
    }

    get email_address() {
        if (this.accounts && this.accounts[this.loginid]) {
            return this.accounts[this.loginid].email;
        }
        return '';
    }

    isAccountOfType = type => {
        const client_account_type = getClientAccountType(this.loginid);

        return (
            ((type === 'virtual' && client_account_type === 'virtual') ||
                (type === 'real' && client_account_type !== 'virtual') ||
                type === client_account_type) &&
            !this.isDisabled()
        );
    };

    updateAccountList(account_list) {
        this.authorize_accounts_list = account_list;
        account_list?.forEach(account => {
            if (account && account.loginid && this.accounts[account.loginid]) {
                this.accounts[account.loginid].excluded_until = account.excluded_until || '';
                Object.keys(account).forEach(param => {
                    const param_to_set = param === 'country' ? 'residence' : param;
                    const value_to_set = typeof account[param] === 'undefined' ? '' : account[param];
                    if (param_to_set !== 'loginid') {
                        this.accounts[account.loginid][param_to_set] = value_to_set;
                    }
                });
            }
        });
    }

    async resetVirtualBalance() {
        if (this.is_tradershub_tracking) {
            Analytics.trackEvent('ce_tradershub_dashboard_form', {
                action: 'reset_balance',
                form_name: 'traders_hub_default',
                account_mode: 'demo',
            });
        }

        this.root_store.notifications.removeNotificationByKey({ key: 'reset_virtual_balance' });
        this.root_store.notifications.removeNotificationMessage({
            key: 'reset_virtual_balance',
            should_show_again: true,
        });
        await WS.authorized.topupVirtual();
    }

    /**
     * We initially fetch things from local storage, and then do everything inside the store.
     */
    async init(login_new_user) {
        // Enhanced safe property access with comprehensive null checks
        let search = '';
        try {
            search =
                (SessionStore && typeof SessionStore.get === 'function'
                    ? SessionStore.get('signup_query_param')
                    : null) ||
                (window && window.location && typeof window.location.search === 'string'
                    ? window.location.search
                    : '') ||
                '';
        } catch (error) {
            search = '';
        }
        const search_params = new URLSearchParams(search);
        const redirect_url = search_params?.get('redirect_url');
        const action_param = search_params?.get('action');
        const loginid_param = search_params?.get('loginid');
        const unused_params = [
            'type',
            'acp',
            'label',
            'server',
            'interface',
            'cid',
            'age',
            'utm_source',
            'first_name',
            'second_name',
            'email',
            'phone',
            '_filteredParams',
        ];

        // redirect to the DTrader of there is needed query params
        if (!window.location.pathname.endsWith(routes.index) && /chart_type|interval|symbol|trade_type/.test(search)) {
            window.history.replaceState({}, document.title, routes.index + search);
        }

        // Check for V2 authentication (one-time token in URL or existing session token)
        const urlParams = new URLSearchParams(search);
        const oneTimeToken = urlParams.get('token'); // V2 uses 'token' parameter
        const existingSessionToken = this.getSessionToken();

        let authorize_response, client;

        if (existingSessionToken) {
            // If we have a session token, use it directly (pass null as oneTimeToken)
            authorize_response = await this.authenticateV2(null);
        } else if (oneTimeToken) {
            // Only try to exchange one-time token if we don't have a session token
            authorize_response = await this.authenticateV2(oneTimeToken);
        } else {
            // Legacy authentication flow
            authorize_response = await this.setUserLogin(login_new_user);
        }

        if (search) {
            if (window.location.pathname !== routes.callback_page) {
                // Verification code handling removed for simplified authentication

                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => {
                        // timeout is needed to get the token (code) from the URL before we hide it from the URL
                        // and from LiveChat that gets the URL from Window, particularly when initialized via HTML script on mobile
                        history.replaceState(null, null, window.location.search.replace(/&?code=[^&]*/i, ''));
                    }, 0);
                });
            }
        }

        // Device data tracking removed for trading-focused application

        // On case of invalid token, no need to continue with additional api calls.
        if (authorize_response?.error) {
            await this.logout();

            this.root_store.common.setError(true, {
                header: authorize_response.error.message,
                code: authorize_response.error.code,
                message: localize('Please Log in'),
                should_show_refresh: false,
                redirect_label: localize('Log in'),
                redirectOnClick: () => redirectToLogin(false, getLanguage()),
            });
            this.setIsLoggingIn(false);
            this.setInitialized(false);
            return false;
        }

        if (
            ['crypto_transactions_withdraw', 'payment_withdraw', 'payment_agent_withdraw'].includes(action_param) &&
            loginid_param
        ) {
            if (/^(CR|MF|VRTC)\d/.test(loginid_param)) sessionStorage.setItem('active_loginid', loginid_param);
            if (/^(CRW|MFW|VRW)\d/.test(loginid_param)) sessionStorage.setItem('active_wallet_loginid', loginid_param);
            this.setLoginId(loginid_param);
        } else
            this.setLoginId(
                window.sessionStorage.getItem('active_loginid') ||
                    window.sessionStorage.getItem('active_wallet_loginid') ||
                    LocalStore.get('active_loginid')
            );
        this.user_id = LocalStore.get('active_user_id');
        this.setAccounts(LocalStore.getObject(storage_key));
        // Email verification handling removed for simplified authentication
        const storedToken = localStorage.getItem('config.account1');
        // Enhanced safe property access for client object
        try {
            client =
                (this.accounts && typeof this.accounts === 'object' && this.loginid && this.accounts[this.loginid]) ||
                (storedToken ? { token: storedToken } : undefined);
        } catch (error) {
            client = storedToken ? { token: storedToken } : undefined;
        }

        // If there is an authorize_response, it means it was the first login
        if (authorize_response) {
            // If this fails, it means the landing company check failed
            if (this.loginid === authorize_response.authorize.loginid) {
                BinarySocketGeneral.authorizeAccount(authorize_response);
                Analytics.identifyEvent(this.user_id);

                await this.root_store.gtm.pushDataLayer({
                    event: 'login',
                });
            } else if (client && typeof client === 'object' && client.token && typeof client.token === 'string') {
                // So it will send an authorize with the accepted token, to be handled by socket-general
                try {
                    await BinarySocket.authorize(client.token);
                } catch (error) {
                    // Use logError from @deriv/utils instead of console.error
                    logError('BinarySocket.authorize failed', error);
                }
            }
            if (redirect_url) {
                const redirect_route = routes[redirect_url].length > 1 ? routes[redirect_url] : '';
                const has_action = [
                    'crypto_transactions_withdraw',
                    'payment_agent_withdraw',
                    'payment_withdraw',
                    'reset_password',
                ].includes(action_param);

                if (has_action) {
                    const query_string = filterUrlQuery(search, ['platform', 'code', 'action', 'loginid']);
                    window.location.replace(`${redirect_route}/redirect?${query_string}`);
                } else {
                    window.location.replace(`${redirect_route}/?${filterUrlQuery(search, ['platform', 'lang'])}`);
                }
            }
            runInAction(() => {
                this.is_populating_account_list = false;
            });
            const language = getRedirectionLanguage(
                authorize_response.authorize.preferred_language,
                this.is_new_session
            );
            const stored_language_without_double_quotes = LocalStore.get(LANGUAGE_KEY).replace(/"/g, '');
            if (stored_language_without_double_quotes && language !== stored_language_without_double_quotes) {
                window.history.replaceState({}, document.title, urlForLanguage(language));
                await this.root_store.common.changeSelectedLanguage(language);
            }
            // Citizen setting removed for trading-focused application
        }
        this.selectCurrency('');

        this.responsePayoutCurrencies(await WS.authorized.payoutCurrencies());

        if (this.is_logged_in) {
            if (Object.keys(this.account_settings).length === 0) {
                this.setAccountSettings((await WS.authorized.cache.getSettings()).get_settings);
            }

            if (this.account_settings) this.setPreferredLanguage(this.account_settings.preferred_language);

            // Residence list fetching removed for trading-focused application
            if (this.residence) {
                await WS.authorized.cache.landingCompany(this.residence).then(this.responseLandingCompany);
            }

            // This was set for the new callback page logic, once the user has logged in, we can remove the tokens and account1 from local storage since client.accounts is handling it already
            if (localStorage.getItem('config.tokens') && localStorage.getItem('config.account1')) {
                localStorage.removeItem('config.tokens');
                localStorage.removeItem('config.account1');
            }
        } else {
            // MT5 account list population reset removed for simplified authentication
        }
        this.responseWebsiteStatus(await WS.wait('website_status'));

        this.setIsLoggingIn(false);
        this.setInitialized(true);

        // delete search params if it's signup when signin completed
        if (action_param === 'signup') {
            const filteredQuery = filterUrlQuery(search, ['lang']);
            history.replaceState(
                null,
                null,
                window.location.href.replace(`${search}`, filteredQuery === '' ? '' : `?${filteredQuery}`)
            );
        }

        history.replaceState(
            null,
            null,
            window.location.href.replace(`${search}`, excludeParamsFromUrlQuery(search, unused_params))
        );

        this.setIsClientStoreInitialized();

        // Ensure balance subscription is active after full initialization
        // This is a safety mechanism for simplified auth where timing might cause subscription issues
        if (this.is_logged_in && this.loginid) {
            setTimeout(() => {
                // Import and call the balance subscription retry mechanism
                import('../Services/socket-general').then(({ default: BinarySocketGeneral }) => {
                    if (BinarySocketGeneral.ensureBalanceSubscription) {
                        BinarySocketGeneral.ensureBalanceSubscription();
                    }
                });
            }, 200);
        }

        return true;
    }

    responseWebsiteStatus(response) {
        this.website_status = response.website_status;
    }

    responseLandingCompany(response) {
        this.landing_companies = response.landing_company;
        this.setStandpoint(this.landing_companies);
    }

    setStandpoint(landing_companies) {
        if (!landing_companies) return;
        const { gaming_company, financial_company } = landing_companies;
        if (gaming_company?.shortcode) {
            this.standpoint = {
                ...this.standpoint,
                [gaming_company.shortcode]: !!gaming_company?.shortcode,
                gaming_company: gaming_company?.shortcode ?? false,
            };
        }
        if (financial_company?.shortcode) {
            this.standpoint = {
                ...this.standpoint,
                [financial_company.shortcode]: !!financial_company?.shortcode,
                financial_company: financial_company?.shortcode ?? false,
            };
        }
    }

    setLoginId(loginid) {
        this.loginid = loginid;
    }

    setAccounts(accounts) {
        this.accounts = accounts;
    }

    /**
     * Check if account is disabled or not
     *
     * @param loginid
     * @returns {string}
     */
    isDisabled(loginid = this.loginid) {
        const account = this.getAccount(loginid);
        return account ? account.is_disabled : false;
    }

    /**
     * Get accounts token from given login id.
     *
     * @param loginid
     * @returns {string}
     */
    getToken(loginid = this.loginid) {
        const account = this.getAccount(loginid);
        return account ? account.token : undefined;
    }

    /**
     * Get account object from given login id
     *
     * @param loginid
     * @returns {object}
     */
    getAccount(loginid = this.loginid) {
        return this.accounts && this.accounts[loginid] ? this.accounts[loginid] : {};
    }

    /**
     * Get information required by account switcher
     *
     * @param loginid
     * @returns {{loginid: *, is_virtual: (number|number|*), icon: string, title: *}}
     */
    getAccountInfo(loginid = this.loginid) {
        const account = this.getAccount(loginid);
        const currency = account ? account.currency : '';
        const is_disabled = account ? account.is_disabled : false;
        const is_virtual = account ? account.is_virtual : false;
        const account_type = !is_virtual && currency ? currency : this.account_title;

        setTimeout(async () => {
            const analytics_config = await this.getAnalyticsConfig();
            if (this.user_id) analytics_config.user_id = this.user_id;
            Analytics.setAttributes(analytics_config);
        }, 4);

        return {
            loginid,
            is_disabled,
            is_virtual,
            icon: account_type.toLowerCase(), // TODO: display the icon
            title: account_type.toLowerCase() === 'virtual' ? localize('DEMO') : account_type,
        };
    }

    async getAnalyticsConfig(isLoggedOut = false) {
        const broker = this.loginid?.match(/[a-zA-Z]+/g)?.join('');

        const ppc_campaign_cookies =
            Cookies.getJSON('utm_data') === 'null'
                ? {
                      utm_source: 'no source',
                      utm_medium: 'no medium',
                      utm_campaign: 'no campaign',
                      utm_content: 'no content',
                  }
                : Cookies.getJSON('utm_data');

        let residence_country = '';
        if (!isLoggedOut) {
            if (this.residence) {
                residence_country = this.residence;
            } else {
                try {
                    const { country_code } = (await WS.authorized.cache.getSettings())?.get_settings || {
                        country_code: '',
                    };
                    residence_country = country_code;
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error getting residence country', error);
                }
            }
        }
        let login_status = false;
        if (!isLoggedOut && this.is_logged_in) {
            login_status = true;
        }

        return {
            loggedIn: login_status,
            account_type: broker === 'null' ? 'unlogged' : broker,
            residence_country,
            app_id: String(getAppId()),
            device_type: isMobile() ? 'mobile' : 'desktop',
            language: getLanguage(),
            device_language: navigator?.language || 'en-EN',
            user_language: getLanguage().toLowerCase(),
            country: await CountryUtils.getCountry(),
            utm_source: ppc_campaign_cookies?.utm_source,
            utm_medium: ppc_campaign_cookies?.utm_medium,
            utm_campaign: ppc_campaign_cookies?.utm_campaign,
            utm_content: ppc_campaign_cookies?.utm_content,
            domain: window.location.hostname,
            url: window.location.href,
        };
    }

    setIsLoggingIn(bool) {
        this.is_logging_in = bool;
    }

    handleNotFoundLoginId() {
        // Logout if the switched_account doesn't belong to any loginid.
        this.root_store.notifications.addNotificationMessage({
            message: localize('Could not switch to default account.'),
            type: 'danger',
        });
        // request a logout
        this.logout();
    }

    // For single account model, we always have a valid login ID if we're logged in
    isUnableToFindLoginId() {
        // Check if we have a valid loginid and account
        if (!this.loginid || !this.accounts || !this.accounts[this.loginid]) {
            return true;
        }
        return false;
    }

    setBalanceActiveAccount(obj_balance) {
        if (!obj_balance || typeof obj_balance.balance === 'undefined') {
            return; // Invalid balance object
        }

        const loginid = obj_balance.loginid;
        if (!loginid || !this.accounts || !this.accounts[loginid]) {
            return; // Invalid loginid or account not found
        }

        // Always update balance if loginid matches current active account
        const shouldUpdateBalance = loginid === this.loginid;

        if (shouldUpdateBalance) {
            // Ensure MobX reactivity by updating the observable property
            this.accounts[loginid].balance = obj_balance.balance;

            // Handle virtual account notifications
            if (this.accounts[loginid].is_virtual) {
                this.root_store.notifications.resetVirtualBalanceNotification(loginid);
            }

            this.resetLocalStorageValues(window.sessionStorage.getItem('active_loginid') ?? this.loginid);
        }
    }

    // Stub for setBalanceOtherAccounts - not needed for simplified auth but called from socket-general.js
    setBalanceOtherAccounts() {
        // For simplified auth, we only have one account, so this is a no-op
        // Multi-account balance management is not needed
    }

    selectCurrency(value) {
        this.selected_currency = value;
    }

    setResidence(residence) {
        if (this.loginid && this.accounts && this.accounts[this.loginid]) {
            this.accounts[this.loginid].residence = residence;
        }
    }

    // setCitizen method removed for trading-focused application

    setEmail(email) {
        if (this.loginid && this.accounts && this.accounts[this.loginid]) {
            this.accounts[this.loginid].email = email;
            this.email = email;
        }
    }

    setIsClientStoreInitialized() {
        this.is_client_store_initialized = true;
    }

    setAccountSettings(settings) {
        const is_equal_settings = JSON.stringify(settings) === JSON.stringify(this.account_settings);
        if (!is_equal_settings) {
            this.account_settings = settings;
            this.is_account_setting_loaded = true;
        }
    }

    setAccountStatus(status) {
        this.account_status = status;
    }

    async updateAccountStatus() {
        const account_status_response = await WS.authorized.getAccountStatus();
        if (!account_status_response.error) {
            this.setAccountStatus(account_status_response.get_account_status);
        }
    }

    // CFD account details update method removed for simplified authentication

    setInitialized(is_initialized) {
        this.initialized_broadcast = is_initialized;
    }

    async cleanUp() {
        // delete all notifications keys for this account when logout
        const notification_messages = LocalStore.getObject('notification_messages');
        if (notification_messages && this.loginid) {
            delete notification_messages[this.loginid];
            LocalStore.setObject('notification_messages', {
                ...notification_messages,
            });
        }
        // update growthbook
        const analytics_config = await this.getAnalyticsConfig(true);
        Analytics.setAttributes(analytics_config);

        this.root_store.gtm.pushDataLayer({
            event: 'log_out',
        });
        this.loginid = null;
        this.user_id = null;
        this.upgrade_info = undefined;
        this.accounts = {};
        // CFD account lists removed for simplified authentication
        this.landing_companies = {};
        LocalStore.set('marked_notifications', JSON.stringify([]));
        localStorage.setItem('active_loginid', this.loginid);
        sessionStorage.removeItem('active_loginid');
        localStorage.setItem('active_user_id', this.user_id);
        localStorage.setItem('client.accounts', JSON.stringify(this.accounts));

        Analytics.reset();

        runInAction(async () => {
            this.responsePayoutCurrencies(await WS.payoutCurrencies());
        });
        this.root_store.notifications.removeAllNotificationMessages(true);

        // Legacy platform sync removed as part of cleanup
    }

    setShouldRedirectToLogin(should_redirect_user_to_login) {
        this.should_redirect_user_to_login = should_redirect_user_to_login;
    }

    async logout() {
        // makes sure to clear the cached traders-hub data when logging out
        localStorage.removeItem('traders_hub_store');
        localStorage.removeItem('trade_store');

        // TODO: [add-client-action] - Move logout functionality to client store
        const response = await requestLogout();

        if (response?.logout === 1) {
            await this.cleanUp();

            // Note: setIsSingleLoggingIn method was removed as part of cleanup
            this.setLogout(true);
            this.setIsLoggingOut(false);
        }

        return response;
    }

    setLogout(is_logged_out) {
        this.has_logged_out = is_logged_out;
        if (this.root_store.common.has_error) this.root_store.common.setError(false, null);
    }

    /* eslint-disable */
    storeClientAccounts(obj_params, account_list) {
        // store consistent names with other API calls
        // API_V4: send consistent names
        const map_names = {
            country: 'residence',
            landing_company_name: 'landing_company_shortcode',
        };
        const client_object = {};
        const selected_account = obj_params?.selected_acct;
        const verification_code = obj_params?.code;
        const is_wallets_selected = selected_account?.startsWith('CRW');
        let active_loginid = sessionStorage.getItem('active_loginid');
        let active_wallet_loginid;

        if (selected_account) {
            if (is_wallets_selected) {
                active_wallet_loginid = obj_params.selected_acct;
            }
            active_loginid = obj_params.selected_acct;
        }

        if (account_list && Array.isArray(account_list)) {
            account_list.forEach(function (account) {
                // Enhanced null checking for account object
                if (!account || typeof account !== 'object') {
                    return; // Skip invalid account objects
                }
                Object.keys(account).forEach(function (param) {
                    if (param === 'loginid') {
                        if (!active_loginid && !account.is_disabled) {
                            if (!account.is_virtual) {
                                active_loginid = account[param];
                            } else if (account.is_virtual) {
                                // TODO: [only_virtual] remove this to stop logging non-SVG clients into virtual
                                active_loginid = account[param];
                            }
                        }
                    } else {
                        const param_to_set = map_names[param] || param;
                        const value_to_set = typeof account[param] === 'undefined' ? '' : account[param];
                        if (account.loginid && !(account.loginid in client_object)) {
                            client_object[account.loginid] = {};
                        }
                        if (account.loginid) {
                            client_object[account.loginid][param_to_set] = value_to_set;
                        }
                    }
                });
            });
        }

        let i = 1;
        while (obj_params[`acct${i}`]) {
            const loginid = obj_params[`acct${i}`];
            const token = obj_params[`token${i}`];
            // Enhanced null checking before token assignment
            if (
                loginid &&
                token &&
                client_object &&
                typeof client_object === 'object' &&
                client_object[loginid] &&
                typeof client_object[loginid] === 'object'
            ) {
                client_object[loginid].token = token;
            }
            i++;
        }

        // if didn't find any login ID that matched the above condition
        // or the selected one doesn't have a token, set the first one
        if (!active_loginid || !client_object[active_loginid]?.token) {
            active_loginid = obj_params.acct1;
        }

        // TODO: send login flag to GTM if needed
        if (active_loginid && Object.keys(client_object).length) {
            if (selected_account && is_wallets_selected) {
                localStorage.setItem('active_wallet_loginid', active_wallet_loginid);
                sessionStorage.setItem('active_wallet_loginid', active_wallet_loginid);
                if (verification_code) {
                    localStorage.setItem('verification_code.payment_withdraw', verification_code);
                }
            }
            if (/^(CR|MF|VRTC)\d/.test(active_loginid)) sessionStorage.setItem('active_loginid', active_loginid);
            if (/^(CRW|MFW|VRW)\d/.test(active_loginid))
                sessionStorage.setItem('active_wallet_loginid', active_loginid);
            localStorage.setItem('active_loginid', active_loginid);
            localStorage.setItem('client.accounts', JSON.stringify(client_object));
            // Legacy platform sync removed as part of cleanup
        }

        this.setIsLoggingIn(false);
    }

    async setUserLogin(login_new_user) {
        // EXISTING: All legacy code below remains 100% untouched
        // login_new_user is populated only on virtual sign-up
        let obj_params = {};
        const search = window.location.search;

        let is_social_signup_provider = false;

        if (search && window.location.pathname !== routes.callback_page) {
            let search_params = new URLSearchParams(window.location.search);

            search_params.forEach((value, key) => {
                const account_keys = ['acct', 'token', 'cur', 'code'];
                const is_account_param = account_keys.some(
                    account_key => key?.includes(account_key) && key !== 'affiliate_token'
                );
                const auth_keys = ['acct', 'token'];
                const is_acct_token_params = auth_keys.some(
                    account_key => key?.includes(account_key) && key !== 'affiliate_token'
                );

                if (is_account_param) {
                    obj_params[key] = value;
                    is_social_signup_provider = true;
                    // NOTE: Remove this logic once social signup is intergated with OIDC
                    // NOTE: We only set logged_state to true when the params has acct1, token1 params
                    const isLoggedStateFalsy = !Cookies.get('logged_state') || Cookies.get('logged_state') === 'false';

                    if (isLoggedStateFalsy && is_acct_token_params) {
                        const currentDomain = window.location.hostname.split('.').slice(-2).join('.');
                        Cookies.set('logged_state', 'true', {
                            expires: 30,
                            path: '/',
                            domain: currentDomain,
                            secure: true,
                        });
                    }
                }
            });

            this.is_new_session = Object.keys(obj_params).length > 0;

            // delete account query params - but keep other query params (e.g. utm)
            Object.keys(obj_params).forEach(key => search_params.delete(key));
            search_params.delete('state'); // remove unused state= query string
            search_params = search_params?.toString();
            const search_param_without_account = search_params ? `?${search_params}` : '/';
            history.replaceState(null, null, `${search_param_without_account}${window.location.hash}`);
        }

        const is_client_logging_in = login_new_user ? login_new_user.token1 : obj_params.token1;
        const is_callback_page_client_logging_in = localStorage.getItem('config.account1') || '';

        if (is_client_logging_in || is_callback_page_client_logging_in) {
            this.setIsLoggingIn(true);

            const redirect_url = sessionStorage.getItem('redirect_url');

            const target_url = routes.index;

            if (
                (redirect_url?.endsWith(routes.index) || /chart_type|interval|symbol|trade_type/.test(redirect_url)) &&
                (isTestLink() || isProduction() || isLocal() || isStaging() || isTestDerivApp())
            ) {
                window.history.replaceState({}, document.title, target_url);
            } else {
                window.history.replaceState({}, document.title, sessionStorage.getItem('redirect_url'));
            }
            SocketCache.clear();
            // is_populating_account_list is used for socket general to know not to filter the first-time logins
            this.is_populating_account_list = true;
            const authorize_response = await BinarySocket.authorize(
                is_client_logging_in || is_callback_page_client_logging_in
            );

            if (login_new_user) {
                // overwrite obj_params if login is for new virtual account
                obj_params = login_new_user;
            }

            if (localStorage.getItem('config.tokens')) {
                const tokens = JSON.parse(localStorage.getItem('config.tokens'));
                obj_params = tokens;
            }

            if (authorize_response.error) {
                return authorize_response;
            }

            runInAction(() => {
                const account_list = (authorize_response.authorize || {}).account_list;
                this.upgradeable_landing_companies = [...new Set(authorize_response.upgradeable_landing_companies)];

                if (this.canStoreClientAccounts(obj_params, account_list)) {
                    this.storeClientAccounts(obj_params, account_list);
                } else {
                    // Since there is no API error, we have to add this to manually trigger checks in other parts of the code.
                    authorize_response.error = {
                        code: 'MismatchedAcct',
                        message: localize('Invalid token'),
                    };
                }
            });
            return authorize_response;
        }
    }

    // V2 Authentication Method
    async authenticateV2(oneTimeToken) {
        try {
            this.setIsLoggingIn(true);

            let sessionToken = this.getSessionToken();

            // If we don't have a session token but we have a one-time token, exchange it
            if (!sessionToken && oneTimeToken) {
                const sessionResponse = await WS.getSessionToken(oneTimeToken);

                if (sessionResponse.error) {
                    return {
                        error: {
                            code: 'TokenExchangeError',
                            message: sessionResponse.error.message,
                        },
                    };
                }

                sessionToken = sessionResponse.get_session_token.token;
                this.storeSessionToken(sessionToken);

                // Remove the one-time token from URL after successful exchange
                this.removeTokenFromUrl();
            } else if (!sessionToken) {
                return {
                    error: {
                        code: 'NoSessionToken',
                        message: 'No valid session token available',
                    },
                };
            }

            // Authorize with session token
            const authorizeResponse = await BinarySocket.authorize(sessionToken);

            if (authorizeResponse.error) {
                this.clearSessionToken();
                return authorizeResponse;
            }

            // Process successful authorization
            const { authorize } = authorizeResponse;
            const loginid = authorize.loginid;

            // Initialize account structure
            this.accounts = {
                [loginid]: {
                    balance: authorize.balance,
                    currency: authorize.currency,
                    is_virtual: authorize.is_virtual,
                    loginid: loginid,
                    token: sessionToken,
                    session_start: parseInt(moment().utc().valueOf() / 1000),
                },
            };

            // Set active login ID
            this.setLoginId(loginid);

            // Store accounts in localStorage
            localStorage.setItem(storage_key, JSON.stringify(this.accounts));
            localStorage.setItem('active_loginid', loginid);
            sessionStorage.setItem('active_loginid', loginid);

            // Process authorization response
            this.responseAuthorize(authorizeResponse);

            this.setIsLoggingIn(false);
            return authorizeResponse;
        } catch (error) {
            this.setIsLoggingIn(false);

            return {
                error: {
                    code: 'UnexpectedAuthError',
                    message: error.message || 'Unexpected authentication error',
                },
            };
        }
    }

    // Session token storage methods
    storeSessionToken(token) {
        if (token) {
            localStorage.setItem('session_token', token);
        }
    }

    getSessionToken() {
        return localStorage.getItem('session_token');
    }

    clearSessionToken() {
        localStorage.removeItem('session_token');
    }

    removeTokenFromUrl() {
        const url = new URL(window.location.href);
        if (url.searchParams.has('token')) {
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.toString());
        }
    }

    async canStoreClientAccounts(obj_params, account_list) {
        // Multi-account validation logic
        let is_TMB_enabled;
        const is_ready_to_process = account_list && isEmptyObject(this.accounts);
        const accts = Object.keys(obj_params || {}).filter(value => /^acct./.test(value));

        const is_cross_checked = accts.every(acct => {
            if (!account_list || !Array.isArray(account_list)) {
                return false;
            }
            return account_list.some(account => {
                return account && typeof account === 'object' && account.loginid === obj_params[acct];
            });
        });

        const storedValue = localStorage.getItem('is_tmb_enabled');
        try {
            const url =
                process.env.NODE_ENV === 'production'
                    ? 'https://app-config-prod.firebaseio.com/remote_config/oauth/is_tmb_enabled.json'
                    : 'https://app-config-staging.firebaseio.com/remote_config/oauth/is_tmb_enabled.json';
            const response = await fetch(url);
            const result = await response.json();

            is_TMB_enabled = storedValue !== null ? storedValue === 'true' : !!result.app;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            // by default it will fallback to true if firebase error happens
            is_TMB_enabled = storedValue !== null ? storedValue === 'true' : false;
        }

        return (is_ready_to_process && is_cross_checked) || is_TMB_enabled;
    }

    // Account management methods removed for trading-focused application
    // These methods are not needed for trading operations and have been removed
    // to simplify the codebase while maintaining authentication compatibility

    fetchAccountSettings() {
        return new Promise(resolve => {
            WS.authorized.storage.getSettings().then(response => {
                this.setAccountSettings(response.get_settings);
                resolve(response);
            });
        });
    }

    // Account management methods removed for trading-focused application

    get is_high_risk() {
        if (isEmptyObject(this.account_status)) return false;
        const { gaming_company, financial_company } = this.landing_companies;

        // This is a conditional check for countries like Australia/Norway which fulfil one of these following conditions.
        const restricted_countries =
            financial_company?.shortcode === 'svg' ||
            (gaming_company?.shortcode === 'svg' && financial_company?.shortcode !== 'maltainvest');

        const high_risk_landing_company = financial_company?.shortcode === 'svg' && gaming_company?.shortcode === 'svg';
        return high_risk_landing_company || this.account_status.risk_classification === 'high' || restricted_countries;
    }

    get is_low_risk() {
        const { gaming_company, financial_company } = this.landing_companies;
        const low_risk_landing_company =
            financial_company?.shortcode === 'maltainvest' && gaming_company?.shortcode === 'svg';
        return (
            low_risk_landing_company ||
            (this.upgradeable_landing_companies?.includes('svg') &&
                this.upgradeable_landing_companies?.includes('maltainvest'))
        );
    }

    get has_residence() {
        return !!this.accounts[this.loginid]?.residence;
    }

    // CFD balance computed properties removed for simplified authentication

    get is_proof_of_ownership_enabled() {
        if (!this.account_status?.authentication) return false;
        const { ownership, needs_verification } = this.account_status.authentication;
        return needs_verification?.includes('ownership') || ownership?.status === 'verified';
    }

    // Two-factor authentication removed for simplified authentication

    // CFD status update methods removed for simplified authentication

    // Passkey and phone verification methods removed for simplified authentication

    // Exchange rate subscription methods removed for simplified authentication

    get is_cr_account() {
        return this.loginid?.startsWith('CR');
    }

    get is_mf_account() {
        return this.loginid?.startsWith('MF');
    }

    get account_time_of_closure() {
        return this.account_status?.account_closure?.find(
            item => item?.status_codes?.includes('residence_closure') && item?.type === 'residence'
        )?.time_of_closure;
    }

    get is_account_to_be_closed_by_residence() {
        return this.account_status?.account_closure?.find(
            item => item?.status_codes?.includes('residence_closure') && item?.type === 'residence'
        );
    }

    setClientKYCStatus(client_kyc_status) {
        this.client_kyc_status = client_kyc_status;
    }

    get should_show_trustpilot_notification() {
        return this.account_status?.status?.includes('customer_review_eligible');
    }
}
