import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const QpcrAmplificationChart = () => {
  // Synthesized qPCR data - cycle number vs. fluorescence
  const generateAmplificationCurve = (baselineValue, threshold, cycleThreshold, maxValue, noise = 0.02) => {
    const data = [];
    
    for (let cycle = 1; cycle <= 45; cycle++) {
      // Create the typical sigmoidal curve shape for qPCR
      let value;
      
      if (cycle < cycleThreshold - 5) {
        // Baseline region with small random noise
        value = baselineValue + (Math.random() * noise - noise/2);
      } else if (cycle >= cycleThreshold - 5 && cycle <= cycleThreshold + 10) {
        // Exponential and plateau phase
        const distanceFromCt = cycle - cycleThreshold;
        const sigmoidValue = 1 / (1 + Math.exp(-distanceFromCt));
        value = baselineValue + (maxValue - baselineValue) * sigmoidValue;
        // Add some noise
        value += (Math.random() * noise - noise/2) * value;
      } else {
        // Plateau region with small fluctuations
        value = maxValue * (0.95 + Math.random() * 0.1);
      }
      
      data.push({
        cycle,
        value: Number(value.toFixed(3)),
        threshold,
      });
    }
    
    return data;
  };

  // Generate datasets for different targets
  const sarsCov2Data = generateAmplificationCurve(0.05, 0.2, 24.3, 1.0);
  const fluAData = generateAmplificationCurve(0.05, 0.2, 27.6, 0.9);
  const fluBData = generateAmplificationCurve(0.05, 0.2, 30.1, 0.85);
  const negativeControlData = generateAmplificationCurve(0.05, 0.2, 60, 0.15); // No amplification
  const positiveControlData = generateAmplificationCurve(0.05, 0.2, 22.1, 1.1);

  // Combine all data for UI state
  const allDatasets = {
    'SARS-CoV-2': sarsCov2Data,
    'Influenza A': fluAData,
    'Influenza B': fluBData,
    'Negative Control': negativeControlData,
    'Positive Control': positiveControlData
  };

  // State for which curves to display
  const [visibleCurves, setVisibleCurves] = useState({
    'SARS-CoV-2': true,
    'Influenza A': true,
    'Influenza B': true,
    'Negative Control': true,
    'Positive Control': true
  });

  // Linear vs Log scale option
  const [useLogScale, setUseLogScale] = useState(false);

  // Toggle visibility of a curve
  const toggleCurve = (curveName) => {
    setVisibleCurves(prev => ({
      ...prev,
      [curveName]: !prev[curveName]
    }));
  };

  // Colors for each curve
  const curveColors = {
    'SARS-CoV-2': '#e41a1c',
    'Influenza A': '#377eb8',
    'Influenza B': '#4daf4a',
    'Negative Control': '#984ea3',
    'Positive Control': '#ff7f00'
  };

  // Calculate Ct values (for display)
  const calculateCt = (dataSet) => {
    const threshold = dataSet[0].threshold;
    for (let i = 0; i < dataSet.length - 1; i++) {
      if (dataSet[i].value < threshold && dataSet[i+1].value >= threshold) {
        // Linear interpolation
        const cyclesBetweenPoints = dataSet[i+1].cycle - dataSet[i].cycle;
        const valueDifference = dataSet[i+1].value - dataSet[i].value;
        const thresholdDifference = threshold - dataSet[i].value;
        const fractionalCycles = (thresholdDifference / valueDifference) * cyclesBetweenPoints;
        return (dataSet[i].cycle + fractionalCycles).toFixed(2);
      }
    }
    return "N/A"; // No crossing detected
  };

  // Process data for the chart
  const getChartData = () => {
    // For demonstration, we'll create merged data
    const mergedData = [];
    
    for (let i = 0; i < sarsCov2Data.length; i++) {
      const cycle = sarsCov2Data[i].cycle;
      const dataPoint = { cycle };
      
      // Add each visible dataset
      Object.keys(allDatasets).forEach(key => {
        if (visibleCurves[key]) {
          const value = allDatasets[key][i].value;
          dataPoint[key] = useLogScale ? (value > 0 ? Math.log10(value) : -2) : value;
        }
      });
      
      // Always include threshold line
      dataPoint.threshold = useLogScale ? Math.log10(sarsCov2Data[i].threshold) : sarsCov2Data[i].threshold;
      
      mergedData.push(dataPoint);
    }
    
    return mergedData;
  };

  return (
    <div className="flex flex-col p-4 bg-gray-50 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">DASH SARS-CoV-2 & Flu A/B Test Amplification Curves</h2>
      
      <div className="flex flex-wrap mb-4 gap-2">
        {Object.keys(allDatasets).map(curveName => (
          <button
            key={curveName}
            className={`px-3 py-1 rounded text-sm font-medium ${visibleCurves[curveName] 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700'}`}
            onClick={() => toggleCurve(curveName)}
          >
            <span className="inline-block w-3 h-3 mr-2 rounded-full" 
                  style={{ backgroundColor: curveColors[curveName] }}></span>
            {curveName}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <button
          className={`px-3 py-1 rounded text-sm font-medium ${useLogScale 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setUseLogScale(!useLogScale)}
        >
          {useLogScale ? 'Use Linear Scale' : 'Use Log Scale'}
        </button>
      </div>
      
      <div className="h-64 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={getChartData()}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="cycle"
              label={{ value: 'Cycle Number', position: 'insideBottomRight', offset: -5 }}
              domain={[0, 45]}
            />
            <YAxis
              label={{ 
                value: `Fluorescence (${useLogScale ? 'Log Scale' : 'RFU'})`, 
                angle: -90, 
                position: 'insideLeft' 
              }}
              domain={useLogScale ? [-2, 0.5] : [0, 'auto']}
            />
            <Tooltip 
              formatter={(value, name) => [
                name === "threshold" ? value : value.toFixed(3), 
                name === "threshold" ? "Threshold" : name
              ]}
              labelFormatter={(label) => `Cycle: ${label}`}
            />
            <Legend />
            
            {/* Threshold line */}
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="#999999"
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            
            {/* Amplification curves for each target */}
            {Object.keys(allDatasets).map(key => {
              if (visibleCurves[key]) {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={curveColors[key]}
                    dot={false}
                    strokeWidth={2}
                  />
                );
              }
              return null;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Ct Values Table */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Cycle Threshold (Ct) Values:</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ct Value</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.keys(allDatasets).map(key => {
                const ctValue = calculateCt(allDatasets[key]);
                const isPositive = ctValue !== "N/A" && parseFloat(ctValue) < 40;
                return (
                  <tr key={key}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="inline-block w-3 h-3 mr-2 rounded-full" 
                            style={{ backgroundColor: curveColors[key] }}></span>
                      {key}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{ctValue}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                        isPositive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isPositive ? 'Positive' : 'Negative'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QpcrAmplificationChart;
