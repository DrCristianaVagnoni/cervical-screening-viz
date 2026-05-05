import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
const getColor = (d) => {
    if (d === undefined)
        return '#ccc';
    return d > 80 ? '#006d2c' :
        d > 75 ? '#31a354' :
            d > 70 ? '#74c476' :
                d > 65 ? '#a1d99b' :
                    d > 60 ? '#c7e9c0' :
                        '#edf8e9';
};
function App() {
    const [geoData, setGeoData] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);
    const [yearIndex, setYearIndex] = useState(0);
    const [selectedFeature, setSelectedFeature] = useState(null);
    const selectedYear = availableYears[yearIndex] || '';
    useEffect(() => {
        // Fetch metadata for years
        fetch('/data/metadata.json')
            .then(res => res.json())
            .then(meta => {
            setAvailableYears(meta.years);
            setYearIndex(meta.years.length - 1); // Start with latest year
        });
        // Fetch GeoJSON
        fetch('/data/map_data.json')
            .then(res => res.json())
            .then(data => {
            setGeoData(data);
        });
    }, []);
    const style = (feature) => {
        const coverage = feature.properties.coverage_data?.[selectedYear]?.['25_49'];
        return {
            fillColor: getColor(coverage),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    };
    const onEachFeature = (feature, layer) => {
        layer.on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({
                    weight: 3,
                    color: '#666',
                    fillOpacity: 0.9
                });
            },
            mouseout: (e) => {
                const l = e.target;
                l.setStyle(style(feature));
            },
            click: () => {
                setSelectedFeature(feature.properties);
            }
        });
    };
    const legendItems = [
        { label: '> 80%', color: '#006d2c' },
        { label: '75 - 80%', color: '#31a354' },
        { label: '70 - 75%', color: '#74c476' },
        { label: '65 - 70%', color: '#a1d99b' },
        { label: '60 - 65%', color: '#c7e9c0' },
        { label: '< 60%', color: '#edf8e9' },
        { label: 'No Data', color: '#ccc' }
    ];
    return (_jsxs("div", { className: "dashboard", children: [_jsx("header", { className: "header", children: _jsx("h1", { children: "Cervical Screening Coverage England" }) }), _jsxs("main", { className: "main-content", children: [_jsxs("div", { className: "map-container", children: [_jsxs(MapContainer, { center: [52.5, -1.5], zoom: 6.5, scrollWheelZoom: true, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }), geoData && availableYears.length > 0 && (_jsx(GeoJSON, { data: geoData, style: style, onEachFeature: onEachFeature }, `${selectedYear}-${geoData.features.length}`))] }), _jsxs("div", { className: "legend", children: [_jsx("h4", { children: "Coverage (25-49)" }), legendItems.map(item => (_jsxs("div", { className: "legend-item", children: [_jsx("div", { className: "color-box", style: { backgroundColor: item.color } }), _jsx("span", { children: item.label })] }, item.label)))] }), _jsx("div", { className: "controls", children: _jsxs("div", { className: "slider-container", children: [_jsxs("div", { className: "slider-labels", children: [_jsx("span", { children: "Timeline" }), _jsx("span", { children: selectedYear })] }), _jsx("input", { type: "range", min: "0", max: availableYears.length - 1, step: "1", value: yearIndex, onChange: (e) => setYearIndex(parseInt(e.target.value)) })] }) })] }), _jsx("aside", { className: "sidebar", children: selectedFeature ? (_jsxs("div", { className: "info-card", children: [_jsx("h2", { children: selectedFeature.area_name || selectedFeature.LAD24NM }), _jsxs("p", { children: ["Code: ", selectedFeature.LAD24CD] }), _jsxs("div", { className: "stat-grid", children: [_jsxs("div", { className: "stat-box", children: [_jsxs("div", { className: "stat-value", children: [selectedFeature.coverage_data?.[selectedYear]?.['25_49']?.toFixed(1) || 'N/A', "%"] }), _jsx("div", { className: "stat-label", children: "Ages 25-49" })] }), _jsxs("div", { className: "stat-box", children: [_jsxs("div", { className: "stat-value", children: [selectedFeature.coverage_data?.[selectedYear]?.['50_64']?.toFixed(1) || 'N/A', "%"] }), _jsx("div", { className: "stat-label", children: "Ages 50-64" })] })] }), _jsxs("div", { style: { marginTop: '2rem' }, children: [_jsx("h3", { children: "About this data" }), _jsx("p", { children: "Coverage is the percentage of eligible individuals who were adequately screened within the last 3.5 or 5.5 years (depending on age)." }), _jsx("p", { children: "Source: Office for Health Improvement and Disparities (OHID), Fingertips API." })] })] })) : (_jsx("div", { className: "info-placeholder", children: _jsx("p", { children: "Click on a region to view detailed screening coverage data." }) })) })] })] }));
}
export default App;
//# sourceMappingURL=App.js.map