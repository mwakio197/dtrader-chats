import config_data from '../../../../../brand.config.json';

export const getBrandWebsiteName = () => {
    return config_data.brand_domain;
};

export const getBrandName = () => {
    return config_data.brand_name;
};

export const getBrandLogo = () => {
    return config_data.brand_logo;
};

export const getPlatformName = () => {
    return config_data.platform?.name;
};

export const getPlatformIcon = () => {
    return config_data.platform?.icon;
};

export const getDomainName = () => {
    // Split the hostname into parts
    const domainParts = window.location.hostname.split('.');

    // Ensure we have at least two parts (SLD and TLD)
    if (domainParts.length >= 2) {
        // Combine the SLD and TLD
        const domain = `${domainParts[domainParts.length - 2]}.${domainParts[domainParts.length - 1]}`;
        return domain;
    }

    return '';
};
