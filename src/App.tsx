import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { supabase } from './supabaseClient';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Type definitions
interface CoverageData {
  [period: string]: {
    "25_49"?: number;
    "50_64"?: number;
  };
}

interface FeatureProperties {
  LAD24CD: string;
  LAD24NM: string;
  area_name?: string;
  coverage_data?: CoverageData;
}

const getColor = (d: number | undefined) => {
  if (d === undefined) return '#ccc';
  return d > 80 ? '#006d2c' :
         d > 75 ? '#31a354' :
         d > 70 ? '#74c476' :
         d > 65 ? '#a1d99b' :
         d > 60 ? '#c7e9c0' :
                  '#edf8e9';
};

function App() {
  const [geoData, setGeoData] = useState<any>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearIndex, setYearIndex] = useState<number>(0);
  const [selectedFeature, setSelectedFeature] = useState<FeatureProperties | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedYear = availableYears[yearIndex] || '';

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        console.log("Fetching data from Supabase...");

        // Use public URLs directly if the bucket is public
        const metadataUrl = supabase.storage.from('screening-data').getPublicUrl('metadata.json').data.publicUrl;
        const mapDataUrl = supabase.storage.from('screening-data').getPublicUrl('map_data.json').data.publicUrl;

        console.log("Metadata URL:", metadataUrl);
        console.log("Map Data URL:", mapDataUrl);

        // Fetch Metadata
        const metaRes = await fetch(metadataUrl);
        const metaText = await metaRes.text();
        if (!metaRes.ok) throw new Error(`HTTP ${metaRes.status}: ${metaText}`);
        
        try {
          const meta = JSON.parse(metaText);
          setAvailableYears(meta.years);
          setYearIndex(meta.years.length - 1);
        } catch (e) {
          console.error("Failed to parse Metadata JSON. Received:", metaText.substring(0, 200));
          throw new Error("Metadata file is not valid JSON. Check Supabase permissions.");
        }

        // Fetch Map Data
        const mapRes = await fetch(mapDataUrl);
        const mapText = await mapRes.text();
        if (!mapRes.ok) throw new Error(`HTTP ${mapRes.status}: ${mapText}`);

        try {
          const geojson = JSON.parse(mapText);
          setGeoData(geojson);
        } catch (e) {
          console.error("Failed to parse Map Data JSON. Received:", mapText.substring(0, 200));
          throw new Error("Map data file is not valid JSON. Check Supabase permissions.");
        }
        
      } catch (err: any) {
        console.error("Full Error Context:", err);
        alert(`Error loading dashboard: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const style = (feature: any) => {
    const coverage = feature.properties.coverage_data?.[selectedYear]?.['25_49'];
    return {
      fillColor: getColor(coverage),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          weight: 3,
          color: '#666',
          fillOpacity: 0.9
        });
      },
      mouseout: (e: any) => {
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

  if (loading) {
    return <div className="loading">Loading Screening Data from Cloud...</div>;
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Cervical Screening Coverage England</h1>
      </header>

      <main className="main-content">
        <div className="map-container">
          <MapContainer 
            center={[52.5, -1.5]} 
            zoom={6.5} 
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {geoData && availableYears.length > 0 && (
              <GeoJSON 
                key={`${selectedYear}-${geoData.features.length}`}
                data={geoData} 
                style={style} 
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>

          <div className="legend">
            <h4>Coverage (25-49)</h4>
            {legendItems.map(item => (
              <div key={item.label} className="legend-item">
                <div className="color-box" style={{ backgroundColor: item.color }}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="controls">
            <div className="slider-container">
              <div className="slider-labels">
                <span>Timeline</span>
                <span>{selectedYear}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={availableYears.length - 1} 
                step="1" 
                value={yearIndex}
                onChange={(e) => setYearIndex(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <aside className="sidebar">
          {selectedFeature ? (
            <div className="info-card">
              <h2>{selectedFeature.area_name || selectedFeature.LAD24NM}</h2>
              <p>Code: {selectedFeature.LAD24CD}</p>
              
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="stat-value">
                    {selectedFeature.coverage_data?.[selectedYear]?.['25_49']?.toFixed(1) || 'N/A'}%
                  </div>
                  <div className="stat-label">Ages 25-49</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">
                    {selectedFeature.coverage_data?.[selectedYear]?.['50_64']?.toFixed(1) || 'N/A'}%
                  </div>
                  <div className="stat-label">Ages 50-64</div>
                </div>
              </div>
              
              <div style={{ marginTop: '2rem' }}>
                <h3>About this data</h3>
                <p>Coverage is the percentage of eligible individuals who were adequately screened within the last 3.5 or 5.5 years (depending on age).</p>
                <p>Source: Office for Health Improvement and Disparities (OHID), Fingertips API.</p>
              </div>
            </div>
          ) : (
            <div className="info-placeholder">
              <p>Click on a region to view detailed screening coverage data.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
