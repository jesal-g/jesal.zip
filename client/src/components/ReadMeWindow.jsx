import { useState, useEffect } from "react";
import Window from "./Window";
import Typewriter from "typewriter-effect";
import { FaGithub, FaLinkedin, FaYoutube } from "react-icons/fa";

const artists = [
  "yeat",
  "carti",
  "ken carson",
  "denzel curry",
  "jid",
  "travis scott",
  "bashfortheworld",
  "soccer mommy",
  "uzi",
  "jpegmafia",
  "weyes blood",
  "lucki",
  "yhapojj",
  "future",
  "kankan",
  "weeknd",
  "paramore",
  "aphex twin",
  "charli xcx",
  "rina sawayama",
];

const tv_and_movies = [
  "sopranos",
  "baby driver",
  "mr robot",
  "succession",
  "freaks and geeks",
  "slumdog millionare",
  "superbad",
  "harold and kumar",
  "the office",
  "curb your enthusiasm",
  "south park",
  "archer",
  "silicon valley",
  "spongebob",
  "shawshank",
  "oppenheimer",
  "inception",
  "fight club",
  "toy story 1-3",
  "american beauty",
  "good will hunting",
  "3 idiots",
  "pk",
  "wolf of wall st",
  "fargo",
  "inside out",
  "willy wonka",
  "pulp fiction",
  "breaking bad",
  "shameless",
  "brooklyn 99",
  "avatar: tla",
  "atlanta",
  "master of none",
  "the good place",
];

const getRandomElem = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const getNewLines = () => [
  `avid ${getRandomElem(artists)} listener`,
  `avg ${getRandomElem(tv_and_movies)} enjoyer`,
];

const ReadMeWindow = () => {
  const [lines, setLines] = useState(getNewLines);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLines(getNewLines());
    }, 13000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Window width="w-2/8" height="h-4/10" title="📝 README.md">
      <div className="flex flex-col items-center justify-center h-full">
        <p className="font-mono text-xl">Hi, my name is</p>
        <p className="text-center font-title font-bold text-4xl bg-gradient-to-r from-teal-500 via-green-500 to-teal-500 bg-clip-text text-transparent transition-all duration-500 hover:bg-gradient-to-r hover:from-green-500 hover:via-teal-500 hover:to-green-500">
          JESAL GANDHI
        </p>
        <div className="font-mono text-xl">software engineer</div>
        <div className="font-mono text-xl">
          <Typewriter
            options={{
              strings: lines,
              cursor: `\\`,
              autoStart: true,
              loop: true,
              deleteSpeed: "natural",
              delay: "natural",
            }}
          />
        </div>
        <div className="webring font-mono text-xl space-x-6 lowercase text-pg-green transform transition-transform duration-300 hover:-translate-y-1">
          <a href="https://pg-webring.vercel.app">pixl-garden Webring</a>
        </div>
        <div className="webring_refs font-mono text-xl space-x-6 lowercase text-pg-green">
          <a
            href="https://pg-webring.vercel.app/prev?site=https://jesal.zip"
            className="inline-block transform transition-transform duration-300 hover:-translate-y-1"
          >
            Prev
          </a>
          <a
            href="https://pg-webring.vercel.app/next?site=https://jesal.zip"
            className="inline-block transform transition-transform duration-300 hover:-translate-y-1"
          >
            Next
          </a>
        </div>
        <div className="flex space-x-4 mt-2">
          <a
            href="https://github.com/jesalgandhi"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform duration-300 hover:-translate-y-1 hover:text-yellow-600"
          >
            <FaGithub className="text-3xl" />
          </a>
          <a
            href="https://linkedin.com/in/jesalg"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform duration-300 hover:-translate-y-1 hover:text-blue-600"
          >
            <FaLinkedin className="text-3xl" />
          </a>
          <a
            href="https://youtube.com/@jesalgandhi"
            target="_blank"
            rel="noopener noreferrer"
            className="transform transition-transform duration-300 hover:-translate-y-1 hover:text-red-600"
          >
            <FaYoutube className="text-3xl" />
          </a>
        </div>
      </div>
    </Window>
  );
};

export default ReadMeWindow;
