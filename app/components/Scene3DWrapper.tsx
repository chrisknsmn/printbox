'use client';

import dynamic from 'next/dynamic';

// Import ThreeScene component with dynamic import to avoid SSR issues
const ThreeScene = dynamic(() => import('./ThreeScene'), {
  ssr: false,
  loading: () => <div>Loading 3D scene...</div>
});

export default function Scene3DWrapper() {
  return <ThreeScene />;
}
