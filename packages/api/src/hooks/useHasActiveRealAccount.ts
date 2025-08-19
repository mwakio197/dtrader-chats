import { useStore } from '@deriv/stores';

const useHasActiveRealAccount = () => {
    const { client } = useStore();
    const { current_account } = client;

    const has_active_real_account = current_account ? !current_account.is_virtual : false;

    return has_active_real_account;
};

export default useHasActiveRealAccount;
