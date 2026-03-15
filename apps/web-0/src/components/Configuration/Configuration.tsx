import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { ProcessingConfig, EPSGOption } from '../../types';
import { GRID_SPACING_OPTIONS, OUTPUT_FORMATS } from '../../utils/constants';
import epsgData from '../../data/EPSG.json';
import { ThresholdControl } from './ThresholdControl';

interface ConfigurationProps {
  config: ProcessingConfig;
  onConfigChange: (config: ProcessingConfig) => void;
  onProcess: () => void;
  isProcessing: boolean;
  filesSelected: boolean;
}

export const Configuration: React.FC<ConfigurationProps> = ({
  config,
  onConfigChange,
  onProcess,
  isProcessing,
  filesSelected,
}) => {
  const [selectedGridSpacing, setSelectedGridSpacing] = useState(GRID_SPACING_OPTIONS[0].value);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['dxf']);
  const [mergeOutputs, setMergeOutputs] = useState(false);
  const [threshold, setThreshold] = useState(0.1); // Default threshold value

  const epsgOptions = epsgData as EPSGOption[];

  // Format options for react-select
  const selectOptions = epsgOptions.map(option => ({
    value: option._id,
    label: `${option.name} (${option.unit})`,
  }));

  useEffect(() => {
    onConfigChange({
      ...config,
      voxel_size: selectedGridSpacing,
      output_formats: selectedFormats.join(','),
      merge_outputs: mergeOutputs,
      threshold: threshold,
    });
  }, [selectedGridSpacing, selectedFormats, mergeOutputs, threshold, onConfigChange]);

  const toggleFormat = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      borderColor: state.isFocused ? '#EE2F27' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(238, 47, 39, 0.1)' : 'none',
      '&:hover': {
        borderColor: '#EE2F27',
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#EE2F27' : state.isFocused ? '#FEE2E2' : 'white',
      color: state.isSelected ? 'white' : '#292C30',
      '&:active': {
        backgroundColor: '#DC2626',
      },
    }),
  };

  return (
    <div className="section-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-hwc-red text-white rounded-lg font-semibold">
          2
        </div>
        <h2 className="text-xl font-semibold">Configure Processing</h2>
      </div>

      <div className="space-y-6">
        {/* Grid Spacing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Grid Spacing (Feet)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            {GRID_SPACING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedGridSpacing(option.value)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex-1 ${selectedGridSpacing === option.value
                  ? 'bg-hwc-red text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-hwc-red'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Threshold Control */}
        <ThresholdControl
          value={threshold}
          onChange={setThreshold}
        />

        {/* Source Coordinate System */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Coordinate System
          </label>
          <Select
            styles={customStyles}
            options={selectOptions}
            value={selectOptions.find(opt => opt.value === config.source_epsg)}
            onChange={(selected) => onConfigChange({ ...config, source_epsg: selected?.value })}
            placeholder="Select coordinate system..."
            isClearable
            isSearchable
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </div>

        {/* Target Coordinate System */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Coordinate System
          </label>
          <Select
            styles={customStyles}
            options={selectOptions}
            value={selectOptions.find(opt => opt.value === config.target_epsg)}
            onChange={(selected) => onConfigChange({ ...config, target_epsg: selected?.value })}
            placeholder="Select coordinate system..."
            isClearable
            isSearchable
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </div>

        {/* Output Formats */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Output Formats (select multiple)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            {OUTPUT_FORMATS.map((format) => (
              <button
                key={format.value}
                onClick={() => toggleFormat(format.value)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 flex-1 border-2 ${selectedFormats.includes(format.value)
                  ? 'bg-hwc-red text-white border-hwc-red'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-hwc-red'
                  }`}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>

        {/* Merge Option */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={mergeOutputs}
              onChange={(e) => setMergeOutputs(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hwc-red"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            Combine multiple point clouds into single DXF
          </span>
        </div>

        {/* Process Button */}
        <button
          onClick={onProcess}
          disabled={!filesSelected || isProcessing || selectedFormats.length === 0}
          className="w-full btn-primary"
        >
          {isProcessing ? 'Processing...' : 'Process Files'}
        </button>
      </div>
    </div>
  );
};