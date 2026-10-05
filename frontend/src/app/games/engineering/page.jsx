export const metadata = {
  title: "💻 CSE Learning Quiz",
  description: "Play the CSE Learning Quiz Platform",
};

export default function EngineeringGameHub() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">💻 CSE Learning Quiz</h1>
        <div className="rounded-lg overflow-hidden border bg-white dark:bg-neutral-900 shadow">
          <iframe
            src="/games/engineering.html"
            title="CSE Learning Quiz"
            className="w-full h-[80vh]"
            style={{ border: "0" }}
          />
        </div>
      </div>
    </div>
  );
}
