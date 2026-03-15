import { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

export function SceneSection({ potreeViewer }) {
  const [pointClouds, setPointClouds] = useState([]);

  useEffect(() => {
    if (!potreeViewer) return;

    const updatePointClouds = () => {
      const pcs = potreeViewer.scene.pointclouds.map(pc => ({
        name: pc.name,
        visible: pc.visible,
        instance: pc
      }));
      setPointClouds(pcs);
    };

    updatePointClouds();

    // Poll for changes
    const interval = setInterval(updatePointClouds, 1000);
    return () => clearInterval(interval);
  }, [potreeViewer]);

  const toggleVisibility = (pc) => {
    pc.instance.visible = !pc.instance.visible;
    setPointClouds(prev => 
      prev.map(p => 
        p.instance === pc.instance 
          ? { ...p, visible: !p.visible }
          : p
      )
    );
  };

  return (
    <div className="scene-section">
      <div className="scene-tree">
        {pointClouds.length === 0 ? (
          <p className="empty-message">No point clouds loaded</p>
        ) : (
          pointClouds.map((pc, index) => (
            <div key={index} className="scene-item">
              <span className="scene-item-name">{pc.name}</span>
              <button
                className="scene-item-toggle"
                onClick={() => toggleVisibility(pc)}
                aria-label={pc.visible ? 'Hide' : 'Show'}
                title={pc.visible ? 'Hide' : 'Show'}
              >
                {pc.visible ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
