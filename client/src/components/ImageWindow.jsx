import Window from "./Window";
import headshot from "../assets/headshot.jpg";

const ImageWindow = () => {
  return (
    <Window title="📷 me.jpg">
      <img src={headshot} alt="jesal headshot" />
    </Window>
  );
};

export default ImageWindow;
