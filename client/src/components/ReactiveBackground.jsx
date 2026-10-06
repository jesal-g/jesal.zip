import { useRef } from "react";
import Sketch from "react-p5";

// const colors = [
//   [6, 141, 157], // blue-munsell
//   [83, 89, 154], // ultra-violet
//   [109, 157, 197], // air-superiority-blue
//   [128, 222, 217], // tiffany-blue
//   [174, 236, 239], // celeste
// ];

// const colors = [
//   [255, 82, 82], // radical-red
//   [255, 195, 0], // yellow-orange
//   [83, 109, 254], // blue-jeans
//   [0, 255, 133], // spring-green
//   [255, 64, 129], // wild-strawberry
// ];

const colors = [
  [255, 99, 71], // tomato
  [255, 140, 0], // dark-orange
  [255, 215, 0], // golds
  [50, 205, 50], // lime-green
  [0, 191, 255], // deep-sky-blue
];

const ReactiveBackground = () => {
  const step = 0.09; // increase -> more blocky effect
  const speed = 0.02; // increase -> more dynamic effect
  const intensity = 50; // increase -> pronounced artifacts
  const scale = 50;

  const widthRef = useRef(window.innerWidth);
  const heightRef = useRef(window.innerHeight);
  const rowsRef = useRef(Math.floor(heightRef.current / scale) + 2);
  const colsRef = useRef(Math.floor(widthRef.current / scale) + 2);
  const toffRef = useRef(0); // noise time offset; a ref so re-renders don't reset it

  const setScale = () => {
    widthRef.current = window.innerWidth;
    heightRef.current = window.innerHeight;
    rowsRef.current = Math.floor(heightRef.current / scale) + 2;
    colsRef.current = Math.floor(widthRef.current / scale) + 2;
  };

  const setup = (p5, canvasParentRef) => {
    setScale();
    p5.createCanvas(widthRef.current, heightRef.current).parent(
      canvasParentRef
    );
    p5.frameRate(18);
  };

  // react-p5 wires this to p5's own resize hook, which is removed with the sketch
  const windowResized = (p5) => {
    setScale();
    p5.resizeCanvas(widthRef.current, heightRef.current);
  };

  const draw = (p5) => {
    p5.clear();

    for (let y = 0; y <= rowsRef.current; y++) {
      for (let x = 0; x <= colsRef.current; x++) {
        const xoff = x * step;
        const yoff = y * step;
        const r = p5.noise(xoff, yoff, toffRef.current) * intensity;
        const color =
          colors[Math.floor(p5.map(r, 0, intensity, 0, colors.length))];

        p5.push();
        p5.noStroke();
        p5.translate((x - 1) * scale, (y - 1) * scale);
        p5.fill(color[0], color[1], color[2], 100);
        p5.rect(0, 0, scale, scale);
        p5.pop();
      }
    }

    toffRef.current += speed;
  };

  return <Sketch setup={setup} draw={draw} windowResized={windowResized} />;
};

export default ReactiveBackground;
