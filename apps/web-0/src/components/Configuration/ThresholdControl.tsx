import React, { useState, useEffect } from 'react';

interface ThresholdControlProps {
  value: number;
  onChange: (value: number) => void;
}

const MIN_THRESHOLD = 0.1;
const MAX_THRESHOLD = 0.3;
const STEP = 0.01;

export const ThresholdControl: React.FC<ThresholdControlProps> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue.toString());
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Breakline Threshold
        </label>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min={MIN_THRESHOLD}
            max={MAX_THRESHOLD}
            step={STEP}
            value={value}
            onChange={handleSliderChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-with-zones"
            style={{
              background: `linear-gradient(to right,
                #EE2F27 0%,
                #EE2F27 ${((value - MIN_THRESHOLD) / (MAX_THRESHOLD - MIN_THRESHOLD)) * 100}%,
                #E5E7EB ${((value - MIN_THRESHOLD) / (MAX_THRESHOLD - MIN_THRESHOLD)) * 100}%,
                #E5E7EB 100%)`
            }}
          />
          <div className="relative h-4 mt-1">
            <span className="absolute text-xs text-gray-500" style={{ left: '0%', transform: 'translateX(-50%)' }}>0.1</span>
            <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>0.2</span>
            <span className="absolute text-xs text-gray-500" style={{ left: '100%', transform: 'translateX(-50%)' }}>0.3</span>
          </div>
        </div>

        {/* Current Value Display */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-600">Current Value:</span>
          <span className="font-mono font-semibold text-hwc-red">
            {parseFloat(localValue).toFixed(2)}
          </span>
        </div>
      </div>



      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Breakline Threshold:</strong> Controls the level of detail in generated breaklines</p>
        <p>• <strong>Lower values (0.1):</strong> Larger file size, greater definition</p>
        <p>• <strong>Higher values (0.3):</strong> Smaller file size, reduced definition</p>
        <p className="text-hwc-red mt-2"><strong>Default: 0.1 (recommended for most use cases)</strong></p>
      </div>
    </div>
  );
};