import React from 'react';

import { Icon, Text } from '@deriv/components';
import { formatDate } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { Localize } from '@deriv/translations';

export const TradingDisabledByResidenceModalContent = observer(() => {
    // Simplified for trading-only app - no account closure by residence
    return (
        <div className='trading-disabled-by-residence-modal__content'>
            <Icon icon='IcCashierLocked' size={96} />
            <Text as='h1' align='center' weight='bold'>
                <Localize i18n_default_text='Trading disabled' />
            </Text>
            <Text align='center' size='xs'>
                <Localize i18n_default_text='Due to business changes, client accounts in your country are to be closed. Withdraw any remaining funds.' />
            </Text>
        </div>
    );
});
