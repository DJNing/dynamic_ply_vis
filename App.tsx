import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { PointCloudData, VisMode, AnimationState, Hierarchy } from './types';
import { generateExampleData, parsePLY, extractHierarchy } from './utils/plyHelper';
import PointCloud from './components/PointCloud';
import ControlPanel from './components/ControlPanel';

// Recorder Wrapper
const Recorder = ({ recording, setRecording }: { recording: boolean, setRecording: (b: boolean) => void }) => {
  const capturerRef = useRef<CCapture | null>(null);

  useEffect(() => {
    if (recording) {
      // @ts-ignore
      if (typeof CCapture !== 'undefined') {
        try {
          // Switched to 'webm' format as it is more reliable in browser environments 
          // (uses native MediaRecorder or internal encoder) and doesn't require external worker files like GIF.
          capturerRef.current = new CCapture({ 
            format: 'webm', 
            framerate: 30, 
            quality: 100,
            name: 'cloud_anim',
            verbose: true
          });
          capturerRef.current.start();
          console.log("Recording started...");
        } catch (e) {
          console.error("Failed to start recorder", e);
          alert("Could not start recording. See console for details.");
          setRecording(false);
        }
      } else {
        alert("CCapture.js not loaded. Cannot record.");
        setRecording(false);
      }
    } else {
      if (capturerRef.current) {
        capturerRef.current.stop();
        capturerRef.current.save();
        capturerRef.current = null;
        console.log("Recording saved.");
      }
    }
  }, [recording]);

  useFrame(({ gl }) => {
    if (recording && capturerRef.current) {
      capturerRef.current.capture(gl.domElement);
    }
  });

  return null;
};

// Animation Logic Helper
const AnimationController = ({ 
  state, 
  setState 
}: { 
  state: AnimationState, 
  setState: React.Dispatch<React.SetStateAction<AnimationState>> 
}) => {
  useFrame((_, delta) => {
    if (state.isPlaying1) {
      setState(prev => {
        const newProgress = Math.min(prev.anim1Progress + delta * 0.5, 1); // 2 seconds duration
        return {
          ...prev,
          anim1Progress: newProgress,
          isPlaying1: newProgress < 1
        };
      });
    }

    if (state.isPlaying2) {
      setState(prev => {
        const newProgress = Math.min(prev.anim2Progress + delta * 0.5, 1); // 2 seconds duration
        return {
          ...prev,
          anim2Progress: newProgress,
          isPlaying2: newProgress < 1
        };
      });
    }
  });
  return null;
};

const App: React.FC = () => {
  const [srcData, setSrcData] = useState<PointCloudData | null>(null);
  const [tgtData, setTgtData] = useState<PointCloudData | null>(null);
  const [visMode, setVisMode] = useState<VisMode>(VisMode.RGB);
  const [hierarchy, setHierarchy] = useState<Hierarchy>({});
  const [bgColor, setBgColor] = useState<string>('#d4d4d4');
  
  const [animState, setAnimState] = useState<AnimationState>({
    displacement: [5, 0, 0],
    anim1Progress: 0,
    anim2Progress: 0,
    selectedGroup: 0,
    selectedPart: 0,
    targetSE3: { rotation: [0, 45, 0], translation: [2, 2, 0] },
    isPlaying1: false,
    isPlaying2: false,
    isRecording: false
  });

  // Extract hierarchy when srcData changes
  useEffect(() => {
    if (srcData) {
      const h = extractHierarchy(srcData);
      setHierarchy(h);
      
      // Auto-select first available group and part
      const sortedGroups = Object.keys(h).map(Number).sort((a, b) => a - b);
      if (sortedGroups.length > 0) {
        const firstGroup = sortedGroups[0];
        const firstParts = h[firstGroup];
        if (firstParts.length > 0) {
          setAnimState(prev => ({
            ...prev,
            selectedGroup: firstGroup,
            selectedPart: firstParts[0]
          }));
        }
      }
    } else {
      setHierarchy({});
    }
  }, [srcData]);

  // Load example data on mount
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleImport = async (files: FileList) => {
    if (files.length < 1) return;
    try {
      // Very basic logic: First file is src, second is tgt if exists
      const src = await parsePLY(files[0]);
      setSrcData(src);
      
      if (files.length > 1) {
        const tgt = await parsePLY(files[1]);
        setTgtData(tgt);
      }
    } catch (e) {
      console.error(e);
      alert("Error parsing PLY files. Ensure they match the required binary format.");
    }
  };

  const handleGenerate = () => {
    const { src, tgt } = generateExampleData();
    setSrcData(src);
    setTgtData(tgt);
  };

  const startAnim1 = () => {
    setAnimState(prev => ({ ...prev, isPlaying1: true, anim1Progress: 0 }));
  };

  const resetAnim1 = () => {
    setAnimState(prev => ({ ...prev, isPlaying1: false, anim1Progress: 0 }));
  };

  const startAnim2 = () => {
    setAnimState(prev => ({ ...prev, isPlaying2: true, anim2Progress: 0 }));
  };

  const resetAnim2 = () => {
    setAnimState(prev => ({ ...prev, isPlaying2: false, anim2Progress: 0 }));
  };

  const toggleRecording = () => {
    setAnimState(prev => ({ ...prev, isRecording: !prev.isRecording }));
  };

  return (
    <div className="flex w-full h-screen" style={{ backgroundColor: bgColor }}>
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [10, 10, 10], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
          <color attach="background" args={[bgColor]} />
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1.2} />
          
          <OrbitControls makeDefault />
          {/* Grid adapts slightly based on simple heuristic or just stays neutral */}
          <Grid infiniteGrid fadeDistance={50} sectionColor={bgColor === '#000000' ? '#444' : '#ffffff'} cellColor={bgColor === '#000000' ? '#222' : '#a3a3a3'} />
          
          <AnimationController state={animState} setState={setAnimState} />
          <Recorder recording={animState.isRecording} setRecording={(b) => setAnimState(p => ({...p, isRecording: b}))} />

          {srcData && (
            <PointCloud 
              data={srcData} 
              visMode={visMode} 
              animState={animState} 
              isSource={true} 
            />
          )}

          {tgtData && (
            <PointCloud 
              data={tgtData} 
              visMode={visMode} 
              animState={animState} 
              isSource={false} 
            />
          )}
        </Canvas>

        {/* Legend / Overlay - Updated for Light Mode */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-white/80 p-2 rounded text-xs text-gray-900 backdrop-blur-sm shadow-sm border border-gray-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 bg-red-600 rounded-full opacity-80"></span> Source (Reddish)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-600 rounded-full opacity-80"></span> Target (Blueish)
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <ControlPanel 
        onImport={handleImport}
        onGenerate={handleGenerate}
        visMode={visMode}
        setVisMode={setVisMode}
        animState={animState}
        setAnimState={setAnimState}
        hierarchy={hierarchy}
        startAnim1={startAnim1}
        startAnim2={startAnim2}
        resetAnim1={resetAnim1}
        resetAnim2={resetAnim2}
        exportGif={toggleRecording}
        bgColor={bgColor}
        setBgColor={setBgColor}
      />
    </div>
  );
};

export default App;