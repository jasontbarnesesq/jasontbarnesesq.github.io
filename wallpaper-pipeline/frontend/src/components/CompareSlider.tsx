import { useState } from "react";

interface Props {
  beforeSrc: string;
  afterSrc: string;
}

export default function CompareSlider({ beforeSrc, afterSrc }: Props) {
  const [position, setPosition] = useState(50);

  return (
    <div className="compare">
      <div className="compare__frame">
        <img src={afterSrc} alt="Processed" className="compare__image" />
        <div className="compare__clip" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img src={beforeSrc} alt="Original" className="compare__image" />
        </div>
        <div className="compare__handle" style={{ left: `${position}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="compare__slider"
      />
    </div>
  );
}
