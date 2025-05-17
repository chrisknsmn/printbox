import * as THREE from 'three';

// Export object to STL format (binary or ASCII)
export function exportToSTL(object: THREE.Object3D, binary: boolean = true): string | Uint8Array {
  if (binary) {
    return generateBinarySTL(object);
  } else {
    return generateASCIISTL(object);
  }
}

// Create a filename based on box dimensions
export function createBoxFileName(box: THREE.Object3D): string {
  if (box.userData && box.userData.dimensions) {
    const dims = box.userData.dimensions;
    return `box_${dims.width}x${dims.height}x${dims.depth}_mm.stl`;
  }
  return 'box.stl';
}

// Create a properly oriented copy of the object for export
export function createOrientedObjectForExport(object: THREE.Object3D): THREE.Group {
  // Create a new group to hold our export-oriented geometry
  const exportGroup = new THREE.Group();
  
  // Clone the object to avoid modifying the original
  const clone = object.clone();
  
  // Apply any world transformations to the geometry
  clone.updateMatrixWorld(true);
  
  // Calculate the bounding box to determine object dimensions and position
  const bbox = new THREE.Box3().setFromObject(clone);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bbox.getCenter(center);
  bbox.getSize(size);
  
  // We need to find the bottom face of the box to ensure it's facing down (negative Y in this case)
  const bottomY = bbox.min.y;
  
  // Process meshes with preserved structure
  // This preserves the hierarchy and relative positions of complex parts like feet
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Clone the mesh to avoid modifying the original
      const meshClone = child.clone();
      
      // Preserve the original mesh's matrix and material
      meshClone.matrix.copy(child.matrix);
      meshClone.matrixAutoUpdate = false;
      
      // Add to export group while preserving hierarchy
      if (child.parent && child.parent !== clone) {
        // Find or create parent in the export group
        const parentInGroup = findOrCreateParent(exportGroup, child.parent, clone);
        parentInGroup.add(meshClone);
      } else {
        exportGroup.add(meshClone);
      }
    }
  });
  
  // Update world matrices to ensure proper transformations
  exportGroup.updateMatrixWorld(true);
  
  // Create a transformation matrix that rotates around X and translates to make bottom at Z=0
  const rotateXMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const translationMatrix = new THREE.Matrix4().makeTranslation(0, 0, -bottomY);
  const transformMatrix = new THREE.Matrix4().multiply(translationMatrix).multiply(rotateXMatrix);
  
  // Apply final transformation to the entire group
  exportGroup.applyMatrix4(transformMatrix);
  
  return exportGroup;
}

// Helper function to find or create a parent object in the export group
function findOrCreateParent(exportGroup: THREE.Group, parent: THREE.Object3D, originalRoot: THREE.Object3D): THREE.Object3D {
  // Create a path from the original root to the parent
  const path: THREE.Object3D[] = [];
  let current: THREE.Object3D | null = parent;
  
  while (current && current !== originalRoot) {
    path.unshift(current);
    current = current.parent || null;
  }
  
  // Now create the path in the export group
  let currentParent: THREE.Object3D = exportGroup;
  
  for (const node of path) {
    let found = false;
    
    // Check if this node already exists in currentParent
    currentParent.children.forEach((child) => {
      if (child.name === node.name) {
        currentParent = child;
        found = true;
      }
    });
    
    // If not found, create it
    if (!found) {
      const newNode = new THREE.Group();
      newNode.name = node.name;
      newNode.matrix.copy(node.matrix);
      newNode.matrixAutoUpdate = false;
      currentParent.add(newNode);
      currentParent = newNode;
    }
  }
  
  return currentParent;
}

// Trigger download of STL file
export function downloadSTL(stlData: string | Uint8Array, fileName: string): void {
  const blob = new Blob([stlData], {
    type: binary(stlData) ? 'application/octet-stream' : 'text/plain'
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  
  // Clean up
  URL.revokeObjectURL(link.href);
}

// Check if data is binary
function binary(data: string | Uint8Array): boolean {
  return data instanceof Uint8Array;
}

// Generate ASCII STL string
function generateASCIISTL(object: THREE.Object3D): string {
  let output = 'solid exported\n';
  
  // Update world matrices for all objects
  object.updateMatrixWorld(true);
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      const matrixWorld = child.matrixWorld;
      
      // Handle both indexed and non-indexed geometries
      if (geometry.index !== null) {
        // Handle indexed geometries
        const position = geometry.getAttribute('position');
        const index = geometry.index;
        
        for (let i = 0; i < index.count; i += 3) {
          const idx1 = index.getX(i);
          const idx2 = index.getX(i + 1);
          const idx3 = index.getX(i + 2);
          
          const a = new THREE.Vector3().fromBufferAttribute(position, idx1);
          const b = new THREE.Vector3().fromBufferAttribute(position, idx2);
          const c = new THREE.Vector3().fromBufferAttribute(position, idx3);
          
          // Apply world transformations
          a.applyMatrix4(matrixWorld);
          b.applyMatrix4(matrixWorld);
          c.applyMatrix4(matrixWorld);
          
          // Calculate normal (ensure winding order is correct)
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(c, b), 
              new THREE.Vector3().subVectors(a, b)
            )
            .normalize();
          
          // Write facet
          output += `facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
          output += `  outer loop\n`;
          output += `    vertex ${a.x} ${a.y} ${a.z}\n`;
          output += `    vertex ${b.x} ${b.y} ${b.z}\n`;
          output += `    vertex ${c.x} ${c.y} ${c.z}\n`;
          output += `  endloop\n`;
          output += `endfacet\n`;
        }
      } else {
        // Handle non-indexed geometries
        const position = geometry.getAttribute('position');
        
        for (let i = 0; i < position.count; i += 3) {
          const a = new THREE.Vector3().fromBufferAttribute(position, i);
          const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
          const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
          
          // Apply world transformations
          a.applyMatrix4(matrixWorld);
          b.applyMatrix4(matrixWorld);
          c.applyMatrix4(matrixWorld);
          
          // Calculate normal
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(c, b), 
              new THREE.Vector3().subVectors(a, b)
            )
            .normalize();
          
          // Write facet
          output += `facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
          output += `  outer loop\n`;
          output += `    vertex ${a.x} ${a.y} ${a.z}\n`;
          output += `    vertex ${b.x} ${b.y} ${b.z}\n`;
          output += `    vertex ${c.x} ${c.y} ${c.z}\n`;
          output += `  endloop\n`;
          output += `endfacet\n`;
        }
      }
    }
  });
  
  output += 'endsolid exported';
  return output;
}

// Generate binary STL
function generateBinarySTL(object: THREE.Object3D): Uint8Array {
  let triangles = 0;
  
  // First count the number of triangles accurately
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      
      // Handle indexed geometries properly
      if (geometry.index !== null) {
        triangles += geometry.index.count / 3;
      } else {
        const position = geometry.getAttribute('position');
        if (position && position.count > 0) {
          triangles += position.count / 3;
        }
      }
    }
  });
  
  // Larger safety factor for complex geometries with feet
  const safetyFactor = 2.0; // 100% extra space for complex geometries
  const safeTriangleCount = Math.ceil(triangles * safetyFactor);
  
  // Allocate buffer (header + triangle count + triangles)
  // STL format: 80-byte header, 4-byte triangle count, 50 bytes per triangle
  const bufferSize = 84 + (50 * safeTriangleCount);
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  const writer = new BinaryWriter(view);
  
  // Write header (80 bytes)
  const encoder = new TextEncoder();
  const header = encoder.encode('PrintBox STL export');
  for (let i = 0; i < 80; i++) {
    if (i < header.length) {
      view.setUint8(i, header[i]);
    } else {
      view.setUint8(i, 0);
    }
  }
  
  // Write number of triangles (4 bytes)
  writer.setOffset(80);
  writer.writeUint32(triangles);
  
  // Make sure all world matrices are updated
  object.updateMatrixWorld(true);
  
  // Write triangles
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      const matrixWorld = child.matrixWorld;
      
      // Handle both indexed and non-indexed geometries
      if (geometry.index !== null) {
        // Handle indexed geometries
        const position = geometry.getAttribute('position');
        const index = geometry.index;
        
        for (let i = 0; i < index.count; i += 3) {
          const idx1 = index.getX(i);
          const idx2 = index.getX(i + 1);
          const idx3 = index.getX(i + 2);
          
          const a = new THREE.Vector3().fromBufferAttribute(position, idx1);
          const b = new THREE.Vector3().fromBufferAttribute(position, idx2);
          const c = new THREE.Vector3().fromBufferAttribute(position, idx3);
          
          // Apply world transformations
          a.applyMatrix4(matrixWorld);
          b.applyMatrix4(matrixWorld);
          c.applyMatrix4(matrixWorld);
          
          // Calculate normal (ensure winding order is correct)
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(c, b), 
              new THREE.Vector3().subVectors(a, b)
            )
            .normalize();
          
          // Write the triangle data
          writeTriangleToSTL(writer, normal, a, b, c);
        }
      } else {
        // Handle non-indexed geometries
        const position = geometry.getAttribute('position');
        
        for (let i = 0; i < position.count; i += 3) {
          const a = new THREE.Vector3().fromBufferAttribute(position, i);
          const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
          const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
          
          // Apply world transformations
          a.applyMatrix4(matrixWorld);
          b.applyMatrix4(matrixWorld);
          c.applyMatrix4(matrixWorld);
          
          // Calculate normal
          const normal = new THREE.Vector3()
            .crossVectors(
              new THREE.Vector3().subVectors(c, b), 
              new THREE.Vector3().subVectors(a, b)
            )
            .normalize();
          
          // Write the triangle data
          writeTriangleToSTL(writer, normal, a, b, c);
        }
      }
    }
  });
  
  return new Uint8Array(buffer.slice(0, writer.offset));
}

// Helper function to write triangle data to STL
function writeTriangleToSTL(writer: BinaryWriter, normal: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void {
  // Skip degenerate triangles (zero area)
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const cross = new THREE.Vector3().crossVectors(ab, ac);
  
  if (cross.lengthSq() < 1e-10) {
    return; // Skip this triangle
  }
  
  // Write normal (12 bytes)
  writer.writeFloat32(normal.x);
  writer.writeFloat32(normal.y);
  writer.writeFloat32(normal.z);
  
  // Write vertices (36 bytes)
  writer.writeFloat32(a.x);
  writer.writeFloat32(a.y);
  writer.writeFloat32(a.z);
  
  writer.writeFloat32(b.x);
  writer.writeFloat32(b.y);
  writer.writeFloat32(b.z);
  
  writer.writeFloat32(c.x);
  writer.writeFloat32(c.y);
  writer.writeFloat32(c.z);
  
  // Write attribute byte count (2 bytes)
  writer.writeUint16(0);
}

// Helper class for binary writing
class BinaryWriter {
  private view: DataView;
  offset: number;
  
  constructor(view: DataView) {
    this.view = view;
    this.offset = 0;
  }
  
  setOffset(offset: number): void {
    this.offset = offset;
  }
  
  writeFloat32(value: number): void {
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }
  
  writeUint16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }
  
  writeUint32(value: number): void {
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }
}