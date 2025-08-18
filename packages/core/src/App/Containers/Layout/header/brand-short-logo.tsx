import React from 'react';
import { Icon } from '@deriv/components';
import { getBrandLogo, getBrandWebsiteName } from '@deriv/shared';

const BrandShortLogo = () => {
    const brandLogo = getBrandLogo();
    const brandWebsiteName = getBrandWebsiteName();

    return (
        <div className='header__menu-left-logo'>
            <a href={brandWebsiteName} target='_blank' rel='noopener noreferrer'>
                <Icon icon={brandLogo} size={24} />
            </a>
        </div>
    );
};

export default BrandShortLogo;
