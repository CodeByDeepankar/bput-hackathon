export const metadata = {
  title: "📚 Quick Recap",
  description: "Review key topics with the Quick Recap interactive experience",
};

export default function RecapGameHub() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">📚 Quick Recap of Topics</h1>
        <div className="rounded-lg overflow-hidden border bg-white dark:bg-neutral-900 shadow">
          <iframe
            src="/games/recap.html"
            title="Quick Recap of Topics"
            className="w-full h-[80vh]"
            style={{ border: "0" }}
          />
        </div>
      </div>
    </div>
  );
}
