import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const ChartSection = ({ taskCompletionData, activityBreakdownChartData, lineChartOptions, pieChartOptions }) => {
  return (
    <div className="chart-section p-4 border border-gray-200 dark:border-gray-700 rounded mb-8 bg-white dark:bg-gray-800">
      <h2 className="font-bold mb-3 text-gray-800 dark:text-white">PERFORMANCE CHARTS</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Task Completion Trend</h3>
          <Line 
            data={taskCompletionData} 
            options={lineChartOptions} 
            className="w-full"
          />
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Activity Breakdown</h3>
          <div className="flex justify-center">
            <Pie 
              type="doughnut" 
              data={activityBreakdownChartData} 
              options={pieChartOptions} 
              className="w-full max-w-xs"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {activityBreakdownChartData.labels.map((label, index) => (
              <div key={label} className="flex items-center">
                <div 
                  className="w-4 h-4 mr-2 rounded-full" 
                  style={{ backgroundColor: activityBreakdownChartData.datasets[0].backgroundColor[index] }}
                ></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartSection;