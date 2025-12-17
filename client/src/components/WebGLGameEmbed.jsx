export default function WebGLGameEmbed() {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe
            src="/Games/IELTSGame/index.html"
            title="IELTS Vocabulary Game"
            className="absolute inset-0 w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    );
  }
  