import { useState } from "react";
import "./styles.css";
import BouncingZip from "./components/BouncingZip";
import UncompressWindow from "./components/UncompressWindow";
import ReadMeWindow from "./components/ReadMeWindow";
import ImageWindow from "./components/ImageWindow";
import ProjectsWindow from "./components/ProjectsWindow";
import ReactiveBackground from "./components/ReactiveBackground";
import { motion } from "framer-motion";

const App = () => {
  const [isUncompressing, setIsUncompressing] = useState(false);
  const [isUncompressed, setIsUncompressed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleZipClick = () => {
    setIsUncompressing(true);
    setTimeout(() => {
      setIsUncompressing(false);
      setIsUncompressed(true);
      setIsLoading(false);
    }, 3000);
  };

  const windowVariants = {
    hidden: { opacity: 0 },
    visible1: {
      opacity: 1,
      x: 0,
      transition: { duration: 2 },
    },
    visible2: {
      opacity: 1,
      x: 0,
      transition: { duration: 2 },
    },
    visible3: {
      opacity: 1,
      y: 0,
      transition: { duration: 2 },
    },
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {isUncompressing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3 }}
          className="absolute inset-0"
        >
          <ReactiveBackground />
        </motion.div>
      )}
      {isUncompressed && (
        <div className="absolute inset-0">
          <ReactiveBackground />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        {!isUncompressed && !isUncompressing && (
          <BouncingZip onClick={handleZipClick} />
        )}
        {isUncompressing && <UncompressWindow onComplete={() => {}} />}
        {isUncompressed && (
          <div className="absolute inset-0 overflow-y-auto flex justify-center p-4 md:p-4">
            {!isLoading && (
              <div className="grid grid-cols-1 gap-2 md:gap-2">
                <motion.div
                  initial={{ opacity: 0, x: -100 }}
                  animate="visible1"
                  variants={windowVariants}
                  className="flex justify-center p-2 md:p-0"
                >
                  <div className="w-full max-w-md">
                    <ReadMeWindow />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 100 }}
                  animate="visible2"
                  variants={windowVariants}
                  className="flex justify-center p-2 md:p-0"
                >
                  <div className="w-full max-w-md">
                    <ImageWindow />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 100 }}
                  animate="visible3"
                  variants={windowVariants}
                  className="flex justify-center p-2 md:mb-8"
                >
                  <div className="w-full max-w-md mb-4">
                    <ProjectsWindow />
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
