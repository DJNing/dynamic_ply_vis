import * as THREE from 'three';
import { PointCloudData, Hierarchy } from '../types';

// A simple PLY parser specifically for the format described
export const parsePLY = async (file: File): Promise<PointCloudData> => {
  const buffer = await file.arrayBuffer();
  const textDecoder = new TextDecoder();
  const headerText = textDecoder.decode(buffer.slice(0, 2000)); // Read first 2KB for header
  
  const headerEndIndex = headerText.indexOf('end_header');
  if (headerEndIndex === -1) throw new Error("Invalid PLY file: No end_header found");
  
  // Parse header to find vertex count and property offsets
  const vertexMatch = headerText.match(/element vertex (\d+)/);
  if (!vertexMatch) throw new Error("Could not find element vertex count");
  const vertexCount = parseInt(vertexMatch[1], 10);
  
  const isBinary = headerText.includes('format binary_little_endian');
  const startOffset = headerEndIndex + 11; // "end_header\n" length is 11

  if (!isBinary) {
    throw new Error("Only binary_little_endian PLY is supported in this demo parser.");
  }

  // Construct buffers
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const groupIds = new Float32Array(vertexCount);
  const partIds = new Float32Array(vertexCount);

  const dataView = new DataView(buffer, startOffset);
  
  // Stride calculation based on the requested format:
  // x, y, z (float 4) = 12
  // r, g, b (uchar 1) = 3
  // group_id (int 4) = 4
  // part_id (int 4) = 4
  // Total stride = 23 bytes
  const STRIDE = 23;

  for (let i = 0; i < vertexCount; i++) {
    const base = i * STRIDE;
    
    // Safety check
    if (startOffset + base + STRIDE > buffer.byteLength) break;

    // Pos
    const x = dataView.getFloat32(base + 0, true);
    const y = dataView.getFloat32(base + 4, true);
    const z = dataView.getFloat32(base + 8, true);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Color (Normalize 0-255 to 0-1)
    const r = dataView.getUint8(base + 12);
    const g = dataView.getUint8(base + 13);
    const b = dataView.getUint8(base + 14);

    colors[i * 3] = r / 255.0;
    colors[i * 3 + 1] = g / 255.0;
    colors[i * 3 + 2] = b / 255.0;

    // IDs
    const groupId = dataView.getInt32(base + 15, true);
    const partId = dataView.getInt32(base + 19, true);
    
    groupIds[i] = groupId;
    partIds[i] = partId;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('group_id', new THREE.BufferAttribute(groupIds, 1));
  geometry.setAttribute('part_id', new THREE.BufferAttribute(partIds, 1));
  
  geometry.computeBoundingSphere();
  // Center geometry for easier viewing
  geometry.center();

  return { geometry, count: vertexCount };
};

export const generateExampleData = (): PointCloudData => {
  const countPerPart = 5000;
  const groups = 2; // Group 0 (Src), Group 1 (Tgt)
  const partsPerGroup = 2;
  const totalPoints = countPerPart * groups * partsPerGroup;

  const positions = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);
  const groupIds = new Float32Array(totalPoints);
  const partIds = new Float32Array(totalPoints);

  let idx = 0;
  for (let g = 0; g < groups; g++) {
    for (let p = 0; p < partsPerGroup; p++) {
      // Center of the cluster
      const cx = (g - 0.5) * 4;
      const cy = (p - 0.5) * 4;
      const cz = 0;

      for (let i = 0; i < countPerPart; i++) {
        // Random sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 1.5 * Math.cbrt(Math.random());
        
        let x = cx + r * Math.sin(phi) * Math.cos(theta);
        let y = cy + r * Math.sin(phi) * Math.sin(theta);
        let z = cz + r * Math.cos(phi);

        const isTarget = g === 1;

        // If target (Group 1), apply some slight transform to make it interesting
        if (isTarget) {
          x += (Math.random() - 0.5) * 0.2;
          y += (Math.random() - 0.5) * 0.2;
          z += (Math.random() - 0.5) * 0.2;
        }

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Base colors - Make them darker/vibrant for light background
        if (isTarget) {
          // Blue/Indigo shade (Vibrant) for Target (Group 1)
          colors[idx * 3] = 0.1 + Math.random() * 0.1; 
          colors[idx * 3 + 1] = 0.3 + Math.random() * 0.2;
          colors[idx * 3 + 2] = 0.8 + Math.random() * 0.2; 
        } else {
           // Red/Orange shade (Vibrant) for Source (Group 0)
          colors[idx * 3] = 0.9 + Math.random() * 0.1; 
          colors[idx * 3 + 1] = 0.1 + Math.random() * 0.2;
          colors[idx * 3 + 2] = 0.1 + Math.random() * 0.1;
        }

        groupIds[idx] = g;
        partIds[idx] = p;

        idx++;
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('group_id', new THREE.BufferAttribute(groupIds, 1));
  geom.setAttribute('part_id', new THREE.BufferAttribute(partIds, 1));
  geom.computeBoundingSphere();
  
  return { geometry: geom, count: totalPoints };
};

export const extractHierarchy = (data: PointCloudData): Hierarchy => {
  const groups = data.geometry.getAttribute('group_id');
  const parts = data.geometry.getAttribute('part_id');
  
  if (!groups || !parts) return {};

  const hierarchy: Record<number, Set<number>> = {};
  const count = data.count;
  const gArr = groups.array;
  const pArr = parts.array;

  for (let i = 0; i < count; i++) {
    const g = gArr[i];
    const p = pArr[i];
    if (hierarchy[g] === undefined) {
      hierarchy[g] = new Set();
    }
    hierarchy[g].add(p);
  }

  const result: Hierarchy = {};
  Object.keys(hierarchy).forEach(k => {
    const key = parseInt(k);
    result[key] = Array.from(hierarchy[key]).sort((a, b) => a - b);
  });
  
  return result;
};