import React, { useState } from 'react';
import { VisMode, AnimationState, SE3Transform, Hierarchy } from '../types';
import { Upload, Play, Download, Settings, RefreshCw, Box, Layers, Eye, RotateCcw, ChevronRight, ChevronDown, Palette, Trash2 } from 'lucide-react';

interface ControlPanelProps {
  onImport: (files: FileList) => void;
  onGenerate: () => void;
  onClear: () => void;
  visMode: VisMode;
  setVisMode: (m: VisMode) => void;
  animState: AnimationState;
  setAnimState: React.Dispatch<React.SetStateAction<AnimationState>>;
  hierarchy: Hierarchy;
  startAnim1: () => void;
  startAnim2: () => void;
  resetAnim1: () => void;
  resetAnim2: () => void;
  exportGif: () => void;
  bgColor: string;
  setBgColor: (c: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onImport,
  onGenerate,
  onClear,
  visMode,
  setVisMode,
  animState,
  setAnimState,
  hierarchy,
  startAnim1,
  startAnim2,
  resetAnim1,
  resetAnim2,
  exportGif,
  bgColor,
  setBgColor
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

  const updateSE3 = (field: keyof SE3Transform, axis: number, val: number) => {
    setAnimState(prev => {
      const newSE3 = { ...prev.targetSE3 };
      if (field === 'rotation' || field === 'translation') {
        const arr = [...newSE3[field]] as [number, number, number];
        arr[axis] = val;
        newSE3[field] = arr;
      }
      // Set Anim 2 to 1 (End State / SE3) so we see the transform immediately while editing
      return { ...prev, targetSE3: newSE3, anim2Progress: 1, isPlaying2: false };
    });
  };

  const handleSelect = (groupId: number, partId: number) => {
    setAnimState(prev => ({
        ...prev,
        selectedGroup: groupId,
        selectedPart: partId,
        // Set Anim 2 to 1 on selection change to preview the current SE3 settings on the new part
        anim2Progress: 1,
        isPlaying2: false
    }));
  };

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const updateDisplacement = (axis: number, val: number) => {
    setAnimState(prev => {
        const d = [...prev.displacement] as [number, number, number];
        d[axis] = val;
        // Reset Anim 1 to 0 so we see the displacement immediately
        return { ...prev, displacement: d, anim1Progress: 0, isPlaying1: false };
      });
  };

  return (
    <div className="w-80 h-full bg-gray-900 text-gray-100 p-4 overflow-y-auto flex flex-col gap-6 border-l border-gray-700 shadow-xl custom-scrollbar">
      <div>
        <h1 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
          <Box className="w-6 h-6" /> CloudAnim
        </h1>
        
        {/* Data Input */}
        <div className="mb-4 space-y-2">
           <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Data Source</h2>
           <div className="flex gap-2">
            <label className="flex-1 bg-gray-800 hover:bg-gray-700 p-2 rounded cursor-pointer flex items-center justify-center gap-2 border border-gray-600 transition overflow-hidden whitespace-nowrap">
              <Upload size={16} />
              <span className="text-xs">Upload PLY</span>
              <input 
                type="file" 
                accept=".ply" 
                className="hidden" 
                onChange={(e) => e.target.files && onImport(e.target.files)} 
              />
            </label>
            <button 
              onClick={onGenerate}
              className="flex-1 bg-gray-800 hover:bg-gray-700 p-2 rounded flex items-center justify-center gap-2 border border-gray-600 transition overflow-hidden whitespace-nowrap"
            >
              <RefreshCw size={16} />
              <span className="text-xs">Example</span>
            </button>
            <button 
              onClick={onClear}
              className="px-3 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded transition flex items-center justify-center"
              title="Clear All Data"
            >
              <Trash2 size={16} />
            </button>
           </div>
        </div>

        {/* Visualization Mode */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Visualization</h2>
            <div className="flex items-center gap-2" title="Background Color">
               <Palette size={14} className="text-gray-500" />
               <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-600 relative">
                 <input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)} 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                 />
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: VisMode.RGB, label: 'RGB', icon: Eye },
              { mode: VisMode.GROUP_ID, label: 'Group', icon: Layers },
              { mode: VisMode.PART_ID, label: 'Part', icon: Box },
            ].map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setVisMode(mode)}
                className={`p-2 rounded text-xs flex flex-col items-center gap-1 transition ${visMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Animation 1: Displacement */}
      <div className="border-t border-gray-700 pt-4">
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Settings size={14} /> Anim 1: Displacement
        </h2>
        <div className="space-y-3">
          {['X', 'Y', 'Z'].map((axis, i) => (
            <div key={axis} className="flex items-center gap-2">
              <span className="text-xs w-4 text-gray-500">{axis}</span>
              <input
                type="range"
                min="-10" max="10" step="0.1"
                value={animState.displacement[i]}
                onChange={(e) => updateDisplacement(i, parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs w-8 text-right font-mono">{animState.displacement[i].toFixed(1)}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={startAnim1}
              disabled={animState.isPlaying1}
              className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition ${animState.isPlaying1 ? 'bg-gray-700 text-gray-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}
            >
              <Play size={16} fill="currentColor" /> {animState.isPlaying1 ? 'Playing...' : 'Play'}
            </button>
            <button
              onClick={resetAnim1}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
              title="Reset Animation"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Animation 2: SE3 */}
      <div className="border-t border-gray-700 pt-4">
        <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Box size={14} /> Anim 2: SE3 Transform
        </h2>
        
        {/* Tree View Selection */}
        <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Select Part to Transform</label>
            <div className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto border border-gray-700 custom-scrollbar">
                {Object.keys(hierarchy).length === 0 ? (
                    <div className="text-xs text-gray-500 p-2 text-center">No hierarchy found</div>
                ) : (
                    Object.entries(hierarchy).map(([gId, parts]) => {
                        const groupId = parseInt(gId);
                        const isExpanded = expandedGroups.has(groupId);
                        // Cast parts to number[] to avoid unknown type error
                        const sortedParts = [...(parts as number[])].sort((a,b) => a-b);
                        
                        return (
                            <div key={groupId} className="mb-1 select-none">
                                <div 
                                  onClick={() => toggleGroup(groupId)}
                                  className="text-xs font-bold text-gray-300 hover:text-white cursor-pointer py-1 flex items-center gap-1"
                                >
                                   {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                   <Layers size={12} className="text-blue-500" /> 
                                   Group {groupId}
                                </div>
                                {isExpanded && (
                                  <div className="pl-5 flex flex-wrap gap-1 mt-1 border-l border-gray-700 ml-1.5 py-1">
                                      {sortedParts.map(pId => (
                                          <button
                                              key={pId}
                                              onClick={() => handleSelect(groupId, pId)}
                                              className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                                                  animState.selectedGroup === groupId && animState.selectedPart === pId
                                                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm shadow-purple-500/50'
                                                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                                              }`}
                                          >
                                              <Box size={10} />
                                              Part {pId}
                                          </button>
                                      ))}
                                  </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-right">
                Selected: G{animState.selectedGroup} / P{animState.selectedPart}
            </div>
        </div>

        {/* Translation Controls */}
        <div className="mb-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400">Target Translation</h3>
            {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={`t-${axis}`} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-gray-500">{axis}</span>
                    <input
                        type="number" step="0.5"
                        value={animState.targetSE3.translation[i]}
                        onChange={(e) => updateSE3('translation', i, parseFloat(e.target.value))}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:border-purple-500"
                    />
                </div>
            ))}
        </div>

        {/* Rotation Controls */}
        <div className="mb-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400">Target Rotation (Deg)</h3>
            {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={`r-${axis}`} className="flex items-center gap-2">
                    <span className="text-xs w-4 text-gray-500">{axis}</span>
                    <input
                        type="number" step="5"
                        value={animState.targetSE3.rotation[i]}
                        onChange={(e) => updateSE3('rotation', i, parseFloat(e.target.value))}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:border-purple-500"
                    />
                </div>
            ))}
        </div>

        <div className="flex gap-2">
          <button
              onClick={startAnim2}
              disabled={animState.isPlaying2}
              className={`flex-1 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition ${animState.isPlaying2 ? 'bg-gray-700 text-gray-500' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
            >
              <Play size={16} fill="currentColor" /> {animState.isPlaying2 ? 'Playing...' : 'Play'}
          </button>
          <button
              onClick={resetAnim2}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
              title="Reset Animation"
            >
              <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-700 pt-4">
         <button
            onClick={exportGif}
            className={`w-full py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition ${animState.isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'}`}
          >
            <Download size={16} /> {animState.isRecording ? 'Recording (Click to Save)' : 'Record Video'}
          </button>
      </div>
    </div>
  );
};

export default ControlPanel;