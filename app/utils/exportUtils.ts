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
  // In PrintBox, the bottom of the box is usually at the lowest Y coordinate
  const bottomY = bbox.min.y;
  
  // Keep track of geometry so we can reposition everything together
  const allGeometries: THREE.BufferGeometry[] = [];
  const allMeshes: THREE.Mesh[] = [];
  
  // Traverse all meshes in the object
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Create a new geometry with all transformations applied
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      
      // Store for later repositioning
      allGeometries.push(geometry);
      
      // Create a new mesh with the transformed geometry
      const mesh = new THREE.Mesh(geometry, child.material);
      
      // Reset transformations since they are now baked into the geometry
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.updateMatrix();
      
      allMeshes.push(mesh);
      exportGroup.add(mesh);
    }
  });
  
  const rotateXMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  
  allGeometries.forEach((geometry) => {
    // Rotate around X axis to get Z-up orientation with open face at top
    geometry.applyMatrix4(rotateXMatrix);
    
    // Now the bottom of the box should be at the minimum Z value
    // Translate so that the bottom face is at Z=0
    const translationMatrix = new THREE.Matrix4().makeTranslation(0, 0, -bottomY);
    geometry.applyMatrix4(translationMatrix);
  });
  
  // Update all meshes
  allMeshes.forEach((mesh) => {
    mesh.updateMatrix();
  });
  
  return exportGroup;
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
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      const matrixWorld = child.matrixWorld;
      
      // Get position attribute
      const position = geometry.getAttribute('position');
      
      // Process all triangles
      for (let i = 0; i < position.count; i += 3) {
        // Calculate face normal
        const a = new THREE.Vector3().fromBufferAttribute(position, i);
        const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
        
        // Apply world matrix
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
  });
  
  output += 'endsolid exported';
  return output;
}

// Generate binary STL
function generateBinarySTL(object: THREE.Object3D): Uint8Array {
  let triangles = 0;
  
  // First count the number of triangles
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      const position = geometry.getAttribute('position');
      triangles += position.count / 3;
    }
  });
  
  // Allocate buffer (header + triangle count + triangles)
  // STL format: 80-byte header, 4-byte triangle count, 50 bytes per triangle
  const bufferSize = 84 + (50 * triangles);
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
  
  // Write triangles
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      const position = geometry.getAttribute('position');
      const matrixWorld = child.matrixWorld;
      
      // Process all triangles
      for (let i = 0; i < position.count; i += 3) {
        // Get vertices
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
        
        // Write attribute byte count (2 bytes) - usually zero
        writer.writeUint16(0);
      }
    }
  });
  
  return new Uint8Array(buffer);
}

// Helper class for binary writing
class BinaryWriter {
  private view: DataView;
  private offset: number;
  
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
