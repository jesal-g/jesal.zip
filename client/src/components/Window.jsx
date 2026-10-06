import { motion, useDragControls } from "framer-motion";

const Window = ({ width, height, title, children }) => {
  const dragControls = useDragControls();

  const startDrag = (event) => {
    dragControls.start(event);
  };

  return (
    <motion.div
      className={`relative bg-white rounded-lg shadow-lg ${width} ${height} overflow-hidden cursor-default`}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={{
        top: -window.innerHeight,
        left: -window.innerWidth,
        right: window.innerWidth,
        bottom: window.innerHeight,
      }}
    >
      <div
        className="flex items-center justify-between bg-gray-800 text-white px-3 py-1 rounded-t-lg cursor-move"
        onPointerDown={startDrag}
      >
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <span className="text-sm font-mono">{title}</span>
        <div></div>
      </div>
      <div className="bg-white p-4 h-full" style={{ userSelect: "text" }}>
        {children}
      </div>
    </motion.div>
  );
};

export default Window;
