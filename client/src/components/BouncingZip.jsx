import { useState } from "react";
import { motion } from "framer-motion";
import winrarIcon from "../assets/winrar_crop.png";

const BouncingZip = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`flex flex-col justify-center items-center h-screen p-1 rounded-lg`}
      animate={{
        y: [0, -10, 0],
        scale: isHovered ? 1.1 : 1,
      }}
      transition={{ repeat: Infinity, duration: 1.25 }}
      style={{ cursor: "pointer", width: 100, height: 100 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      // whileTap={{ scale: 0.9 }}
    >
      <motion.img
        src={winrarIcon}
        alt="Zip File"
        className="w-full h-full"
        // animate={{ scale: isHovered ? 1.1 : 1 }}
        whileTap={{ scale: 0.9 }}
      />

      <div className="pt-2 pl-1">
        <motion.div
          className="border border-blue-500 rounded-full px-2 text-blue-500"
          animate={{
            backgroundColor: isHovered ? "rgba(59, 130, 246)" : "transparent",
            color: isHovered ? "white" : "black",
          }}
          whileTap={{
            backgroundColor: "rgba(59, 130, 246, 0.7)",
          }}
        >
          <motion.p
            animate={{ color: isHovered ? "white" : "black" }}
            className="font-mono"
          >
            jesal.zip
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BouncingZip;
