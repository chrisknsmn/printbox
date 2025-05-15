import * as THREE from 'three';

/**
 * Creates a simple open-top box (cube without top face)
 */
export function createBox(x: number, y: number, z: number, size: number) {
  const group = new THREE.Group();
  
  // Basic dimensions
  const width = size * 0.8;
  const height = size * 0.95;
  const depth = size * 0.8;
  const thickness = size * 0.05;
  
  // Materials
  const greenMaterial = new THREE.MeshStandardMaterial({
    color: 0x40ff40,
    roughness: 0.3,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  
  // Create box without top (5 faces: bottom, left, right, front, back)
  // Bottom face
  const bottomGeometry = new THREE.BoxGeometry(width, thickness, depth);
  const bottom = new THREE.Mesh(bottomGeometry, greenMaterial);
  bottom.position.y = -height/2 + thickness/2;
  
  // Left wall
  const leftGeometry = new THREE.BoxGeometry(thickness, height, depth);
  const leftWall = new THREE.Mesh(leftGeometry, greenMaterial);
  leftWall.position.x = -width/2 + thickness/2;
  
  // Right wall
  const rightGeometry = new THREE.BoxGeometry(thickness, height, depth);
  const rightWall = new THREE.Mesh(rightGeometry, greenMaterial);
  rightWall.position.x = width/2 - thickness/2;
  
  // Front wall
  const frontGeometry = new THREE.BoxGeometry(width - 2*thickness, height, thickness);
  const frontWall = new THREE.Mesh(frontGeometry, greenMaterial);
  frontWall.position.z = depth/2 - thickness/2;
  
  // Back wall
  const backGeometry = new THREE.BoxGeometry(width - 2*thickness, height, thickness);
  const backWall = new THREE.Mesh(backGeometry, greenMaterial);
  backWall.position.z = -depth/2 + thickness/2;
  
  // Add all faces to the group
  group.add(bottom, leftWall, rightWall, frontWall, backWall);
  
  // Position the box
  group.position.set(x, y, z);
  
  return group;
}

/**
 * Creates a grid of boxes
 */
export function createBoxGrid(parentGroup: THREE.Group, grid: any) {
  // Clear existing boxes
  while (parentGroup.children.length > 0) {
    parentGroup.remove(parentGroup.children[0]);
  }
  
  // Calculate dimensions
  const cellWidth = grid.width / grid.horizontalDivisions;
  const cellHeight = grid.height / grid.verticalDivisions;
  const cellLength = grid.length / grid.horizontalDivisions;
  
  const startX = -grid.width / 2 + cellWidth / 2;
  const startY = 0;
  const startZ = -grid.length / 2 + cellLength / 2;
  
  const boxes = [];
  
  // Create boxes in grid
  for (let y = 0; y < grid.verticalDivisions; y++) {
    for (let x = 0; x < grid.horizontalDivisions; x++) {
      for (let z = 0; z < grid.horizontalDivisions; z++) {
        const posX = startX + x * cellWidth;
        // Adjust Y position to center the box vertically within the cell
        // Add half the cell height to ensure the box is centered
        const posY = startY + y * cellHeight + cellHeight / 2;
        const posZ = startZ + z * cellLength;
        
        const cellSize = Math.min(cellWidth, cellHeight, cellLength);
        const box = createBox(posX, posY, posZ, cellSize);
        
        parentGroup.add(box);
        boxes.push(box);
      }
    }
  }
  
  return boxes;
}