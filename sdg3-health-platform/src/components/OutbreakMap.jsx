import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RISK_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

const OutbreakMap = ({ points = [], center = [20.5937, 78.9629], zoom = 5 }) => {
  // Nothing to compute — react-leaflet handles everything declaratively
  const maxCases = points.length ? Math.max(...points.map(p => p.cases), 1) : 1;

  return (
    <MapContainer
      key={`${center[0]}-${center[1]}-${zoom}`}
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', minHeight: '320px' }}
      scrollWheelZoom={true}
      className="rounded-b-2xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {points.map((point, i) => {
        const color  = RISK_COLORS[point.risk] || RISK_COLORS.Low;
        const radius = 8 + (point.cases / maxCases) * 22;

        return (
          <CircleMarker
            key={i}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              fillColor:   color,
              color:       color,
              weight:      1.5,
              opacity:     0.9,
              fillOpacity: 0.35,
            }}
          >
            <Tooltip sticky>
              <div style={{ fontFamily: 'sans-serif', minWidth: 160 }}>
                <strong style={{ fontSize: 13 }}>{point.disease}</strong><br />
                <span style={{ color: '#555' }}>{point.district}, {point.state}</span>
                <hr style={{ margin: '4px 0', borderColor: '#eee' }} />
                Cases: <strong>{point.cases.toLocaleString()}</strong><br />
                Weekly:{' '}
                <strong style={{ color: point.weekly_change > 10 ? '#ef4444' : '#f59e0b' }}>
                  +{point.weekly_change}%
                </strong><br />
                Risk:{' '}
                <strong style={{ color }}>{point.risk}</strong>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default OutbreakMap;
