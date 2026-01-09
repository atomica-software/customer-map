import { useEffect, useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

interface MapProps {
    data: { id: string; value: number; customers: any[] }[];
    onCountryClick: (countryId: string) => void;
}

export default function Map({ data, onCountryClick }: MapProps) {
    // References to keep track of the chart instance and the series to update data
    const bubbleSeriesRef = useRef<am5map.MapPointSeries | null>(null);
    const chartDivRef = useRef<HTMLDivElement>(null);
    const onCountryClickRef = useRef(onCountryClick);

    // Update ref when callback changes
    useEffect(() => {
        onCountryClickRef.current = onCountryClick;
    }, [onCountryClick]);

    useLayoutEffect(() => {
        // Check if window is defined
        if (typeof window === 'undefined' || !chartDivRef.current) return;

        let root: am5.Root;
        try {
            root = am5.Root.new(chartDivRef.current);
        } catch (e) {
            console.warn("Error creating root, maybe already exists:", e);
            return;
        }

        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5map.MapChart.new(root, {
                panX: 'rotateX',
                panY: 'rotateY',
                projection: am5map.geoOrthographic(),
                paddingBottom: 20,
                paddingTop: 20,
                paddingLeft: 20,
                paddingRight: 20,
            })
        );

        // Create main polygon series for countries
        const polygonSeries = chart.series.push(
            am5map.MapPolygonSeries.new(root, {
                geoJSON: am5geodata_worldLow,
            })
        );

        polygonSeries.mapPolygons.template.setAll({
            tooltipText: '{name}',
            toggleKey: 'active',
            interactive: true,
            fill: am5.color(0x5b9bd5), // Nice blue
            stroke: am5.color(0xffffff),
        });

        polygonSeries.mapPolygons.template.states.create('hover', {
            fill: am5.color(0x4472c4),
        });

        // Create bullet series
        const bubbleSeries = chart.series.push(
            am5map.MapPointSeries.new(root, {
                valueField: 'value',
                calculateAggregates: true,
                polygonIdField: 'id',
            })
        );

        bubbleSeries.bullets.push(function (root, series, dataItem) {
            const circle = am5.Circle.new(root, {
                radius: 10, // Default radius, will be overridden by adapter
                fill: am5.color(0xff0000),
                fillOpacity: 0.7,
                stroke: am5.color(0xffffff),
                strokeWidth: 1,
                tooltipText: "{name}: {value}",
                cursorOverStyle: "pointer"
            });

            // Add click event for the bubble
            circle.events.on("click", function (element) {
                const id = dataItem.get("polygonIdField"); // Actually we mapped polygonIdField to 'id' property in data
                // DataContext access
                const context = dataItem.dataContext as any;
                if (context && context.id) {
                    if (onCountryClickRef.current) {
                        onCountryClickRef.current(context.id);
                    }
                }
            });

            circle.adapters.add("radius", function (radius, target) {
                const item = target.dataItem;
                if (item) {
                    // @ts-ignore
                    const series = item.component as am5map.MapPointSeries;
                    const value = item.get("value") as number;
                    const min = series.getPrivate("valueLow") as number;
                    const max = series.getPrivate("valueHigh") as number;

                    if (value != null && min != null && max != null && max > min) {
                        const minRadius = 10;
                        const maxRadius = 50;
                        return minRadius + (value - min) / (max - min) * (maxRadius - minRadius);
                    }
                }
                return radius;
            });

            return am5.Bullet.new(root, {
                sprite: circle
            });
        });

        // Add labels to bubbles
        bubbleSeries.bullets.push(function (root, series, dataItem) {
            return am5.Bullet.new(root, {
                sprite: am5.Label.new(root, {
                    text: "{value}",
                    fill: am5.color(0xffffff),
                    fontWeight: "bold",
                    centerX: am5.p50,
                    centerY: am5.p50,
                    populateText: true,
                    cursorOverStyle: "pointer"
                })
            });
        });

        // Also allow clicking labels
        // (We could refactor label bullet similarly but circle is easier to hit).

        bubbleSeriesRef.current = bubbleSeries;

        // Initial data set
        if (data && data.length > 0) {
            bubbleSeries.data.setAll(data);
        }

        // Rotate animation
        chart.animate({
            key: "rotationX",
            from: 0,
            to: 360,
            duration: 30000,
            loops: Infinity
        });

        return () => {
            root.dispose();
            bubbleSeriesRef.current = null;
        };
    }, []); // Empty dependency array -> Only create chart ONCE

    // Separate effect for updating data
    useEffect(() => {
        if (bubbleSeriesRef.current) {
            bubbleSeriesRef.current.data.setAll(data);
        }
    }, [data]);

    return <div ref={chartDivRef} style={{ width: '100%', height: '500px' }}></div>;
}
