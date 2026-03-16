import { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@hwc/ui';
import type { ProcessingConfig, EPSGOption } from '../../types';
import epsgData from '../../data/epsg/Indiana.json';

const GRID_OPTIONS = [
  { label: '25 feet', value: 25 },
  { label: '50 feet', value: 50 },
];

const FORMAT_OPTIONS = [
  { label: 'DXF', value: 'dxf' },
  { label: 'CSV', value: 'csv' },
];

interface Props {
  config: ProcessingConfig;
  onConfigChange: (c: ProcessingConfig) => void;
  onProcess: () => void;
  isProcessing: boolean;
  filesSelected: boolean;
}

export function Configuration({ config, onConfigChange, onProcess, isProcessing, filesSelected }: Props) {
  const [gridSpacing, setGridSpacing] = useState(25);
  const [formats, setFormats] = useState<string[]>(['dxf']);
  const [merge, setMerge] = useState(false);
  const [threshold, setThreshold] = useState(0.1);

  const epsgOptions = useMemo(
    () => (epsgData as EPSGOption[]).map((o) => ({ value: String(o._id), label: `${o.name} (${o.unit})` })),
    [],
  );

  useEffect(() => {
    onConfigChange({
      ...config,
      voxel_size: gridSpacing,
      output_formats: formats.join(','),
      merge_outputs: merge,
      threshold,
    });
  }, [gridSpacing, formats, merge, threshold]);

  const toggleFormat = (v: string) =>
    setFormats((prev) => (prev.includes(v) ? prev.filter((f) => f !== v) : [...prev, v]));

  const pct = ((threshold - 0.1) / 0.2) * 100;

  return (
    <div className="bl-card">
      <div className="bl-section-hdr">
        <span className="bl-step">2</span>
        <h2 className="bl-section-title">Configure Processing</h2>
      </div>

      {/* Grid Spacing */}
      <div className="bl-field-group">
        <label className="bl-field-label">Grid Spacing (Feet)</label>
        <div className="bl-toggle-group">
          {GRID_OPTIONS.map((o) => (
            <button key={o.value} className={`bl-toggle-btn ${gridSpacing === o.value ? 'active' : ''}`} onClick={() => setGridSpacing(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Threshold */}
      <div className="bl-field-group">
        <label className="bl-field-label">Breakline Threshold</label>
        <input
          type="range" min={0.1} max={0.3} step={0.01} value={threshold}
          className="bl-slider-track"
          style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, #e5e7eb ${pct}%)` }}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
        />
        <div className="bl-slider-labels"><span>0.1</span><span>0.2</span><span>0.3</span></div>
        <div className="bl-slider-value">
          <span>Current Value:</span>
          <span>{threshold.toFixed(2)}</span>
        </div>
        <div className="bl-help">
          <p><strong>Breakline Threshold:</strong> Controls the level of detail in generated breaklines</p>
          <p>• <strong>Lower values (0.1):</strong> Larger file size, greater definition</p>
          <p>• <strong>Higher values (0.3):</strong> Smaller file size, reduced definition</p>
          <p className="accent"><strong>Default: 0.1 (recommended for most use cases)</strong></p>
        </div>
      </div>

      {/* Source EPSG */}
      <div className="bl-field-group">
        <Combobox
          label="Source Coordinate System"
          options={epsgOptions}
          value={config.source_epsg ? String(config.source_epsg) : ''}
          onChange={(val: string) => onConfigChange({ ...config, source_epsg: val ? Number(val) : undefined })}
          placeholder="Select coordinate system..."
        />
      </div>

      {/* Target EPSG */}
      <div className="bl-field-group">
        <Combobox
          label="Target Coordinate System"
          options={epsgOptions}
          value={config.target_epsg ? String(config.target_epsg) : ''}
          onChange={(val: string) => onConfigChange({ ...config, target_epsg: val ? Number(val) : undefined })}
          placeholder="Select coordinate system..."
        />
      </div>

      {/* Output Formats */}
      <div className="bl-field-group">
        <label className="bl-field-label">Output Formats (select multiple)</label>
        <div className="bl-toggle-group">
          {FORMAT_OPTIONS.map((o) => (
            <button key={o.value} className={`bl-toggle-btn ${formats.includes(o.value) ? 'active' : ''}`} onClick={() => toggleFormat(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Merge toggle */}
      <div className="bl-field-group">
        <div className="bl-switch-row">
          <label className="bl-switch">
            <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
            <span className="bl-switch-slider" />
          </label>
          <span className="bl-switch-label">Combine multiple point clouds into single DXF</span>
        </div>
      </div>

      {/* Process */}
      <button
        className="bl-btn bl-btn-primary bl-btn-full"
        disabled={!filesSelected || isProcessing || formats.length === 0}
        onClick={onProcess}
      >
        {isProcessing ? 'Processing...' : 'Process Files'}
      </button>
    </div>
  );
}
