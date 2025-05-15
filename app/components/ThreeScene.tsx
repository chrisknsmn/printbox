'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBoxGrid } from '../utils/cubeUtils';

// Simplified menu option interface
interface MenuOption {
  id: string;
  label: string;
  active?: boolean;
  children?: MenuOption[];
}

// Create a 3D grid with customizable dimensions
function createBoundingGrid(settings: {
  width: number,
  length: number,
  height: number,
  horizontalDivisions: number,
  verticalDivisions: number,
  color: number
}) {
  const { width, length, height, horizontalDivisions, verticalDivisions, color } = settings;
  const gridGeometry = new THREE.BufferGeometry();
  const gridMaterial = new THREE.LineBasicMaterial({ color });
  
  const vertices = [];
  const xCellSize = width / horizontalDivisions;
  const zCellSize = length / horizontalDivisions;
  const yCellSize = height / verticalDivisions;
  
  const halfWidth = width / 2;
  const halfLength = length / 2;
  
  // Horizontal lines (XZ plane)
  for (let i = 0; i <= horizontalDivisions; i++) {
    vertices.push(-halfWidth, 0, i * zCellSize - halfLength, halfWidth, 0, i * zCellSize - halfLength);
    vertices.push(i * xCellSize - halfWidth, 0, -halfLength, i * xCellSize - halfWidth, 0, halfLength);
  }
  
  // Vertical edges
  for (let i = 0; i <= horizontalDivisions; i++) {
    vertices.push(i * xCellSize - halfWidth, 0, -halfLength, i * xCellSize - halfWidth, height, -halfLength);
    vertices.push(i * xCellSize - halfWidth, 0, halfLength, i * xCellSize - halfWidth, height, halfLength);
    vertices.push(-halfWidth, 0, i * zCellSize - halfLength, -halfWidth, height, i * zCellSize - halfLength);
    vertices.push(halfWidth, 0, i * zCellSize - halfLength, halfWidth, height, i * zCellSize - halfLength);
  }
  
  // Horizontal divisions for height
  for (let j = 1; j <= verticalDivisions; j++) {
    const yPos = j * yCellSize;
    for (let i = 0; i <= horizontalDivisions; i++) {
      vertices.push(-halfWidth, yPos, i * zCellSize - halfLength, halfWidth, yPos, i * zCellSize - halfLength);
      vertices.push(i * xCellSize - halfWidth, yPos, -halfLength, i * xCellSize - halfWidth, yPos, halfLength);
    }
  }
  
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  return grid;
}

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const [activeOption, setActiveOption] = useState<string | null>(null);
  
  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.LineSegments | null>(null);
  const cubeRef = useRef<THREE.Group | null>(null);
  const cubesRef = useRef<THREE.Object3D[]>([]);
  
  // Grid settings
  const [gridSettings, setGridSettings] = useState({
    width: 100,
    length: 100,
    height: 50,
    horizontalDivisions: 2,
    verticalDivisions: 1,
    visible: true,
    color: 0x888888
  });
  
  // Input values
  const [gridWidthInput, setGridWidthInput] = useState(gridSettings.width.toString());
  const [gridLengthInput, setGridLengthInput] = useState(gridSettings.length.toString());
  const [gridHeightInput, setGridHeightInput] = useState(gridSettings.height.toString());
  const [gridHDivInput, setGridHDivInput] = useState(gridSettings.horizontalDivisions.toString());
  const [gridVDivInput, setGridVDivInput] = useState(gridSettings.verticalDivisions.toString());
  
  // Menu options
  const [menuOptions] = useState<MenuOption[]>([
    {
      id: 'view',
      label: 'View',
      children: [
        { id: 'view-front', label: 'Front' },
        { id: 'view-top', label: 'Top' },
        { id: 'view-side', label: 'Side' },
        { id: 'view-iso', label: 'Isometric', active: true }
      ]
    }
  ]);
  
  // Update grid with new settings
  const updateGrid = (newSettings: typeof gridSettings) => {
    if (!sceneRef.current || !gridRef.current) return;
    
    sceneRef.current.remove(gridRef.current);
    const newGrid = createBoundingGrid(newSettings);
    sceneRef.current.add(newGrid);
    gridRef.current = newGrid;
    setGridSettings(newSettings);
    
    // Populate grid cells with cubes
    setTimeout(() => {
      if (sceneRef.current && cubeRef.current) {
        populateGridCells();
      }
    }, 0);
  };
  
  // Populate grid cells with cubes
  const populateGridCells = () => {
    if (!cubeRef.current) return;
    const cubes = createBoxGrid(cubeRef.current, gridSettings);
    cubesRef.current = cubes;
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, property: keyof typeof gridSettings) => {
    const value = e.target.value;
    
    // Update corresponding input state
    switch(property) {
      case 'width': setGridWidthInput(value); break;
      case 'length': setGridLengthInput(value); break;
      case 'height': setGridHeightInput(value); break;
      case 'horizontalDivisions': setGridHDivInput(value); break;
      case 'verticalDivisions': setGridVDivInput(value); break;
    }
    
    // Update grid
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      updateGrid({ ...gridSettings, [property]: numValue });
    }
  };
  
  // Handle menu option click
  const handleViewOptionClick = (optionId: string) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    // Get current distance from camera to target
    const currentDistance = cameraRef.current.position.length();
    
    // Set new camera position based on view
    let newPosition;
    switch(optionId) {
      case 'view-front': newPosition = new THREE.Vector3(0, 0, 1); break;
      case 'view-top': newPosition = new THREE.Vector3(0, 1, 0); break; 
      case 'view-side': newPosition = new THREE.Vector3(1, 0, 0); break;
      default: newPosition = new THREE.Vector3(1, 1, 1).normalize(); break;
    }
    
    // Scale and position camera
    newPosition.multiplyScalar(currentDistance);
    cameraRef.current.position.copy(newPosition);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.update();
  };
  
  // Toggle grid visibility
  const toggleGridVisibility = () => {
    if (!gridRef.current) return;
    
    gridRef.current.visible = !gridRef.current.visible;
    setGridSettings(prev => ({
      ...prev,
      visible: gridRef.current!.visible
    }));
  };
  
  // Change grid color
  const changeGridColor = () => {
    if (!gridRef.current) return;
    
    const material = gridRef.current.material as THREE.LineBasicMaterial;
    const colors = [0x888888, 0x444444, 0xaaaaaa, 0x0088ff];
    const currentColorHex = material.color.getHex();
    const nextIndex = (colors.indexOf(currentColorHex) + 1) % colors.length;
    
    material.color.setHex(colors[nextIndex]);
    setGridSettings(prev => ({
      ...prev,
      color: colors[nextIndex]
    }));
  };

  useEffect(() => {
    if (!mountRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(100, 200, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    // Create cubes group
    const cubesGroup = new THREE.Group();
    cubeRef.current = cubesGroup;
    scene.add(cubesGroup);

    // Create and add grid
    const grid = createBoundingGrid(gridSettings);
    scene.add(grid);
    gridRef.current = grid;
    
    // Setup lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffcc, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    
    // Add axes helper
    scene.add(new THREE.AxesHelper(2));
    
    // Populate grid cells
    populateGridCells();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Controls panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 5,
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        color: 'white',
        minWidth: '200px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Panel header with toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          fontWeight: 'bold'
        }}>
          <span>Bounding Box</span>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer'
          }}>
            {menuOpen ? '−' : '+'}
          </button>
        </div>
        
        {menuOpen && (
          <div style={{ padding: '12px' }}>
            {/* Dimension inputs */}
            <div style={{ marginBottom: '12px' }}>
              {/* Width */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Width (mm):</label>
                <input 
                  type="number" 
                  value={gridWidthInput}
                  onChange={(e) => handleInputChange(e, 'width')}
                  min="10"
                  max="500"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '4px'
                  }}
                />
              </div>
              
              {/* Length */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Length (mm):</label>
                <input 
                  type="number" 
                  value={gridLengthInput}
                  onChange={(e) => handleInputChange(e, 'length')}
                  min="10"
                  max="500"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '4px'
                  }}
                />
              </div>
              
              {/* Height */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Height (mm):</label>
                <input 
                  type="number" 
                  value={gridHeightInput}
                  onChange={(e) => handleInputChange(e, 'height')}
                  min="5"
                  max="500"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '4px'
                  }}
                />
              </div>
              
              {/* Horizontal divisions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Horizontal Cells:</label>
                <input 
                  type="number" 
                  value={gridHDivInput}
                  onChange={(e) => handleInputChange(e, 'horizontalDivisions')}
                  min="2"
                  max="50"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '4px'
                  }}
                />
              </div>
              
              {/* Vertical divisions */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Vertical Cells:</label>
                <input 
                  type="number" 
                  value={gridVDivInput}
                  onChange={(e) => handleInputChange(e, 'verticalDivisions')}
                  min="1"
                  max="10"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '4px'
                  }}
                />
              </div>
            </div>
            
            {/* View options */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                View
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {menuOptions[0].children?.map(view => (
                  <button
                    key={view.id}
                    onClick={() => handleViewOptionClick(view.id)}
                    style={{
                      backgroundColor: view.active ? 'rgba(74, 158, 255, 0.3)' : 'rgba(60, 60, 60, 0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: view.active ? '#4a9eff' : 'white',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      flex: '1 0 auto'
                    }}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Grid options */}
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                Grid
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Show/Hide Button */}
                <button
                  onClick={toggleGridVisibility}
                  style={{
                    backgroundColor: gridSettings.visible ? 'rgba(74, 158, 255, 0.3)' : 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: gridSettings.visible ? '#4a9eff' : 'white',
                    padding: '4px 8px',
                    flex: '1'
                  }}
                >
                  {gridSettings.visible ? 'Hide' : 'Show'}
                </button>
                
                {/* Color Button */}
                <button
                  onClick={changeGridColor}
                  style={{
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '4px 8px',
                    flex: '1'
                  }}
                >
                  Color
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Three.js Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}