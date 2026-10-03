import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const studentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const parentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-fit map bounds
function MapBounds({ markers }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  
  return null;
}

const LiveMap = ({ 
  studentLocation = null, 
  parentLocation = null, 
  homeLocation = null,
  destination = null, 
  sosLocation = null,
  routePoints = [],
  lastUpdated = null,
  height = '400px'
}) => {
  const [mapKey, setMapKey] = useState(0);

  // Force map re-render when locations change significantly
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [studentLocation?.latitude, studentLocation?.longitude]);

  // Build marker array for bounds
  const markers = [];
  if (studentLocation) {
    markers.push([studentLocation.latitude, studentLocation.longitude]);
  }
  if (parentLocation) {
    markers.push([parentLocation.latitude, parentLocation.longitude]);
  }
  if (homeLocation) {
    markers.push([homeLocation.latitude, homeLocation.longitude]);
  }
  if (destination) {
    markers.push([destination.latitude, destination.longitude]);
  }
  if (sosLocation) {
    markers.push([sosLocation.latitude, sosLocation.longitude]);
  }

  // Convert route points to Leaflet format
  const polylinePositions = routePoints.map(point => [point.latitude, point.longitude]);

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        key={mapKey}
        center={studentLocation ? [studentLocation.latitude, studentLocation.longitude] : [0, 0]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {studentLocation && (
          <Marker 
            position={[studentLocation.latitude, studentLocation.longitude]} 
            icon={studentIcon}
          >
            <Popup>
              <div>
                <strong>🎓 Student Location</strong><br />
                Lat: {studentLocation.latitude.toFixed(6)}<br />
                Lng: {studentLocation.longitude.toFixed(6)}<br />
                {lastUpdated && (
                  <small className="text-muted">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                  </small>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {parentLocation && (
          <Marker 
            position={[parentLocation.latitude, parentLocation.longitude]} 
            icon={parentIcon}
          >
            <Popup>
              <div>
                <strong>🏠 Parent Home Location</strong><br />
                Lat: {parentLocation.latitude.toFixed(6)}<br />
                Lng: {parentLocation.longitude.toFixed(6)}<br />
                <small className="text-muted">Static reference point</small>
              </div>
            </Popup>
          </Marker>
        )}
        
        {homeLocation && (
          <Marker 
            position={[homeLocation.latitude, homeLocation.longitude]} 
            icon={homeIcon}
          >
            <Popup>
              <div>
                <strong>🏠 Student Home Location</strong><br />
                Lat: {homeLocation.latitude.toFixed(6)}<br />
                Lng: {homeLocation.longitude.toFixed(6)}<br />
                <small className="text-muted">Student's home</small>
              </div>
            </Popup>
          </Marker>
        )}
        
        {destination && (
          <Marker 
            position={[destination.latitude, destination.longitude]} 
            icon={destinationIcon}
          >
            <Popup>
              <div>
                <strong>🎯 Destination</strong><br />
                Lat: {destination.latitude.toFixed(6)}<br />
                Lng: {destination.longitude.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
        
        {sosLocation && (
          <Marker 
            position={[sosLocation.latitude, sosLocation.longitude]} 
            icon={sosIcon}
          >
            <Popup>
              <div>
                <strong>🚨 SOS Location</strong><br />
                Lat: {sosLocation.latitude.toFixed(6)}<br />
                Lng: {sosLocation.longitude.toFixed(6)}<br />
                <small className="text-danger">Emergency alert</small>
              </div>
            </Popup>
          </Marker>
        )}
        
        {polylinePositions.length > 0 && (
          <Polyline 
            positions={polylinePositions} 
            color="#3b82f6" 
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
        
        <MapBounds markers={markers} />
      </MapContainer>
    </div>
  );
};

export default LiveMap;
