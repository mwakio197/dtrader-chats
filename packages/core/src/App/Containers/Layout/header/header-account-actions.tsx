import React from 'react';
import { observer, useStore } from '@deriv/stores';
import { AccountActions } from 'App/Components/Layout/Header';

type THeaderAccountActions = {
    // onClickDeposit: () => void; // TODO: Temporarily hidden deposit button, remove if no longer needed
};

const HeaderAccountActions = observer(() => {
    const { client, ui } = useStore();
    const { balance, currency, is_logged_in, is_virtual, logout } = client;
    const { account_switcher_disabled_message, is_account_switcher_disabled } = ui;

    const handleLogout = () => {
        logout();
    };

    return (
        <div id='dt_core_header_acc-info-container' className='acc-info__container'>
            <AccountActions
                acc_switcher_disabled_message={account_switcher_disabled_message}
                // account_type={account_type}
                balance={balance}
                currency={currency}
                // disableApp={disableApp}
                // enableApp={enableApp}
                // is_acc_switcher_on={is_accounts_switcher_on}
                is_acc_switcher_disabled={is_account_switcher_disabled}
                // is_notifications_visible={is_notifications_visible}
                is_logged_in={is_logged_in}
                is_virtual={is_virtual}
                // onClickDeposit={onClickDeposit} // TODO: Temporarily hidden deposit button, remove if no longer needed
                onClickLogout={handleLogout}
                // notifications_count={filtered_notifications.length}
                // toggleAccountsDialog={toggleAccountsDialog}
                // toggleNotifications={toggleNotificationsModal}
                // openRealAccountSignup={openRealAccountSignup}
            />
        </div>
    );
});

export default HeaderAccountActions;
