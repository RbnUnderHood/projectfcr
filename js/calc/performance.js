'use strict';

// Classify FCR into performance bands
function performanceForFcr(fcr) {
  if (fcr <= 2)   return { key:'excellent', label:'Excellent', desc:'Top-tier efficiency. Maintain current practices.' };
  if (fcr <= 2.4) return { key:'good',      label:'Good',      desc:'Healthy performance. Small optimizations may help.' };
  if (fcr <= 2.8) return { key:'average',   label:'Average',   desc:'Room for improvement. Review management and feed.' };
  return                { key:'poor',      label:'Needs Improvement', desc:'Inefficient. Check health, feed quality, and environment.' };
}

// Expose globally
window.performanceForFcr = performanceForFcr;
