import Window from "./Window";

const ProjectsWindow = () => {
  const projects = [
    {
      title: "Stevens Institute of Technology",
      description: "B.S. Computer Science '24",
      more_info: "GPA: 3.86",
      link: null,
    },
    {
      title: "Morgan Stanley",
      description: "Software Engineering Intern (Summer 2024)",
      more_info: "C++, pcap++, Python, TCP/IP",
      link: null,
    },
    {
      title: "MIT Lincoln Laboratory",
      description: "Software Engineering Intern (Summer 2023)",
      more_info: "Python, Flask, Apache NiFi, JavaScript, XQuery",
      link: null,
    },
    {
      title: "Piggy Bank",
      description: "An educational app to help kids learn about online banking",
      more_info: "React, GraphQL, MongoDB, Clerk",
      link: "https://github.com/DhihanA/CS-554-Group-Final-Project",
      link_title: "View on Github",
    },
    {
      title: "TabCap",
      description: "A chrome extension to boost productivity and save RAM",
      more_info: "JavaScript, HTML, Chrome API",
      link: "https://chrome.google.com/webstore/detail/tabcap/leafbnlpfnmggafdpdlbegoecpmiphhn",
      link_title: "View on Chrome Web Store",
    },
  ];

  return (
    <Window width="w-2/8" height="h-auto" title="📄 resume.pdf">
      {projects.map((project, index) => (
        <div key={index} className="mb-4">
          <p className="font-mono font-bold text-xl">{project.title}</p>
          <p className="font-mono text-gray-700">{project.description}</p>
          <p className="font-mono text-gray-500">{project.more_info}</p>
          {project.link && (
            <a
              href={project.link}
              className="font-mono text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.link_title}
            </a>
          )}
        </div>
      ))}
      <div className="mt-4 text-xl">
        <a
          href="/resume.pdf"
          className="font-mono text-blue-500"
          download="Jesal_Gandhi_Resume.pdf"
        >
          Download Full Resume
        </a>
      </div>
    </Window>
  );
};

export default ProjectsWindow;
