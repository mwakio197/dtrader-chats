import { StoreProvider, mockStore } from '@deriv/stores';
import { render, screen } from '@testing-library/react';
import Header from '../header';

jest.mock('@deriv/api', () => ({
    ...jest.requireActual('@deriv/api'),
    useFeatureFlags: jest.fn(() => ({})),
}));
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
}));
// eslint-disable-next-line react/display-name
jest.mock('../header-legacy', () => () => <div data-testid='dt_default_header'>MockedLegacyHeader</div>);
// eslint-disable-next-line react/display-name
jest.mock('@deriv-com/ui', () => ({
    useDevice: jest.fn(() => ({
        isDesktop: true,
        isMobile: false,
        isTablet: false,
    })),
}));

describe('Header', () => {
    const store = mockStore({
        client: { is_logged_in: true, has_wallet: true },
    });
    const renderComponent = (modified_store = store) =>
        render(
            <StoreProvider store={modified_store}>
                <Header />
            </StoreProvider>
        );

    it('should render the "HeaderLegacy" component if user is not migrated to wallets yet', async () => {
        renderComponent(mockStore({ client: { has_wallet: false } }));
        expect(await screen.findByTestId('dt_default_header')).toBeInTheDocument();
        expect(screen.getByText('MockedLegacyHeader')).toBeInTheDocument();
    });
});
