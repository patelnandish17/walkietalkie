/**
 * Ambient Animated Gradient Mesh with Dark (deep indigo/violet/teal)
 * and Light (soft pastel) variants.
 */

import React from 'react';

interface BackgroundMeshProps {
  isLightMode?: boolean;
}

export const BackgroundMesh: React.FC<BackgroundMeshProps> = ({ isLightMode = false }) => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      {/* Base Gradient Canvas */}
      <div
        className={`absolute inset-0 transition-colors duration-700 ${
          isLightMode
            ? 'bg-gradient-to-br from-slate-100 via-indigo-50/50 to-slate-200'
            : 'bg-gradient-to-br from-[#060810] via-[#090d18] to-[#04060b]'
        }`}
      />

      {/* Floating Animated Blobs */}
      <div
        className={`absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-[110px] opacity-40 animate-blob-1 transition-colors duration-700 ${
          isLightMode ? 'bg-indigo-300' : 'bg-indigo-600/35'
        }`}
      />

      <div
        className={`absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full blur-[125px] opacity-40 animate-blob-2 transition-colors duration-700 ${
          isLightMode ? 'bg-violet-300' : 'bg-violet-700/30'
        }`}
      />

      <div
        className={`absolute -bottom-36 left-1/4 w-[34rem] h-[34rem] rounded-full blur-[130px] opacity-35 animate-blob-3 transition-colors duration-700 ${
          isLightMode ? 'bg-teal-200' : 'bg-teal-600/25'
        }`}
      />

      {/* Subtle Tactile Radio Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};
