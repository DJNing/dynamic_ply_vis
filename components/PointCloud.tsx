import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PointCloudData, VisMode, AnimationState } from '../types';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../constants';

interface PointCloudProps {
  data: PointCloudData;
  visMode: VisMode;
  animState: AnimationState;
}

const PointCloud: React.FC<PointCloudProps> = ({ data, visMode, animState }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uMode: { value: visMode },
    uDisplacement: { value: new THREE.Vector3(0, 0, 0) },
    uAnim1Progress: { value: 0 },
    uSelectedGroup: { value: -1 },
    uSelectedPart: { value: -1 },
    uPartMatrix: { value: new THREE.Matrix4() },
    uAnim2Progress: { value: 0 },
  }), []);

  // Update uniforms that change frequently or on props change
  useFrame(() => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uMode.value = visMode;

    // Apply Animation 1 State
    materialRef.current.uniforms.uDisplacement.value.set(
      animState.displacement[0],
      animState.displacement[1],
      animState.displacement[2]
    );
    materialRef.current.uniforms.uAnim1Progress.value = animState.anim1Progress;

    // Apply Animation 2 State
    materialRef.current.uniforms.uSelectedGroup.value = animState.selectedGroup;
    materialRef.current.uniforms.uSelectedPart.value = animState.selectedPart;
    
    // Animation 2 Logic: Identity -> SE3
    // Start State (t=0): The Original State (Identity)
    const qStart = new THREE.Quaternion(); // Identity
    const posStart = new THREE.Vector3(0, 0, 0); // Identity

    // End State (t=1): The Transformed State (SE3)
    const qEnd = new THREE.Quaternion();
    const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(animState.targetSE3.rotation[0]),
        THREE.MathUtils.degToRad(animState.targetSE3.rotation[1]),
        THREE.MathUtils.degToRad(animState.targetSE3.rotation[2]),
        'XYZ'
    );
    qEnd.setFromEuler(euler);
    const posEnd = new THREE.Vector3(
        animState.targetSE3.translation[0],
        animState.targetSE3.translation[1],
        animState.targetSE3.translation[2]
    );

    // Interpolate
    const t = animState.anim2Progress;

    const currentQ = qStart.clone().slerp(qEnd, t);
    const currentPos = posStart.clone().lerp(posEnd, t);

    const matrix = new THREE.Matrix4();
    matrix.compose(currentPos, currentQ, new THREE.Vector3(1, 1, 1));
    
    materialRef.current.uniforms.uPartMatrix.value.copy(matrix);
    materialRef.current.uniforms.uAnim2Progress.value = t;
  });

  return (
    <points geometry={data.geometry} scale={[animState.globalScale, animState.globalScale, animState.globalScale]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent={true}
        depthTest={true}
        depthWrite={true}
      />
    </points>
  );
};

export default PointCloud;