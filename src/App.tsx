import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { supabase } from './supabaseClient';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Logo from './Logo';

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
  const [error, setError] = useState<string | null>(null);

  const selectedYear = availableYears[yearIndex] || '';

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Get Public URLs
        const storage = supabase.storage.from('screening-data');
        const metadataUrl = storage.getPublicUrl('metadata.json').data.publicUrl;
        const mapDataUrl = storage.getPublicUrl('map_data.json').data.publicUrl;

        console.log("Metadata URL:", metadataUrl);

        // 2. Fetch Metadata
        const metaRes = await fetch(metadataUrl, { cache: 'no-store' });
        if (!metaRes.ok) throw new Error(`Could not load metadata.json (HTTP ${metaRes.status}). Ensure file is in 'screening-data' bucket and bucket is public.`);
        const meta = await metaRes.json();
        
        if (!meta.years || meta.years.length === 0) {
          throw new Error("metadata.json is empty or has no years. Did you run the python script and upload the result?");
        }
        
        setAvailableYears(meta.years);
        setYearIndex(meta.years.length - 1);

        // 3. Fetch Map Data
        const mapRes = await fetch(mapDataUrl, { cache: 'no-store' });
        if (!mapRes.ok) throw new Error(`Could not load map_data.json (HTTP ${mapRes.status}).`);
        const geojson = await mapRes.json();
        setGeoData(geojson);
        
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const style = (feature: any) => {
    // Try both exact match and a fuzzy match for year formats
    const coverageData = feature.properties.coverage_data;
    const coverage = coverageData?.[selectedYear]?.['25_49'];
    
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
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading Dashboard Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Dashboard Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Cervical Cancer Screening Coverage in England</h1>
        <div className="header-brand">
          <Logo />
        </div>
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
