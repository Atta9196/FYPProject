export default function WebGLGameEmbed({ gameFolder = "IELTSGame" }) {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`/Games/${gameFolder}/index.html`}
          title={gameFolder}
          className="absolute inset-0 w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
