import React from 'react';
import { StaticUrl, Icon } from '@deriv/components';
import { getBrandLogo } from '@deriv/shared';

const BrandShortLogo = () => {
    const brandLogo = getBrandLogo();

    return (
        <div className='header__menu-left-logo'>
            <StaticUrl href='/'>
                <Icon icon={brandLogo} size={24} />
            </StaticUrl>
        </div>
    );
};

export default BrandShortLogo;
