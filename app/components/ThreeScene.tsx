'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Menu options interface
interface MenuOption {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
  children?: MenuOption[];
}

// Create a 3D wireframe grid with customizable dimensions
function createBoundingGrid(settings: {
  width: number,
  length: number,
  height: number,
  horizontalDivisions: number,
  verticalDivisions: number,
  color: number
}) {
  const { width, length, height, horizontalDivisions, verticalDivisions, color } = settings;
  
  // Create a custom grid using line segments for more control
  const gridGeometry = new THREE.BufferGeometry();
  const gridMaterial = new THREE.LineBasicMaterial({ color });
  
  // Calculate points for the grid lines
  const vertices = [];
  const xCellSize = width / horizontalDivisions;
  const zCellSize = length / horizontalDivisions;
  const yCellSize = height / verticalDivisions;
  
  const halfWidth = width / 2;
  const halfLength = length / 2;
  
  // Create horizontal lines on the base (XZ plane)
  for (let i = 0; i <= horizontalDivisions; i++) {
    const zPosition = (i * zCellSize) - halfLength;
    vertices.push(-halfWidth, 0, zPosition); // Start point
    vertices.push(halfWidth, 0, zPosition);  // End point
  }
  
  // Create vertical lines on the base (XZ plane)
  for (let i = 0; i <= horizontalDivisions; i++) {
    const xPosition = (i * xCellSize) - halfWidth;
    vertices.push(xPosition, 0, -halfLength); // Start point
    vertices.push(xPosition, 0, halfLength);  // End point
  }
  
  // Create vertical lines for height (Y axis) at each horizontal division
  // Front and back edges
  for (let i = 0; i <= horizontalDivisions; i++) {
    const xPosition = (i * xCellSize) - halfWidth;
    // Front edge
    vertices.push(xPosition, 0, -halfLength); // Bottom point
    vertices.push(xPosition, height, -halfLength); // Top point
    // Back edge
    vertices.push(xPosition, 0, halfLength); // Bottom point
    vertices.push(xPosition, height, halfLength); // Top point
  }
  
  // Left and right edges
  for (let i = 0; i <= horizontalDivisions; i++) {
    const zPosition = (i * zCellSize) - halfLength;
    // Left edge
    vertices.push(-halfWidth, 0, zPosition); // Bottom point
    vertices.push(-halfWidth, height, zPosition); // Top point
    // Right edge
    vertices.push(halfWidth, 0, zPosition); // Bottom point
    vertices.push(halfWidth, height, zPosition); // Top point
  }
  
  // Create horizontal divisions for height (Y axis)
  for (let j = 1; j <= verticalDivisions; j++) {
    const yPosition = j * yCellSize;
    
    // Create horizontal lines at each vertical division (XZ plane at Y=yPosition)
    for (let i = 0; i <= horizontalDivisions; i++) {
      const zPosition = (i * zCellSize) - halfLength;
      // X-axis lines
      vertices.push(-halfWidth, yPosition, zPosition); // Start point
      vertices.push(halfWidth, yPosition, zPosition);  // End point
      
      const xPosition = (i * xCellSize) - halfWidth;
      // Z-axis lines
      vertices.push(xPosition, yPosition, -halfLength); // Start point
      vertices.push(xPosition, yPosition, halfLength);  // End point
    }
  }
  
  // Set the vertices to the geometry
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  // Create the grid mesh
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.position.y = 0; // Exactly at y=0
  return grid;
}

// Add CSS styles for button animations
const buttonStyles = `
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  .grid-button:active .ripple-effect {
    transform: scale(1);
    animation: ripple 0.5s linear;
  }
`;

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const [activeOption, setActiveOption] = useState<string | null>(null);
  
  // Define menu options
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([
    {
      id: 'view',
      label: 'View',
      children: [
        { id: 'view-front', label: 'Front' },
        { id: 'view-top', label: 'Top' },
        { id: 'view-side', label: 'Side' },
        { id: 'view-iso', label: 'Isometric', active: true }
      ]
    },
    {
      id: 'grid',
      label: 'Grid',
      children: [
        { id: 'grid-show', label: 'Hide' },
        { id: 'grid-color', label: 'Color' }
      ]
    }
  ]);
  
  // Grid settings with separate width, length, and height dimensions
  const [gridSettings, setGridSettings] = useState({
    width: 100, // mm (X axis)
    length: 100, // mm (Z axis)
    height: 50, // mm (Y axis)
    horizontalDivisions: 2,
    verticalDivisions: 1,
    visible: true,
    color: 0x888888
  });
  
  // Input values for grid dimensions
  const [gridWidthInput, setGridWidthInput] = useState(gridSettings.width.toString());
  const [gridLengthInput, setGridLengthInput] = useState(gridSettings.length.toString());
  const [gridHeightInput, setGridHeightInput] = useState(gridSettings.height.toString());
  const [gridHDivInput, setGridHDivInput] = useState(gridSettings.horizontalDivisions.toString());
  const [gridVDivInput, setGridVDivInput] = useState(gridSettings.verticalDivisions.toString());
  
  // References to scene objects for menu controls
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.LineSegments | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  
  // Function to update the grid with new settings
  const updateGrid = (newSettings: typeof gridSettings) => {
    if (gridRef.current && sceneRef.current) {
      // Remove old grid
      sceneRef.current.remove(gridRef.current);
      
      // Create new grid with new settings
      const newGrid = createBoundingGrid(newSettings);
      sceneRef.current.add(newGrid);
      gridRef.current = newGrid;
      
      // Update state
      setGridSettings(newSettings);
    }
  };
  
  // Handle grid dimension input changes
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGridWidthInput(value);
    
    // Update grid only if value is a valid number
    const width = parseInt(value);
    if (!isNaN(width) && width > 0) {
      updateGrid({ ...gridSettings, width });
    }
  };
  
  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGridLengthInput(value);
    
    // Update grid only if value is a valid number
    const length = parseInt(value);
    if (!isNaN(length) && length > 0) {
      updateGrid({ ...gridSettings, length });
    }
  };
  
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGridHeightInput(value);
    
    // Update grid only if value is a valid number
    const height = parseInt(value);
    if (!isNaN(height) && height > 0) {
      updateGrid({ ...gridSettings, height });
    }
  };
  
  const handleHDivChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGridHDivInput(value);
    
    // Update grid only if value is a valid number
    const horizontalDivisions = parseInt(value);
    if (!isNaN(horizontalDivisions) && horizontalDivisions > 0) {
      updateGrid({ ...gridSettings, horizontalDivisions });
    }
  };
  
  const handleVDivChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGridVDivInput(value);
    
    // Update grid only if value is a valid number
    const verticalDivisions = parseInt(value);
    if (!isNaN(verticalDivisions) && verticalDivisions > 0) {
      updateGrid({ ...gridSettings, verticalDivisions });
    }
  };
  
  // Handle menu option click
  const handleMenuOptionClick = (optionId: string) => {
    // Toggle submenu if parent menu is clicked
    if (activeOption === optionId) {
      setActiveOption(null);
      return;
    }
    
    setActiveOption(optionId);
    console.log('Selected option:', optionId);
    
    // Camera view options
    if (optionId === 'view-front' || optionId === 'view-top' || optionId === 'view-side' || optionId === 'view-iso') {
      if (cameraRef.current && controlsRef.current) {
        // Get current distance from camera to target
        const currentDistance = cameraRef.current.position.length();
        
        // Set new camera position based on view while maintaining distance
        let newPosition;
        if (optionId === 'view-front') {
          // Front view (looking along Z-axis)
          newPosition = new THREE.Vector3(0, 0, 1);
        } else if (optionId === 'view-top') {
          // Top view (looking along Y-axis)
          newPosition = new THREE.Vector3(0, 1, 0);
        } else if (optionId === 'view-side') {
          // Side view (looking along X-axis)
          newPosition = new THREE.Vector3(1, 0, 0);
        } else { // view-iso
          // Isometric view
          newPosition = new THREE.Vector3(1, 1, 1).normalize();
        }
        
        // Scale the direction vector to match the current distance
        newPosition.multiplyScalar(currentDistance);
        
        // Set camera position and update controls
        cameraRef.current.position.copy(newPosition);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.update();
        
        // Update active state for view options
        const updatedOptions = [...menuOptions];
        const viewOption = updatedOptions.find(opt => opt.id === 'view');
        if (viewOption && viewOption.children) {
          viewOption.children.forEach(child => {
            child.active = child.id === optionId;
          });
        }
        setMenuOptions(updatedOptions);
      }
    }
    
    // Grid options
    else if (optionId === 'grid-show') {
      if (gridRef.current && sceneRef.current) {
        // Toggle grid visibility
        const newVisible = !gridRef.current.visible;
        gridRef.current.visible = newVisible;
        
        // Update state
        setGridSettings(prev => ({
          ...prev,
          visible: newVisible
        }));
        
        // Update the menu option immediately
        const updatedOptions = JSON.parse(JSON.stringify(menuOptions)) as MenuOption[];
        const gridOption = updatedOptions.find((opt: MenuOption) => opt.id === 'grid');
        if (gridOption && gridOption.children) {
          const showOption = gridOption.children.find((child: MenuOption) => child.id === 'grid-show');
          if (showOption) {
            showOption.label = newVisible ? 'Hide' : 'Show';
          }
        }
        setMenuOptions(updatedOptions);
      }
    } 
    
    // Grid color option
    else if (optionId === 'grid-color') {
      if (gridRef.current) {
        const material = gridRef.current.material as THREE.LineBasicMaterial;
        const colors = [0x888888, 0x444444, 0xaaaaaa, 0x0088ff];
        const currentColorHex = material.color.getHex();
        const currentIndex = colors.indexOf(currentColorHex);
        const nextIndex = (currentIndex + 1) % colors.length;
        const newColor = colors[nextIndex];
        
        // Update material color immediately
        material.color.setHex(newColor);
        
        // Update state
        setGridSettings(prev => ({
          ...prev,
          color: newColor
        }));
      }
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;
    
    function initScene() {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x333333);
      
      // Store scene reference for menu controls
      sceneRef.current = scene;

      // Create camera with extended far plane for better zoom out
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        5000 // Extended far plane to prevent clipping when zoomed out
      );
      camera.position.set(100, 100, 100);
      camera.lookAt(0, 0, 0);
      
      // Store camera reference for menu controls
      cameraRef.current = camera;

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

      // Add controls with extended zoom range
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1;
      controls.maxDistance = 1000; // Allow zooming out much farther
      controls.zoomSpeed = 1.5;    // Increase zoom speed for better navigation
      
      // Store controls reference for menu controls
      controlsRef.current = controls;

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
      
      // Store cube reference for menu controls
      cubeRef.current = cube;

      // Create and add the grid to the scene
      const grid = createBoundingGrid(gridSettings);
      scene.add(grid);
      
      // Store grid reference for menu controls
      gridRef.current = grid;

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

  // Render menu item with children
  const renderMenuItem = (option: MenuOption) => {
    const hasChildren = option.children && option.children.length > 0;
    const isActive = activeOption === option.id || option.active;
    
    return (
      <div key={option.id} className="menu-item">
        <div 
          className={`menu-item-header ${isActive ? 'active' : ''}`}
          onClick={() => handleMenuOptionClick(option.id)}
        >
          {option.label}
          {hasChildren && <span className="menu-arrow">▾</span>}
        </div>
        
        {hasChildren && (
          <div className="menu-children">
            {option.children?.map(child => (
              <div 
                key={child.id} 
                className={`menu-child ${child.active ? 'active' : ''}`}
                onClick={() => handleMenuOptionClick(child.id)}
              >
                {child.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Add style tag for button animations */}
      <style dangerouslySetInnerHTML={{ __html: buttonStyles }} />
      {statusMessage && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: '4px',
          zIndex: 5
        }}>
          {statusMessage}
        </div>
      )}
      
      {/* 3D Scene Menu */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 5,
        backgroundColor: 'rgba(40, 40, 40, 0.8)',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        minWidth: '220px',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          fontWeight: 'bold'
        }}>
          <span>Bounding Box</span>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px'
            }}
          >
            {menuOpen ? '−' : '+'}
          </button>
        </div>
        
        {menuOpen && (
          <div style={{ padding: '12px' }}>
            {/* Grid dimension inputs */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ fontSize: '13px', marginRight: '8px' }}>Width (mm):</label>
                <input 
                  type="number" 
                  value={gridWidthInput}
                  onChange={handleWidthChange}
                  min="10"
                  max="500"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    padding: '4px 6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ fontSize: '13px', marginRight: '8px' }}>Length (mm):</label>
                <input 
                  type="number" 
                  value={gridLengthInput}
                  onChange={handleLengthChange}
                  min="10"
                  max="500"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    padding: '4px 6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ fontSize: '13px', marginRight: '8px' }}>Height (mm):</label>
                <input 
                  type="number" 
                  value={gridHeightInput}
                  onChange={handleHeightChange}
                  min="5"
                  max="500"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    padding: '4px 6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ fontSize: '13px', marginRight: '8px' }}>Horizontal Cells:</label>
                <input 
                  type="number" 
                  value={gridHDivInput}
                  onChange={handleHDivChange}
                  min="2"
                  max="50"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    padding: '4px 6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <label style={{ fontSize: '13px', marginRight: '8px' }}>Vertical Cells:</label>
                <input 
                  type="number" 
                  value={gridVDivInput}
                  onChange={handleVDivChange}
                  min="1"
                  max="10"
                  style={{
                    width: '70px',
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    padding: '4px 6px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
            
            {/* View options */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                marginBottom: '6px',
                paddingBottom: '4px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                View
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {menuOptions[0].children?.map(view => (
                  <button
                    key={view.id}
                    onClick={() => handleMenuOptionClick(view.id)}
                    style={{
                      backgroundColor: view.active ? 'rgba(74, 158, 255, 0.3)' : 'rgba(60, 60, 60, 0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      color: view.active ? '#4a9eff' : 'white',
                      padding: '4px 8px',
                      fontSize: '12px',
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
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                marginBottom: '6px',
                paddingBottom: '4px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                Grid
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {/* Show/Hide Grid Button - Direct implementation */}
                <button
                  className="grid-button"
                  onClick={() => {
                    // Direct toggle of grid visibility
                    if (gridRef.current) {
                      const newVisible = !gridRef.current.visible;
                      gridRef.current.visible = newVisible;
                      
                      // Update state
                      setGridSettings(prev => ({
                        ...prev,
                        visible: newVisible
                      }));
                      
                      // Update menu option label directly
                      const updatedOptions = JSON.parse(JSON.stringify(menuOptions)) as MenuOption[];
                      const gridOption = updatedOptions.find((opt: MenuOption) => opt.id === 'grid');
                      if (gridOption && gridOption.children) {
                        const showOption = gridOption.children.find((child: MenuOption) => child.id === 'grid-show');
                        if (showOption) {
                          showOption.label = newVisible ? 'Hide' : 'Show';
                        }
                      }
                      setMenuOptions(updatedOptions);
                    }
                  }}
                  style={{
                    backgroundColor: gridSettings.visible ? 'rgba(74, 158, 255, 0.3)' : 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: gridSettings.visible ? '#4a9eff' : 'white',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    flex: '1',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>
                    {gridSettings.visible ? 'Hide' : 'Show'}
                  </span>
                  <span className="ripple-effect" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'scale(0)',
                    transition: 'transform 0.3s',
                    borderRadius: '3px',
                    zIndex: 1
                  }} />
                </button>
                
                {/* Color Button - Direct implementation */}
                <button
                  className="grid-button"
                  onClick={() => {
                    // Direct color change
                    if (gridRef.current) {
                      const material = gridRef.current.material as THREE.LineBasicMaterial;
                      const colors = [0x888888, 0x444444, 0xaaaaaa, 0x0088ff];
                      const currentColorHex = material.color.getHex();
                      const currentIndex = colors.indexOf(currentColorHex);
                      const nextIndex = (currentIndex + 1) % colors.length;
                      const newColor = colors[nextIndex];
                      
                      // Update material color immediately
                      material.color.setHex(newColor);
                      
                      // Update state
                      setGridSettings(prev => ({
                        ...prev,
                        color: newColor
                      }));
                    }
                  }}
                  style={{
                    backgroundColor: 'rgba(60, 60, 60, 0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '3px',
                    color: 'white',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    flex: '1',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 2 }}>Color</span>
                  <span className="ripple-effect" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'scale(0)',
                    transition: 'transform 0.3s',
                    borderRadius: '3px',
                    zIndex: 1
                  }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
          position: 'relative'
        }} 
      />
    </div>
  );
}
