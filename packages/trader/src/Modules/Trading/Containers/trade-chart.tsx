import React from 'react';

import { ActiveSymbols } from '@deriv/api-types';
import { ChartBarrierStore } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';
import { useDevice } from '@deriv-com/ui';

import { SmartChart } from 'Modules/SmartChart';
import { useTraderStore } from 'Stores/useTraderStores';

import AccumulatorsChartElements from '../../SmartChart/Components/Markers/accumulators-chart-elements';
import ToolbarWidgets from '../../SmartChart/Components/toolbar-widgets';

import { ChartBottomWidgets } from './chart-widgets';
import type { TBottomWidgetsParams } from './trade';

type TTradeChartProps = {
    bottomWidgets?: (props: TBottomWidgetsParams) => React.ReactElement;
    has_barrier?: boolean;
    is_accumulator: boolean;
    topWidgets: (() => JSX.Element) | null | undefined;
    children?: React.ReactNode;
};

const TradeChart = observer((props: TTradeChartProps) => {
    const { has_barrier, is_accumulator, topWidgets } = props;
    const { ui, common, contract_trade, portfolio } = useStore();
    const { isMobile } = useDevice();
    const {
        accumulator_barriers_data,
        accumulator_contract_barriers_data,
        chart_type,
        granularity,
        has_crossed_accu_barriers,
        markers_array,
        updateChartType,
        updateGranularity,
    } = contract_trade;
    const ref = React.useRef<{ hasPredictionIndicators(): void; triggerPopup(arg: () => void): void }>(null);
    const { all_positions } = portfolio;
    const { is_chart_countdown_visible, is_chart_layout_default, is_dark_mode_on, is_positions_drawer_on } = ui;
    const { current_language, is_socket_opened } = common;
    const {
        active_symbols,
        barriers_flattened: extra_barriers,
        chartStateChange,
        chart_layout,
        exportLayout,
        has_alternative_source,
        is_trade_enabled,
        main_barrier_flattened: main_barrier,
        setChartStatus,
        show_digits_stats,
        symbol,
        onChange,
        prev_contract_type,
        wsForget,
        wsForgetStream,
        wsSendRequest,
        wsSubscribe,
    } = useTraderStore();

    const settings = React.useMemo(
        () => ({
            countdown: is_chart_countdown_visible,
            isHighestLowestMarkerEnabled: false, // TODO: Pending UI,
            language: current_language.toLowerCase(),
            position: is_chart_layout_default ? 'bottom' : 'left',
            theme: is_dark_mode_on ? 'dark' : 'light',
            ...(is_accumulator ? { whitespace: 190, minimumLeftBars: isMobile ? 3 : undefined } : {}),
            ...(has_barrier ? { whitespace: 110 } : {}),
        }),
        [
            is_chart_countdown_visible,
            current_language,
            is_chart_layout_default,
            is_dark_mode_on,
            is_accumulator,
            isMobile,
            has_barrier,
        ]
    );

    const { current_spot, current_spot_time } = accumulator_barriers_data || {};

    const bottomWidgets = React.useCallback(
        ({ digits, tick }: TBottomWidgetsParams) => (
            <ChartBottomWidgets digits={digits} tick={tick} show_accumulators_stats={is_accumulator} />
        ),
        [is_accumulator]
    );

    React.useEffect(() => {
        if ((is_accumulator || show_digits_stats) && ref.current?.hasPredictionIndicators()) {
            const cancelCallback = () => onChange({ target: { name: 'contract_type', value: prev_contract_type } });
            ref.current?.triggerPopup(cancelCallback);
        }
    }, [is_accumulator, onChange, prev_contract_type, show_digits_stats]);

    const getMarketsOrder = React.useCallback((active_symbols: ActiveSymbols): string[] => {
        const synthetic_index = 'synthetic_index';
        const has_synthetic_index = active_symbols.some(s => s.market === synthetic_index);
        return active_symbols
            .slice()
            .sort((a, b) =>
                ((a as any).underlying_symbol || a.symbol) < ((b as any).underlying_symbol || b.symbol) ? -1 : 1
            )
            .map(s => s.market)
            .reduce(
                (arr, market) => {
                    if (arr.indexOf(market) === -1) arr.push(market);
                    return arr;
                },
                has_synthetic_index ? [synthetic_index] : []
            );
    }, []);

    // [AI]
    // Create stable references that persist across renders for all dynamic props
    const stableBarrierRef = React.useRef<any[]>([]);
    const stableMarkersRef = React.useRef<any[]>([]);
    const lastBarrierHashRef = React.useRef<string>('');
    const lastMarkersHashRef = React.useRef<string>('');

    // Deep memoization of barriers to prevent erratic jumping due to frequent portfolio updates
    const smartChartBarriers = React.useMemo(() => {
        const barriers: ChartBarrierStore[] = main_barrier ? [main_barrier, ...extra_barriers] : extra_barriers;

        // Create a hash of all barrier properties that matter for rendering
        const barrierHash = barriers
            .map(barrier => {
                if (!barrier) return 'null';

                const {
                    high,
                    low,
                    color,
                    lineStyle,
                    shade,
                    shadeColor,
                    relative,
                    draggable,
                    hidePriceLines,
                    hideBarrierLine,
                    hideOffscreenLine,
                    title,
                } = barrier;

                return JSON.stringify({
                    high,
                    low,
                    color,
                    lineStyle,
                    shade,
                    shadeColor,
                    relative,
                    draggable,
                    hidePriceLines,
                    hideBarrierLine,
                    hideOffscreenLine,
                    title,
                });
            })
            .join('|');

        // Only update the stable reference if the barrier properties have actually changed
        if (barrierHash !== lastBarrierHashRef.current) {
            lastBarrierHashRef.current = barrierHash;
            stableBarrierRef.current = barriers.map(barrier => {
                if (!barrier) return barrier;

                // Create a plain object with barrier properties for the chart
                return {
                    high: barrier.high,
                    low: barrier.low,
                    color: barrier.color,
                    lineStyle: barrier.lineStyle,
                    shade: barrier.shade,
                    shadeColor: barrier.shadeColor,
                    relative: barrier.relative,
                    draggable: barrier.draggable,
                    hidePriceLines: barrier.hidePriceLines,
                    hideBarrierLine: barrier.hideBarrierLine,
                    hideOffscreenLine: barrier.hideOffscreenLine,
                    title: barrier.title,
                };
            });
        }

        return stableBarrierRef.current;
    }, [main_barrier, extra_barriers]);

    // Stabilize markers array to prevent unnecessary chart updates
    const stableMarkersArray = React.useMemo(() => {
        // Create a hash of marker properties to detect real changes
        const markersHash = markers_array
            .map(marker => {
                if (!marker) return 'null';
                return JSON.stringify({
                    type: marker.type,
                    key: marker.key,
                    contract_info: marker.contract_info?.contract_id,
                    price_array: marker.price_array?.length,
                    epoch_array: marker.epoch_array?.length,
                });
            })
            .join('|');

        // Only update if markers have actually changed
        if (markersHash !== lastMarkersHashRef.current) {
            lastMarkersHashRef.current = markersHash;
            stableMarkersRef.current = [...markers_array];
        }

        return stableMarkersRef.current;
    }, [markers_array]);
    // [/AI]

    // max ticks to display for mobile view for tick chart
    const max_ticks = granularity === 0 ? 8 : 24;

    // [AI]
    // Memoized object props to prevent unnecessary rerenders
    const initialData = React.useMemo(
        () => ({
            activeSymbols: active_symbols,
        }),
        [active_symbols]
    );

    const chartData = React.useMemo(
        () => ({
            activeSymbols: active_symbols,
        }),
        [active_symbols]
    );

    // Simplified constant object - no need for useMemo since it never changes
    const feedCall = { activeSymbols: false };
    // [/AI]

    const yAxisMargin = React.useMemo(
        () => ({
            top: isMobile ? 76 : 106,
        }),
        [isMobile]
    );

    // Memoized computed values
    const computedBottomWidgets = React.useMemo(
        () => ((is_accumulator || show_digits_stats) && !isMobile ? bottomWidgets : props.bottomWidgets),
        [is_accumulator, show_digits_stats, isMobile, bottomWidgets, props.bottomWidgets]
    );

    const computedGranularity = React.useMemo(
        () => (show_digits_stats || is_accumulator ? 0 : granularity),
        [show_digits_stats, is_accumulator, granularity]
    );

    const computedMaxTick = React.useMemo(() => (isMobile ? max_ticks : undefined), [isMobile, max_ticks]);

    const computedLeftMargin = React.useMemo(
        () => (!isMobile && is_positions_drawer_on ? 328 : 80),
        [isMobile, is_positions_drawer_on]
    );

    const computedTopWidgets = React.useMemo(
        () => (is_trade_enabled ? topWidgets : null),
        [is_trade_enabled, topWidgets]
    );

    // Memoized callback functions
    const chartStatusListener = React.useCallback((v: boolean) => setChartStatus(!v, true), [setChartStatus]);

    const toolbarWidget = React.useCallback(() => {
        return <ToolbarWidgets updateChartType={updateChartType} updateGranularity={updateGranularity} />;
    }, [updateChartType, updateGranularity]);
    // [/AI]

    if (!symbol || !active_symbols.length) return null;
    return (
        <SmartChart
            ref={ref}
            barriers={smartChartBarriers}
            contracts_array={stableMarkersArray}
            bottomWidgets={computedBottomWidgets}
            crosshair={isMobile ? 0 : undefined}
            crosshairTooltipLeftAllow={560}
            showLastDigitStats={show_digits_stats}
            chartControlsWidgets={null}
            chartStatusListener={chartStatusListener}
            chartType={chart_type}
            initialData={initialData}
            chartData={chartData}
            feedCall={feedCall}
            enabledNavigationWidget={!isMobile}
            enabledChartFooter={false}
            id='trade'
            isMobile={isMobile}
            maxTick={computedMaxTick}
            granularity={computedGranularity}
            requestAPI={wsSendRequest}
            requestForget={wsForget}
            requestForgetStream={wsForgetStream}
            requestSubscribe={wsSubscribe}
            settings={settings}
            allowTickChartTypeOnly={show_digits_stats || is_accumulator}
            stateChangeListener={chartStateChange}
            symbol={symbol}
            topWidgets={computedTopWidgets}
            isConnectionOpened={is_socket_opened}
            clearChart={false}
            toolbarWidget={toolbarWidget}
            importedLayout={chart_layout}
            onExportLayout={exportLayout}
            shouldFetchTradingTimes={false}
            hasAlternativeSource={has_alternative_source}
            getMarketsOrder={getMarketsOrder}
            should_zoom_out_on_yaxis={is_accumulator}
            yAxisMargin={yAxisMargin}
            isLive
            leftMargin={computedLeftMargin}
        >
            {is_accumulator && (
                <AccumulatorsChartElements
                    all_positions={all_positions}
                    current_spot={current_spot}
                    current_spot_time={current_spot_time}
                    has_crossed_accu_barriers={has_crossed_accu_barriers}
                    should_show_profit_text={!!accumulator_contract_barriers_data.accumulators_high_barrier}
                    symbol={symbol}
                    is_mobile={isMobile}
                />
            )}
        </SmartChart>
        // <>Chart here</>
    );
});
export default TradeChart;
