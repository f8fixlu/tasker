import React, { lazy, Suspense } from 'react';

const LazyChartSection = lazy(() => import('./ChartSection'));

const ChartSectionWrapper = (props) => {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading charts...</div>}>
      <LazyChartSection {...props} />
    </Suspense>
  );
};

export default ChartSectionWrapper;