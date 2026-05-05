import os
import requests
import pandas as pd
import json
import time

# Note: Python Supabase client is having issues installing.
# We will generate the files locally, and you can upload them manually 
# to your Supabase 'screening-data' bucket for now.
# map_data.json -> screening-data/map_data.json
# metadata.json -> screening-data/metadata.json

# Setup directories
DATA_DIR = "public/data"
SCRIPTS_DIR = "data-scripts"
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SCRIPTS_DIR, exist_ok=True)

# 1. Download Coverage Data from Fingertips API
indicators = {
    "25_49": "93560",
    "50_64": "93561"
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

combined_data = {}
all_years = set()

for label, indicator_id in indicators.items():
    print(f"Downloading coverage data for {label} (Indicator {indicator_id})...")
    url = f"https://fingertips.phe.org.uk/api/all_data/csv/for_one_indicator?indicator_id={indicator_id}"
    csv_path = os.path.join(SCRIPTS_DIR, f"coverage_{label}.csv")
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error downloading {label}: {response.status_code}")
        continue

    with open(csv_path, "wb") as f:
        f.write(response.content)
    
    df = pd.read_csv(csv_path)
    
    # Filter for Local Authority level (Districts, UAs, Counties)
    area_types = ['District', 'UA', 'County', 'Upper tier local authority', 'Lower tier local authority']
    df_filtered = df[df['Area Type'].isin(area_types)]
    
    for _, row in df_filtered.iterrows():
        area_code = row['Area Code']
        period = str(row['Time period'])
        val = row['Value']
        
        if pd.isna(val): continue
        
        all_years.add(period)
        
        if area_code not in combined_data:
            combined_data[area_code] = {"name": row['Area Name'], "periods": {}}
        
        if period not in combined_data[area_code]["periods"]:
            combined_data[area_code]["periods"][period] = {}
        
        combined_data[area_code]["periods"][period][label] = val
    
    time.sleep(1)

# 2. Download GeoJSON
geojson_url = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2024_Boundaries_UK_BGC/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
print("Downloading GeoJSON boundaries...")
geojson_response = requests.get(geojson_url, headers=headers)
boundaries = geojson_response.json()

# 3. Join Data
for feature in boundaries['features']:
    props = feature['properties']
    ons_code = props.get('LAD24CD')
    
    if ons_code in combined_data:
        feature['properties']['coverage_data'] = combined_data[ons_code]['periods']
        feature['properties']['area_name'] = combined_data[ons_code]['name']
    else:
        feature['properties']['coverage_data'] = None

# 4. Save metadata and map data
metadata = {
    "years": sorted(list(all_years)),
    "last_updated": time.strftime("%Y-%m-%d %H:%M:%S")
}

with open(os.path.join(DATA_DIR, "metadata.json"), "w") as f:
    json.dump(metadata, f)

output_path = os.path.join(DATA_DIR, "map_data.json")
with open(output_path, "w") as f:
    json.dump(boundaries, f)

print(f"Data processing complete. Saved to {output_path}")
print("\nMANUAL ACTION REQUIRED:")
print("Please upload the following files to your Supabase 'screening-data' bucket:")
print(f"1. {os.path.join(DATA_DIR, 'map_data.json')}")
print(f"2. {os.path.join(DATA_DIR, 'metadata.json')}")
