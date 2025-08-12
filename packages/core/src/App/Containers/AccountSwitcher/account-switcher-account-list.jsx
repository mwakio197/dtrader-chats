import classNames from 'classnames';
import React from 'react';
import { Icon, Money, Button, Text } from '@deriv/components';
import { formatMoney, getCurrencyName, getCurrencyDisplayCode } from '@deriv/shared';
import { Localize, localize } from '@deriv/translations';

const AccountList = ({
    balance,
    currency,
    currency_icon,
    display_type,
    has_balance,
    has_error,
    has_reset_balance,
    is_disabled,
    is_virtual,
    loginid,
    redirectAccount,
    onClickResetVirtualBalance,
    selected_loginid,
}) => {
    const currency_badge = currency ? currency_icon : 'IcCurrencyUnknown';
    return (
        <React.Fragment>
            <div
                id={`dt_${loginid}`}
                className={classNames('acc-switcher__account', {
                    'acc-switcher__account--selected': loginid === selected_loginid,
                    'acc-switcher__account--disabled': is_disabled,
                })}
                onClick={() => {
                    if (!is_disabled) redirectAccount();
                }}
            >
                <span className='acc-switcher__id'>
                    <Icon
                        icon={is_virtual ? 'IcCurrencyVirtual' : currency_badge}
                        className={'acc-switcher__id-icon'}
                        size={24}
                    />
                    <span>
                        {display_type === 'currency' && (
                            <CurrencyDisplay currency={currency} loginid={loginid} is_virtual={is_virtual} />
                        )}
                        <div
                            className={classNames('acc-switcher__loginid-text', {
                                'acc-switcher__loginid-text--disabled': has_error,
                            })}
                        >
                            {loginid}
                        </div>
                    </span>
                    {has_reset_balance ? (
                        <Button
                            is_disabled={is_disabled}
                            onClick={e => {
                                e.stopPropagation();
                                onClickResetVirtualBalance();
                            }}
                            className='acc-switcher__reset-account-btn'
                            secondary
                            small
                        >
                            {localize('Reset balance')}
                        </Button>
                    ) : (
                        has_balance && (
                            <Text
                                size='xs'
                                color='primary'
                                styles={{ fontWeight: 'inherit' }}
                                className='acc-switcher__balance'
                            >
                                {currency && (
                                    <Money
                                        currency={getCurrencyDisplayCode(currency)}
                                        amount={formatMoney(currency, balance, true)}
                                        should_format={false}
                                        show_currency
                                    />
                                )}
                            </Text>
                        )
                    )}
                </span>
            </div>
        </React.Fragment>
    );
};

const CurrencyDisplay = ({ currency, loginid, is_virtual }) => {
    const account_type = loginid.replace(/\d/g, '');

    if (account_type === 'MF') {
        return <Localize i18n_default_text='Multipliers' />;
    }

    if (is_virtual) {
        return <Localize i18n_default_text='Demo' />;
    }

    if (!currency) {
        return <Localize i18n_default_text='No currency assigned' />;
    }

    return getCurrencyName(currency);
};

export default AccountList;
