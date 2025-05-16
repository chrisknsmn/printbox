import * as THREE from 'three';

/**
 * Creates a simple open-top box (cube without top face)
 * @param x X position of the box
 * @param y Y position of the box
 * @param z Z position of the box
 * @param width Width of the box
 * @param height Height of the box
 * @param depth Depth of the box
 * @param wallThickness Optional wall thickness in mm (defaults to 5% of smallest dimension)
 * @returns THREE.Group containing the box mesh
 */
export function createBox(x: number, y: number, z: number, width: number, height: number, depth: number, wallThickness?: number) {
  const group = new THREE.Group();
  
  // Calculate wall thickness based on the smallest dimension or use provided value
  const calculatedThickness = Math.min(width, height, depth) * 0.05;
  const thickness = wallThickness !== undefined ? wallThickness : calculatedThickness;
  
  // Check if any dimension exceeds the standard printer bed size (200mm)
  const PRINTER_BED_SIZE = 200; // Standard printer bed size in mm
  const exceedsPrinterBed = width > PRINTER_BED_SIZE || height > PRINTER_BED_SIZE || depth > PRINTER_BED_SIZE;
  
  // Check if wall thickness is too thin (less than 2mm)
  const MIN_WALL_THICKNESS = 2; // Minimum wall thickness in mm
  const wallTooThin = thickness < MIN_WALL_THICKNESS;
  
  // Determine box color based on validation checks
  let boxColor;
  if (exceedsPrinterBed || wallTooThin) {
    boxColor = 0xff4040; // Red for invalid boxes
  } else {
    boxColor = 0x40ff40; // Green for valid boxes
  }
  
  // Materials
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: boxColor,
    roughness: 0.3,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  
  // Create box without top (5 faces: bottom, left, right, front, back)
  // Bottom face
  const bottomGeometry = new THREE.BoxGeometry(width, thickness, depth);
  const bottom = new THREE.Mesh(bottomGeometry, boxMaterial);
  bottom.position.y = -height/2 + thickness/2;
  
  // Left wall
  const leftGeometry = new THREE.BoxGeometry(thickness, height, depth);
  const leftWall = new THREE.Mesh(leftGeometry, boxMaterial);
  leftWall.position.x = -width/2 + thickness/2;
  
  // Right wall
  const rightGeometry = new THREE.BoxGeometry(thickness, height, depth);
  const rightWall = new THREE.Mesh(rightGeometry, boxMaterial);
  rightWall.position.x = width/2 - thickness/2;
  
  // Front wall
  const frontGeometry = new THREE.BoxGeometry(width - 2*thickness, height, thickness);
  const frontWall = new THREE.Mesh(frontGeometry, boxMaterial);
  frontWall.position.z = depth/2 - thickness/2;
  
  // Back wall
  const backGeometry = new THREE.BoxGeometry(width - 2*thickness, height, thickness);
  const backWall = new THREE.Mesh(backGeometry, boxMaterial);
  backWall.position.z = -depth/2 + thickness/2;
  
  // Add all faces to the group
  group.add(bottom, leftWall, rightWall, frontWall, backWall);
  
  // Position the box
  group.position.set(x, y, z);
  
  return group;
}

/**
 * Legacy support for old createBox function signature
 */
export function createBoxLegacy(x: number, y: number, z: number, size: number) {
  return createBox(x, y, z, size * 0.8, size * 0.95, size * 0.8);
}

/**
 * Creates a grid of boxes with exactly one box per cell
 * @param parentGroup The THREE.Group to add boxes to
 * @param grid Grid settings with dimensions and divisions
 * @returns Array of created boxes
 */
export function createBoxGrid(parentGroup: THREE.Group, grid: any) {
  // Remove all existing boxes from the parent group
  while (parentGroup.children.length > 0) {
    parentGroup.remove(parentGroup.children[0]);
  }
  
  // Calculate dimensions for each cell
  const cellWidth = grid.width / grid.horizontalDivisions;
  const cellHeight = grid.height / grid.verticalDivisions;
  const cellLength = grid.length / grid.horizontalDivisions;
  
  // Define buffer in mm
  const bufferSize = 1; // 1mm buffer on all sides
  
  // Calculate starting positions to center boxes in cells
  const startX = -grid.width / 2 + cellWidth / 2;
  const startY = 0;
  const startZ = -grid.length / 2 + cellLength / 2;
  
  const boxes = [];
  
  // Create boxes in grid - one box per cell
  for (let y = 0; y < grid.verticalDivisions; y++) {
    for (let x = 0; x < grid.horizontalDivisions; x++) {
      for (let z = 0; z < grid.horizontalDivisions; z++) {
        // Calculate the center position of this cell
        const posX = startX + x * cellWidth;
        const posY = startY + y * cellHeight + cellHeight / 2;
        const posZ = startZ + z * cellLength;
        
        // Calculate box dimensions with buffer
        const boxWidth = cellWidth - 2 * bufferSize;
        const boxHeight = cellHeight - 2 * bufferSize;
        const boxDepth = cellLength - 2 * bufferSize;
        
        // Create box with maximum possible dimensions
        const box = createBox(posX, posY, posZ, boxWidth, boxHeight, boxDepth);
        
        parentGroup.add(box);
        boxes.push(box);
      }
    }
  }
  
  // Log the number of boxes created for debugging
  console.log(`Grid created with ${boxes.length} boxes (${grid.horizontalDivisions}×${grid.verticalDivisions}×${grid.horizontalDivisions} cells)`);
  
  return boxes;
}