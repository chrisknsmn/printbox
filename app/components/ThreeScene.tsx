"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBoxGrid, createBox, calculateMaxSafeBorderRadius } from "../utils/cubeUtils";
import { Key } from "react";

interface MenuOption {
  id: string;
  label: string;
  active?: boolean;
  children?: MenuOption[];
}

interface GridSettings {
  width: number;
  length: number;
  height: number;
  horizontalDivisions: number;
  verticalDivisions: number;
  visible: boolean;
  color: number;
  bufferSize: number; // Buffer size in mm between cells
  wallThickness: number; // Wall thickness in mm
  borderRadius: number; // Border radius in mm for rounded corners
  showFoot: boolean; // Whether to show a foot on each box
  [key: string]: any; // Allow additional properties for type safety
}

// Type for keys of GridSettings to help with TypeScript
// Helper function to safely get field value from gridSettings
function getGridSetting(settings: GridSettings, key: keyof GridSettings): any {
  return settings[key];
}

function createBoundingGrid(settings: GridSettings) {
  const {
    width,
    length,
    height,
    horizontalDivisions,
    verticalDivisions,
    color,
  } = settings;
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
    vertices.push(
      -halfWidth,
      0,
      i * zCellSize - halfLength,
      halfWidth,
      0,
      i * zCellSize - halfLength
    );
    vertices.push(
      i * xCellSize - halfWidth,
      0,
      -halfLength,
      i * xCellSize - halfWidth,
      0,
      halfLength
    );
  }

  // Vertical edges
  for (let i = 0; i <= horizontalDivisions; i++) {
    vertices.push(
      i * xCellSize - halfWidth,
      0,
      -halfLength,
      i * xCellSize - halfWidth,
      height,
      -halfLength
    );
    vertices.push(
      i * xCellSize - halfWidth,
      0,
      halfLength,
      i * xCellSize - halfWidth,
      height,
      halfLength
    );
    vertices.push(
      -halfWidth,
      0,
      i * zCellSize - halfLength,
      -halfWidth,
      height,
      i * zCellSize - halfLength
    );
    vertices.push(
      halfWidth,
      0,
      i * zCellSize - halfLength,
      halfWidth,
      height,
      i * zCellSize - halfLength
    );
  }

  // Horizontal divisions for height
  for (let j = 1; j <= verticalDivisions; j++) {
    const yPos = j * yCellSize;
    for (let i = 0; i <= horizontalDivisions; i++) {
      vertices.push(
        -halfWidth,
        yPos,
        i * zCellSize - halfLength,
        halfWidth,
        yPos,
        i * zCellSize - halfLength
      );
      vertices.push(
        i * xCellSize - halfWidth,
        yPos,
        -halfLength,
        i * xCellSize - halfWidth,
        yPos,
        halfLength
      );
    }
  }

  gridGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  return new THREE.LineSegments(gridGeometry, gridMaterial);
}

function createCubesForGrid(group: THREE.Group, settings: GridSettings) {
  // Clear existing cubes first
  while (group.children.length > 0) {
    const child = group.children[0];

    // Use type guards to check if the object is a Mesh with material/geometry
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    group.remove(child);
  }

  const {
    width,
    length,
    height,
    horizontalDivisions,
    verticalDivisions,
    bufferSize,
    wallThickness,
    showFoot
  } = settings;
  const createdBoxes: THREE.Object3D[] = [];

  const xCellSize = width / horizontalDivisions;
  const zCellSize = length / horizontalDivisions;
  const yCellSize = height / verticalDivisions;

  const halfWidth = width / 2;
  const halfLength = length / 2;
  
  // Calculate foot height if showing foot (for position adjustment)
  const footHeight = showFoot ? wallThickness * 1.5 : 0;

  // Create a box for each cell
  for (let y = 0; y < verticalDivisions; y++) {
    for (let x = 0; x < horizontalDivisions; x++) {
      for (let z = 0; z < horizontalDivisions; z++) {
        // Calculate box dimensions accounting for buffer
        // If showing foot, reduce box dimensions to ensure everything fits in cell
        const footScaleFactor = showFoot ? 0.9 : 1.0; // Adjust to 90% size to accommodate foot
        const boxWidth = (xCellSize - 2 * bufferSize) * footScaleFactor;
        const boxHeight = (yCellSize - 2 * bufferSize) * footScaleFactor;
        const boxDepth = (zCellSize - 2 * bufferSize) * footScaleFactor;
        
        // Calculate position for this box
        // If showing foot, adjust Y position upward to accommodate the foot
        const xPos = (x + 0.5) * xCellSize - halfWidth;
        const yPos = (y + 0.5) * yCellSize + (showFoot ? footHeight/2 : 0); 
        const zPos = (z + 0.5) * zCellSize - halfLength;

        // Use the createBox function with separate width, height, and depth
        const box = createBox(
          xPos,
          yPos,
          zPos,
          boxWidth,
          boxHeight,
          boxDepth,
          wallThickness,
          settings.borderRadius,
          settings.showFoot
        );

        // Add to group and track
        group.add(box);
        createdBoxes.push(box);
      }
    }
  }

  return createdBoxes;
}

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(true);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.LineSegments | null>(null);
  const cubeRef = useRef<THREE.Group | null>(null);
  const cubesRef = useRef<THREE.Object3D[]>([]);

  // Track maximum wall thickness
  const [maxWallThickness, setMaxWallThickness] = useState(30);

  // Grid settings and inputs
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    width: 100,
    length: 100,
    height: 50,
    horizontalDivisions: 2,
    verticalDivisions: 1,
    visible: true,
    color: 0x888888,
    bufferSize: 1, // Default 1mm buffer
    wallThickness: 2, // Default 2mm wall thickness (minimum allowed)
    borderRadius: 1, // Default 1mm border radius (slight rounding)
    showFoot: false, // Default no foot
  });

  const [inputs, setInputs] = useState({
    width: "100",
    length: "100",
    height: "50",
    horizontalDivisions: "2",
    verticalDivisions: "1",
    bufferSize: "1",
    wallThickness: "2",
    borderRadius: "1",
  });

  // Menu options
  const [menuOptions] = useState<MenuOption[]>([
    {
      id: "view",
      label: "View",
      children: [
        { id: "view-front", label: "Front" },
        { id: "view-top", label: "Top" },
        { id: "view-side", label: "Side" },
        { id: "view-iso", label: "Isometric", active: true },
      ],
    },
  ]);

  const updateGrid = (newSettings: GridSettings) => {
    if (!sceneRef.current || !gridRef.current) return;
  
    const settingsToApply = { ...newSettings };
  
    // Calculate cell sizes
    const xCellSize = settingsToApply.width / settingsToApply.horizontalDivisions;
    const zCellSize = settingsToApply.length / settingsToApply.horizontalDivisions;
    
    // Buffer size affects actual box dimensions within each cell
    const boxWidth = xCellSize - 2 * settingsToApply.bufferSize;
    const boxDepth = zCellSize - 2 * settingsToApply.bufferSize;
    
    // Calculate the maximum allowable wall thickness to match cubeUtils.ts calculation
    const calculatedMax = Math.floor(Math.min(boxWidth, boxDepth) / 3);
    const maxWallThicknessForCell = Math.min(calculatedMax, 20);
    const adjustedThickness = Math.min(
      Math.max(Math.round(settingsToApply.wallThickness), 2),
      maxWallThicknessForCell
    );
  
    settingsToApply.wallThickness = adjustedThickness;
    
    // Calculate safe border radius based on new dimensions
    const maxSafeBorderRadius = calculateMaxSafeBorderRadius(
      boxWidth,
      boxDepth,
      adjustedThickness
    );
    
    // Adjust the border radius if needed to stay within safe limits
    const safeRadius = Math.min(settingsToApply.borderRadius, maxSafeBorderRadius);
    settingsToApply.borderRadius = safeRadius;
  
    // Update max wall thickness state (used for input limits/display)
    setMaxWallThickness(maxWallThicknessForCell);
  
    // Dispose old grid
    sceneRef.current.remove(gridRef.current);
    gridRef.current.geometry.dispose();
    if (gridRef.current.material instanceof THREE.Material) {
      gridRef.current.material.dispose();
    }
  
    // Create new grid and update scene
    const newGrid = createBoundingGrid(settingsToApply);
    sceneRef.current.add(newGrid);
    gridRef.current = newGrid;
  
    // Update state and input fields
    setGridSettings(settingsToApply);
    setInputs((prev) => ({
      ...prev,
      wallThickness: adjustedThickness.toString(),
      borderRadius: safeRadius.toString() // Update border radius input to match actual value
    }));
  
    // Update boxes
    if (cubeRef.current) {
      populateGridCells(settingsToApply);
    }
    
  };

  const populateGridCells = (settings: GridSettings = gridSettings) => {
    if (!cubeRef.current) return;
    // Using our custom implementation instead of external utility
    cubesRef.current = createCubesForGrid(cubeRef.current, settings);
  };

  // Handle input blur to enforce limits when user finishes typing
  const handleInputBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    property: keyof GridSettings
  ) => {
    const inputValue = e.target.value;

    // Handle empty or invalid inputs
    if (
      inputValue === "" ||
      inputValue === "-" ||
      isNaN(parseFloat(inputValue))
    ) {
      // Set to minimum value
      const defaultValue =
        property === "bufferSize"
          ? "1"
          : property === "width" ||
            property === "length" ||
            property === "height"
          ? "10"
          : "1";
      setInputs((prev) => ({ ...prev, [property]: defaultValue }));
      return;
    }

    // Get the numeric value
    const numValue = parseFloat(inputValue);

    // Apply limits based on property type
    let snappedValue = inputValue;

    // Apply limits only on blur, not during typing
    if (
      property === "width" ||
      property === "length" ||
      property === "height"
    ) {
      // Dimensions: 10mm to 1000mm
      if (numValue < 10) {
        snappedValue = "10";
      } else if (numValue > 1000) {
        snappedValue = "1000";
      }

      // When width or length changes, recalculate max wall thickness
      if (property === "width" || property === "length") {
        // If the wall thickness is currently at max, we need to update it when width/length changes
        const newWidth = property === "width" ? numValue : gridSettings.width;
        const newLength =
          property === "length" ? numValue : gridSettings.length;
        const newMin = Math.min(newWidth, newLength);
        const newMaxThickness = Math.floor(newMin / 3);
        setMaxWallThickness(newMaxThickness);

        // If current wall thickness exceeds new max, adjust it
        if (gridSettings.wallThickness > newMaxThickness) {
          setInputs((prev) => ({
            ...prev,
            wallThickness: newMaxThickness.toString(),
          }));
        }
      }
    } else if (property === "bufferSize") {
      // Buffer: 1mm to 20mm
      if (numValue < 1) {
        snappedValue = "1";
      } else if (numValue > 20) {
        snappedValue = "20";
      }
    } else if (property === "borderRadius") {
      // Border radius: 0mm to 30mm
      if (numValue < 0) {
        snappedValue = "0";
      } else if (numValue > 30) {
        snappedValue = "30";
      }
    } else if (property === "wallThickness") {
      // Wall thickness: 2mm to max (based on box dimensions)
      // Use the state variable for max thickness

      // Round the input value to the nearest mm
      let roundedValue = Math.round(numValue);

      if (roundedValue < 2) {
        snappedValue = "2";
      } else if (roundedValue > maxWallThickness) {
        snappedValue = maxWallThickness.toString();
      } else {
        // Use the rounded value
        snappedValue = roundedValue.toString();
      }
    } else if (property === "verticalDivisions") {
      // Vertical: 1 to 6
      const intValue = Math.floor(numValue);
      if (intValue < 1) {
        snappedValue = "1";
      } else if (intValue > 6) {
        snappedValue = "6";
      } else {
        snappedValue = intValue.toString();
      }
    } else if (property === "horizontalDivisions") {
      // Horizontal: 1 to 16
      const intValue = Math.floor(numValue);
      if (intValue < 1) {
        snappedValue = "1";
      } else if (intValue > 16) {
        snappedValue = "16";
      } else {
        snappedValue = intValue.toString();
      }
    }

    // Update the input with the snapped value
    setInputs((prev) => ({ ...prev, [property]: snappedValue }));

    // Update the grid with the valid value
    const validValue = parseFloat(snappedValue);
    if (!isNaN(validValue) && validValue > 0) {
      const newSettings = { ...gridSettings, [property]: validValue };
      updateGrid(newSettings);

      // For wall thickness and border radius, make sure the input field shows the actual applied value
      // which might be adjusted in updateGrid
      if (
        (property === "wallThickness" && newSettings.wallThickness !== validValue) ||
        (property === "borderRadius" && newSettings.borderRadius !== validValue)
      ) {
        setInputs((prev) => ({
          ...prev,
          [property]: newSettings[property].toString(),
        }));
      }
    }
  };

  // Handle wall thickness specifically
  const handleWallThicknessChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let inputValue = e.target.value;

    // Update the input display immediately for a responsive feel
    setInputs((prev) => ({ ...prev, wallThickness: inputValue }));

    // Don't process empty inputs or incomplete values
    if (
      inputValue === "" ||
      inputValue === "-" ||
      isNaN(parseFloat(inputValue))
    ) {
      return;
    }

    // Convert to number and validate
    let numValue = parseFloat(inputValue);
    numValue = Math.round(numValue); // Round to nearest integer

    // Apply constraints (min 2mm, max based on dimensions)
    numValue = Math.max(2, Math.min(numValue, maxWallThickness));

    // Always update to make sure changes take effect
    // Apply the new wall thickness
    const newSettings = { ...gridSettings, wallThickness: numValue };
    updateGrid(newSettings);
  };

  
  // Handle border radius specifically
  const handleBorderRadiusChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let inputValue = e.target.value;

    // Update the input display immediately for a responsive feel
    setInputs((prev) => ({ ...prev, borderRadius: inputValue }));

    // Don't process empty inputs or incomplete values
    if (
      inputValue === "" ||
      inputValue === "-" ||
      isNaN(parseFloat(inputValue))
    ) {
      return;
    }

    // Convert to number and validate
    let numValue = parseFloat(inputValue);
    
    // Must be at least 1mm
    numValue = Math.max(1, numValue);

    // Round to whole numbers for consistency
    numValue = Math.round(numValue);
    
    // Get the cell dimensions for the current grid
    const cellWidth = gridSettings.width / gridSettings.horizontalDivisions - 2 * gridSettings.bufferSize;
    const cellDepth = gridSettings.length / gridSettings.horizontalDivisions - 2 * gridSettings.bufferSize;
    
    // Calculate the maximum safe border radius based on current dimensions
    const maxSafeRadius = calculateMaxSafeBorderRadius(
      cellWidth, 
      cellDepth,
      gridSettings.wallThickness
    );
    
    // Ensure radius doesn't exceed the safe maximum
    const safeValue = Math.min(numValue, maxSafeRadius);
    
    // Update the settings with a properly typed object
    const updatedSettings: GridSettings = {
      ...gridSettings,
      borderRadius: safeValue
    };
    
    // Apply the updated settings
    setGridSettings(updatedSettings);
    
    // Update the input field to show the actual applied value
    setInputs(prev => ({
      ...prev,
      borderRadius: safeValue.toString()
    }));
    
    // Update the 3D rendering
    if (cubeRef.current) {
      populateGridCells(updatedSettings);
    }
  };

  // Generic handler for other inputs
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    property: keyof GridSettings
  ) => {
    // Special cases for wall thickness and border radius
    if (property === "wallThickness") {
      handleWallThicknessChange(e);
      return;
    } else if (property === "borderRadius") {
      handleBorderRadiusChange(e);
      return;
    }

    // Regular handling for other properties
    let inputValue = e.target.value;

    // Update the input value immediately
    setInputs((prev) => ({ ...prev, [property]: inputValue }));

    // Don't try to parse empty inputs or inputs that are just a minus sign
    if (inputValue === "" || inputValue === "-") {
      return;
    }

    // Skip validation if the input isn't a valid number
    if (isNaN(parseFloat(inputValue))) {
      return;
    }

    // Only update the grid if the value is within valid range
    let validValue = parseFloat(inputValue);
    let isValid = true;

    // Check if the value is within range for the property
    if (
      property === "width" ||
      property === "length" ||
      property === "height"
    ) {
      if (validValue < 10 || validValue > 1000) {
        isValid = false;
      }
    } else if (property === "bufferSize") {
      if (validValue < 1 || validValue > 20) {
        isValid = false;
      }
    } else if (property === "borderRadius") {
      // Round to the nearest integer
      validValue = Math.round(validValue);
      
      // Get the minimum cell dimensions for the current grid
      const cellWidth = gridSettings.width / gridSettings.horizontalDivisions - 2 * gridSettings.bufferSize;
      const cellDepth = gridSettings.length / gridSettings.horizontalDivisions - 2 * gridSettings.bufferSize;
      
      // Calculate the maximum safe border radius based on current dimensions
      const maxSafeRadius = calculateMaxSafeBorderRadius(
        cellWidth, 
        cellDepth,
        gridSettings.wallThickness
      );
      
      // Constrain input value between 1mm and the max safe value
      const constrained = Math.max(1, Math.min(validValue, maxSafeRadius));
      
      // Set the input field to show the constrained value
      setInputs(prev => ({
        ...prev,
        borderRadius: constrained.toString()
      }));
      
      // Update grid settings with a properly typed object
      const updatedSettings: GridSettings = {
        ...gridSettings,
        borderRadius: constrained
      };
      setGridSettings(updatedSettings);
      
      // Update 3D rendering
      if (cubeRef.current) {
        populateGridCells(updatedSettings);
      }
      
      // Skip normal processing
      return;
    } else if (property === "verticalDivisions") {
      if (validValue < 1 || validValue > 6 || !Number.isInteger(validValue)) {
        isValid = false;
      } else {
        validValue = Math.floor(validValue);
      }
    } else if (property === "horizontalDivisions") {
      if (validValue < 1 || validValue > 16 || !Number.isInteger(validValue)) {
        isValid = false;
      } else {
        validValue = Math.floor(validValue);
      }
    }

    // Only update the grid if the value is valid
    if (isValid && validValue > 0) {
      const newSettings = { ...gridSettings, [property]: validValue };
      updateGrid(newSettings);
    }
  };

  const handleViewOptionClick = (optionId: string) => {
    if (!cameraRef.current || !controlsRef.current) return;

    const currentDistance = cameraRef.current.position.length();
    let newPosition;

    switch (optionId) {
      case "view-front":
        newPosition = new THREE.Vector3(0, 0, 1);
        break;
      case "view-top":
        newPosition = new THREE.Vector3(0, 1, 0);
        break;
      case "view-side":
        newPosition = new THREE.Vector3(1, 0, 0);
        break;
      default:
        newPosition = new THREE.Vector3(1, 1, 1).normalize();
        break;
    }

    newPosition.multiplyScalar(currentDistance);
    cameraRef.current.position.copy(newPosition);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.update();
  };

  const toggleGridVisibility = () => {
    if (!gridRef.current) return;
    gridRef.current.visible = !gridRef.current.visible;
    setGridSettings((prev) => ({ ...prev, visible: gridRef.current!.visible }));
  };

  const changeGridColor = () => {
    if (!gridRef.current) return;
    const material = gridRef.current.material as THREE.LineBasicMaterial;
    const colors = [0x888888, 0x444444, 0xaaaaaa, 0x0088ff];
    const currentColorHex = material.color.getHex();
    const nextIndex = (colors.indexOf(currentColorHex) + 1) % colors.length;

    material.color.setHex(colors[nextIndex]);
    setGridSettings((prev) => ({ ...prev, color: colors[nextIndex] }));
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    camera.position.set(100, 200, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 5000; // Increased from 1000 to allow zooming out farther
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

    // Calculate and set initial max wall thickness
    const minDimension = Math.min(gridSettings.width, gridSettings.length);
    const initialMaxThickness = Math.floor(minDimension / 3);
    setMaxWallThickness(initialMaxThickness);

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
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }

      // Clean up resources
      if (gridRef.current) {
        gridRef.current.geometry.dispose();
        if (gridRef.current.material instanceof THREE.Material) {
          gridRef.current.material.dispose();
        }
      }

      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Controls panel */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 5,
          backgroundColor: "rgba(40, 40, 40, 0.8)",
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          color: "white",
          minWidth: "200px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Panel header with toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontWeight: "bold",
          }}
        >
          <span>Bounding Box</span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            {menuOpen ? "−" : "+"}
          </button>
        </div>

        {menuOpen && (
          <div style={{ padding: "12px" }}>
            {/* Dimension inputs */}
            <div style={{ marginBottom: "12px" }}>
              {[
                "width",
                "length",
                "height",
                "horizontalDivisions",
                "verticalDivisions",
                "bufferSize",
                "wallThickness",
                "borderRadius",
              ].map((field) => (
                <div
                  key={field}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <label>
                      {field === "bufferSize"
                        ? "Buffer Size (mm)"
                        : field === "wallThickness"
                        ? "Wall Thickness (mm)"
                        : field.charAt(0).toUpperCase() +
                          field.slice(1) +
                          (field.includes("width") ||
                          field.includes("length") ||
                          field.includes("height")
                            ? " (mm)"
                            : "")}
                    </label>
                  </div>
                  {field === "wallThickness" ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "70px",
                      }}
                    >
                      <input
                        type="number"
                        name="wallThickness"
                        value={inputs[field as keyof typeof inputs]}
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            field as keyof typeof gridSettings
                          )
                        }
                        onBlur={(e) =>
                          handleInputBlur(e, field as keyof typeof gridSettings)
                        }
                        min="2"
                        max={maxWallThickness.toString()}
                        style={{
                          width: "70px",
                          backgroundColor: "rgba(60, 60, 60, 0.8)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "white",
                          padding: "4px",
                        }}
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={inputs[field as keyof typeof inputs]}
                      onChange={(e) =>
                        handleInputChange(e, field as keyof typeof gridSettings)
                      }
                      onBlur={(e) =>
                        handleInputBlur(e, field as keyof typeof gridSettings)
                      }
                      min={
                        field === "bufferSize"
                          ? "1"
                          : field === "borderRadius"
                          ? "0"
                          : field.includes("Divisions")
                          ? "1"
                          : "10"
                      }
                      max={
                        field === "bufferSize"
                          ? "20"
                          : field === "verticalDivisions"
                          ? "6"
                          : field.includes("Divisions")
                          ? "16"
                          : "1000"
                      }
                      style={{
                        width: "70px",
                        backgroundColor: "rgba(60, 60, 60, 0.8)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "white",
                        padding: "4px",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* View options */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                View
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {menuOptions[0].children?.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => handleViewOptionClick(view.id)}
                    style={{
                      backgroundColor: view.active
                        ? "rgba(74, 158, 255, 0.3)"
                        : "rgba(60, 60, 60, 0.8)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: view.active ? "#4a9eff" : "white",
                      padding: "4px 8px",
                      cursor: "pointer",
                      flex: "1 0 auto",
                    }}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid options */}
            {/* Box options */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Box Features
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  id="show-foot"
                  checked={gridSettings.showFoot}
                  onChange={(e) => {
                    const updatedSettings = {
                      ...gridSettings,
                      showFoot: e.target.checked
                    };
                    setGridSettings(updatedSettings);
                    populateGridCells(updatedSettings);
                  }}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="show-foot" style={{ cursor: "pointer" }}>
                  Add Foot to Boxes
                </label>
              </div>
            </div>
          
            {/* Grid options */}
            <div>
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Grid
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={toggleGridVisibility}
                  style={{
                    backgroundColor: gridSettings.visible
                      ? "rgba(74, 158, 255, 0.3)"
                      : "rgba(60, 60, 60, 0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: gridSettings.visible ? "#4a9eff" : "white",
                    padding: "4px 8px",
                    flex: "1",
                  }}
                >
                  {gridSettings.visible ? "Hide" : "Show"}
                </button>
                <button
                  onClick={changeGridColor}
                  style={{
                    backgroundColor: "rgba(60, 60, 60, 0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    padding: "4px 8px",
                    flex: "1",
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
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
