// cubeUtils.ts
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
export function createBox(x: number, y: number, z: number, width: number, height: number, depth: number, wallThickness?: number, borderRadius: number = 0, showFoot: boolean = false) {
  const group = new THREE.Group();
  
  // Mark this as a box for identification during export
  group.userData.isBox = true;
  group.userData.dimensions = {
    width: width,
    height: height,
    depth: depth
  };
  group.userData.borderRadius = borderRadius;
  
  // Calculate the maximum allowable wall thickness (1/3 of the smallest dimension to ensure a hole remains)
  // With a hard limit of 20mm regardless of box size
  const calculatedMax = Math.min(width, depth) / 3;
  const maxAllowableThickness = Math.min(calculatedMax, 20); // Hard limit of 20mm
  
  // Calculate default wall thickness based on the smallest dimension
  const calculatedThickness = Math.min(width, height, depth) * 0.05;
  
  // Use provided wall thickness or default, but ensure it's within limits
  let thickness = wallThickness !== undefined ? wallThickness : calculatedThickness;
  
  // Ensure thickness is at least 2mm
  thickness = Math.max(thickness, 2);
  
  // Round thickness to the nearest mm
  thickness = Math.round(thickness);
  
  // Ensure thickness doesn't exceed the maximum allowable value
  thickness = Math.min(thickness, Math.floor(maxAllowableThickness));
  
  // Check if any dimension exceeds the standard printer bed size (200mm)
  const PRINTER_BED_SIZE = 200; // Standard printer bed size in mm
  const exceedsPrinterBed = width > PRINTER_BED_SIZE || height > PRINTER_BED_SIZE || depth > PRINTER_BED_SIZE;
  
  // Check if wall thickness is too thin (less than 2mm)
  const MIN_WALL_THICKNESS = 2; // Minimum wall thickness in mm
  const wallTooThin = thickness < MIN_WALL_THICKNESS;
  
  // Check if wall thickness is too large (would close the hole)
  const wallTooThick = thickness > maxAllowableThickness;
  
  // Determine box color based on validation checks
  let boxColor;
  if (exceedsPrinterBed || wallTooThin || wallTooThick) {
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
  
  // Calculate a safe maximum radius (45% of the smallest dimension)
  // This prevents boxes from collapsing when the radius is too large
  const smallestDimension = Math.min(width, depth) / 2;
  const safeMaxRadius = smallestDimension * 0.9;
  
  // Use the border radius provided but cap it at the safe maximum
  const effectiveRadius = Math.min(borderRadius, safeMaxRadius);
  
  // Determine foot dimensions if needed
  const footHeight = showFoot ? thickness * 1.5 : 0;
  // Make feet slightly smaller (by 1mm) than the inner dimensions
  const footWidth = showFoot ? width - 2 * thickness - 1 : 0;
  const footDepth = showFoot ? depth - 2 * thickness - 1 : 0;
  
  // If radius is 0, use regular box geometries for better performance
  if (effectiveRadius <= 0) {
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
  } else {
    // Use rounded corners approach for walls and floor
    
    // Create outer shape (with rounded corners) for both walls and floor
    const outerShape = new THREE.Shape();
    outerShape.moveTo(-width/2 + effectiveRadius, -depth/2);
    outerShape.lineTo(width/2 - effectiveRadius, -depth/2);
    outerShape.quadraticCurveTo(width/2, -depth/2, width/2, -depth/2 + effectiveRadius);
    outerShape.lineTo(width/2, depth/2 - effectiveRadius);
    outerShape.quadraticCurveTo(width/2, depth/2, width/2 - effectiveRadius, depth/2);
    outerShape.lineTo(-width/2 + effectiveRadius, depth/2);
    outerShape.quadraticCurveTo(-width/2, depth/2, -width/2, depth/2 - effectiveRadius);
    outerShape.lineTo(-width/2, -depth/2 + effectiveRadius);
    outerShape.quadraticCurveTo(-width/2, -depth/2, -width/2 + effectiveRadius, -depth/2);
    
    // Create inner shape (hole) with rounded corners
    const innerShape = new THREE.Shape();
    const innerWidth = width - 2 * thickness;
    const innerDepth = depth - 2 * thickness;
    // Ensure inner shape has non-zero dimensions
    if (innerWidth > 0 && innerDepth > 0) {
      // Calculate safe inner radius that's proportional to the outer radius
      // but also accounts for wall thickness to prevent inner/outer curve collision
      const innerWidthProportion = innerWidth / width;
      const innerDepthProportion = innerDepth / depth;
      const scaleFactor = Math.min(innerWidthProportion, innerDepthProportion);
      
      // Apply the scale factor but ensure it's never negative
      const innerRadius = Math.max(0, effectiveRadius * scaleFactor * 0.9);
      
      innerShape.moveTo(-innerWidth/2 + innerRadius, -innerDepth/2);
      innerShape.lineTo(innerWidth/2 - innerRadius, -innerDepth/2);
      innerShape.quadraticCurveTo(innerWidth/2, -innerDepth/2, innerWidth/2, -innerDepth/2 + innerRadius);
      innerShape.lineTo(innerWidth/2, innerDepth/2 - innerRadius);
      innerShape.quadraticCurveTo(innerWidth/2, innerDepth/2, innerWidth/2 - innerRadius, innerDepth/2);
      innerShape.lineTo(-innerWidth/2 + innerRadius, innerDepth/2);
      innerShape.quadraticCurveTo(-innerWidth/2, innerDepth/2, -innerWidth/2, innerDepth/2 - innerRadius);
      innerShape.lineTo(-innerWidth/2, -innerDepth/2 + innerRadius);
      innerShape.quadraticCurveTo(-innerWidth/2, -innerDepth/2, -innerWidth/2 + innerRadius, -innerDepth/2);
      
      outerShape.holes.push(innerShape);
    }
    
    // Create bottom shape with rounded corners (for the floor)
    const bottomShape = new THREE.Shape();
    bottomShape.moveTo(-width/2 + effectiveRadius, -depth/2);
    bottomShape.lineTo(width/2 - effectiveRadius, -depth/2);
    bottomShape.quadraticCurveTo(width/2, -depth/2, width/2, -depth/2 + effectiveRadius);
    bottomShape.lineTo(width/2, depth/2 - effectiveRadius);
    bottomShape.quadraticCurveTo(width/2, depth/2, width/2 - effectiveRadius, depth/2);
    bottomShape.lineTo(-width/2 + effectiveRadius, depth/2);
    bottomShape.quadraticCurveTo(-width/2, depth/2, -width/2, depth/2 - effectiveRadius);
    bottomShape.lineTo(-width/2, -depth/2 + effectiveRadius);
    bottomShape.quadraticCurveTo(-width/2, -depth/2, -width/2 + effectiveRadius, -depth/2);
    
    // Extrude the bottom shape slightly to create the floor
    const floorExtrudeSettings = {
      steps: 1,
      depth: thickness,
      bevelEnabled: false
    };
    
    const floorGeometry = new THREE.ExtrudeGeometry(bottomShape, floorExtrudeSettings);
    const floor = new THREE.Mesh(floorGeometry, boxMaterial);
    
    // Rotate and position the floor
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -height/2;
    
    // Add floor to group
    group.add(floor);
    
    // Create the walls by making separate extrusion that goes up from the floor
    const wallExtrudeSettings = {
      steps: 1,
      depth: height - thickness,
      bevelEnabled: false
    };
    
    // Create extruded geometry for walls
    const wallGeometry = new THREE.ExtrudeGeometry(outerShape, wallExtrudeSettings);
    const walls = new THREE.Mesh(wallGeometry, boxMaterial);
    
    // Rotate the walls to make them stand upright
    walls.rotation.x = -Math.PI / 2;
    
    // Position the walls correctly on top of the floor
    walls.position.y = -height/2 + thickness;
    
    // Add walls to group
    group.add(walls);
  }
  
  // Add foot if requested
  if (showFoot && footHeight > 0) {
    // Always create a fully rounded foot regardless of box corner radius
    
    // Calculate a good radius for the foot (fully rounded corners)
    const footCornerRadius = Math.min(footWidth, footDepth) / 2;
    
    // For very small feet, use a cylinder instead of a rounded rectangle
    if (footWidth <= footCornerRadius * 2 && footDepth <= footCornerRadius * 2) {
      // Create a circular foot using a cylinder (a flat puck shape)
      const radius = Math.min(footWidth, footDepth) / 2;
      
      // Create cylinder with height along Y axis (which is correct for our foot)
      // The cylinder will be flat like a coin/puck under the box
      const footGeometry = new THREE.CylinderGeometry(radius, radius, footHeight, 24);
      const foot = new THREE.Mesh(footGeometry, boxMaterial);
      
      // Position the foot under the box
      // Note: cylinder's default orientation has height along Y axis, 
      // which is exactly what we want for a foot
      foot.position.y = -height/2 - footHeight/2;
      
      group.add(foot);
    } else {
      // Create a rounded rectangle foot with maximally rounded corners
      const footShape = new THREE.Shape();
      
      // Ensure we have space for the corners
      const adjustedFootWidth = Math.max(footWidth, footCornerRadius * 2);
      const adjustedFootDepth = Math.max(footDepth, footCornerRadius * 2);
      
      // Draw the rounded rectangle shape
      footShape.moveTo(-adjustedFootWidth/2 + footCornerRadius, -adjustedFootDepth/2);
      footShape.lineTo(adjustedFootWidth/2 - footCornerRadius, -adjustedFootDepth/2);
      footShape.quadraticCurveTo(adjustedFootWidth/2, -adjustedFootDepth/2, adjustedFootWidth/2, -adjustedFootDepth/2 + footCornerRadius);
      footShape.lineTo(adjustedFootWidth/2, adjustedFootDepth/2 - footCornerRadius);
      footShape.quadraticCurveTo(adjustedFootWidth/2, adjustedFootDepth/2, adjustedFootWidth/2 - footCornerRadius, adjustedFootDepth/2);
      footShape.lineTo(-adjustedFootWidth/2 + footCornerRadius, adjustedFootDepth/2);
      footShape.quadraticCurveTo(-adjustedFootWidth/2, adjustedFootDepth/2, -adjustedFootWidth/2, adjustedFootDepth/2 - footCornerRadius);
      footShape.lineTo(-adjustedFootWidth/2, -adjustedFootDepth/2 + footCornerRadius);
      footShape.quadraticCurveTo(-adjustedFootWidth/2, -adjustedFootDepth/2, -adjustedFootWidth/2 + footCornerRadius, -adjustedFootDepth/2);
      
      // Extrude the foot shape
      const footExtrudeSettings = {
        steps: 1,
        depth: footHeight,
        bevelEnabled: false
      };
      
      const footGeometry = new THREE.ExtrudeGeometry(footShape, footExtrudeSettings);
      const foot = new THREE.Mesh(footGeometry, boxMaterial);
      
      // Position the foot correctly
      foot.rotation.x = -Math.PI / 2;
      foot.position.y = -height/2 - footHeight;
      
      group.add(foot);
    }
  }
  
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
 * Calculates the maximum safe border radius for a box with given dimensions
 * @param width Width of the box
 * @param depth Depth of the box
 * @param wallThickness Wall thickness of the box
 * @returns Maximum safe border radius in mm
 */
export function calculateMaxSafeBorderRadius(width: number, depth: number, wallThickness: number): number {
  // The smallest dimension determines the max radius
  const smallestDimension = Math.min(width, depth) / 2;
  
  // Calculate safe maximum (90% of half the smallest dimension)
  // This prevents boxes from collapsing when the radius is too large
  const safeMaxRadius = Math.max(0, smallestDimension * 0.9 - wallThickness);
  
  // Round to the nearest integer for consistency
  return Math.floor(safeMaxRadius);
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