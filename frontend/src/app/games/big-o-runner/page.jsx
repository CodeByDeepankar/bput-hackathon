"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./style.css";

function BigORunnerContent() {
  const searchParams = useSearchParams();
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/games/big-o-runner/game.js";
    script.async = true;
    document.body.appendChild(script);

    const reason = searchParams.get("reason");
    const fromQuiz = searchParams.get("from");

    if (reason && fromQuiz === "quiz") {
      setRecommendationMessage(reason);
      setShowRecommendation(true);
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [searchParams]);

  return (
    <main className="big-o-runner">
      {showRecommendation && (
        <div className="recommendation-banner">
          <div className="recommendation-content">
            <span className="recommendation-icon">🤖</span>
            <div className="recommendation-text">
              <strong>Gyanaratna AI Recommendation:</strong>
              <p>{recommendationMessage}</p>
            </div>
            <button
              className="recommendation-close"
              onClick={() => setShowRecommendation(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <h1 className="title">The Big O Runner</h1>

      <div id="selectionScreen" className="selection-screen">
        <h2>Select Your Algorithm (Power-Up)</h2>
        <div className="buttons">
          <button id="btn-o-n" className="btn">O(n) - Linear Search (Slow Run)</button>
          <button id="btn-o-log-n" className="btn">O(log n) - Binary Search (Quick Jumps)</button>
          <button id="btn-o-1" className="btn">O(1) - Hash Map (Teleport)</button>
        </div>
      </div>

      <div id="gameScreen" className="game-screen" style={{ display: "none" }}>
        <h2 id="gameModeTitle">Mode</h2>
        <canvas id="gameCanvas" width={800} height={400} />
      </div>

      <div id="gameInfo" className="game-info"></div>
    </main>
  );
}

export default function BigORunnerPage() {
  return (
    <Suspense
      fallback={
        <main className="big-o-runner">
          <h1 className="title">The Big O Runner</h1>
          <p>Loading game...</p>
        </main>
      }
    >
      <BigORunnerContent />
    </Suspense>
  );
}
