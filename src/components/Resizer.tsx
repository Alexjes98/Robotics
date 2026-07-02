import React from 'react';

interface ResizerProps {
  type: 'col' | 'row';
  onResize: (delta: number) => void;
}

export const Resizer: React.FC<ResizerProps> = ({ type, onResize }) => {
  const isCol = type === 'col';

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.classList.add('is-resizing');
    let lastPos = isCol ? e.clientX : e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = isCol ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - lastPos;
      lastPos = currentPos;
      onResize(delta);
    };

    const onMouseUp = () => {
      document.body.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className={`resizer-${type}`}
      style={{ userSelect: 'none' }}
    />
  );
};

export default Resizer;
