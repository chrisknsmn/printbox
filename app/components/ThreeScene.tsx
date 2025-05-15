'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!mountRef.current) return;
    
    function initScene() {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2a3b4c); // Dark blue background

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(3, 3, 4);
      camera.lookAt(0, 0, 0);

      // Create renderer with better quality settings
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      const mountElement = mountRef.current;
      if (!mountElement) return;
      
      mountElement.innerHTML = ''; // Clear any previous content
      mountElement.appendChild(renderer.domElement);

      // Add controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 2;
      controls.maxDistance = 10;

      // Create a 3D printing-ready cube with precise geometry
      function createPrintableCube() {
        // Create a detailed cube with proper geometry for 3D printing
        const geometry = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);
        
        // Compute vertex normals for proper lighting
        geometry.computeVertexNormals();
        
        // Create materials for each face of the cube with different colors
        const materials = [
          new THREE.MeshStandardMaterial({ color: 0x3080ff, roughness: 0.2, metalness: 0.3 }), // Right face - blue
          new THREE.MeshStandardMaterial({ color: 0xff4040, roughness: 0.2, metalness: 0.3 }), // Left face - red
          new THREE.MeshStandardMaterial({ color: 0x40ff40, roughness: 0.2, metalness: 0.3 }), // Top face - green
          new THREE.MeshStandardMaterial({ color: 0xffff40, roughness: 0.2, metalness: 0.3 }), // Bottom face - yellow
          new THREE.MeshStandardMaterial({ color: 0xff8000, roughness: 0.2, metalness: 0.3 }), // Front face - orange
          new THREE.MeshStandardMaterial({ color: 0x8040ff, roughness: 0.2, metalness: 0.3 }), // Back face - purple
        ];
        
        // Create mesh with geometry and materials
        const cube = new THREE.Mesh(geometry, materials);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.position.set(0, 1, 0); // Position cube exactly 1 unit above the grid (y=0)
        
        // Add wireframe to visualize the mesh structure
        const wireframe = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
        );
        cube.add(wireframe);
        
        return cube;
      }
      
      // Create and add the cube to the scene
      const cube = createPrintableCube();
      scene.add(cube);

      // Create a flat wireframe grid with even cells
      const gridSize = 10; // Total grid size
      const gridDivisions = 10; // Number of divisions (cells)
      const gridColor = 0x888888; // Grid color
      
      // Create a custom grid using line segments for more control
      const gridGeometry = new THREE.BufferGeometry();
      const gridMaterial = new THREE.LineBasicMaterial({ color: gridColor });
      
      // Calculate points for the grid lines
      const vertices = [];
      const cellSize = gridSize / gridDivisions;
      
      // Create horizontal lines
      for (let i = 0; i <= gridDivisions; i++) {
        const position = (i * cellSize) - (gridSize / 2);
        vertices.push(-gridSize/2, 0, position); // Start point
        vertices.push(gridSize/2, 0, position);  // End point
      }
      
      // Create vertical lines
      for (let i = 0; i <= gridDivisions; i++) {
        const position = (i * cellSize) - (gridSize / 2);
        vertices.push(position, 0, -gridSize/2); // Start point
        vertices.push(position, 0, gridSize/2);  // End point
      }
      
      // Set the vertices to the geometry
      gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      // Create the grid mesh and add it to the scene
      const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
      grid.position.y = 0; // Exactly at y=0
      scene.add(grid);

      // Add axes helper
      const axesHelper = new THREE.AxesHelper(2);
      scene.add(axesHelper);
      
      // Add lights for better visualization
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);
      
      // Add a softer fill light from another angle
      const fillLight = new THREE.DirectionalLight(0xffffcc, 0.4);
      fillLight.position.set(-5, 3, -5);
      scene.add(fillLight);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        // Rotate the cube slowly
        cube.rotation.y += 0.005;
        cube.rotation.x += 0.002;
        
        controls.update();
        renderer.render(scene, camera);
      };

      animate();

      // Handle window resize
      const handleResize = () => {
        if (!mountRef.current) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        if (mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      };
    }
    
    // Initialize the scene
    initScene();
  }, []);

  return (
    <div>
      {statusMessage && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: '4px',
          zIndex: 1000
        }}>
          {statusMessage}
        </div>
      )}
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100vh',
          display: 'block',
          position: 'relative'
        }} 
      />
    </div>
  );
}
