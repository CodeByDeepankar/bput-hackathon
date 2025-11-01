"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../../student/components/Courses.module.css";

// A small interactive demo to visualize algorithmic complexity.
// - Shows an array of N items
// - Lets you run simulated operations with different Big-O costs
// - Animates "step" counts to give a sense of relative cost

export default function BigORunnerGame({ initialSize = 20 }) {
  // read optional query params (e.g., ?reason=...)
  const searchParams = useSearchParams();
  const reason = searchParams?.get?.("reason") || null;
  const [size, setSize] = useState(initialSize);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(0);
  const cancelRef = useRef(false);

  function reset() {
    setSteps(0);
    cancelRef.current = false;
    setRunning(false);
  }

  // simple helper to animate an increasing step counter
  function animateSteps(totalSteps, speed = 8) {
    setRunning(true);
    setSteps(0);
    cancelRef.current = false;
    const chunk = Math.max(1, Math.floor(totalSteps / 100));
    let count = 0;

    function tick() {
      if (cancelRef.current) return setRunning(false);
      count += chunk;
      if (count >= totalSteps) {
        setSteps(totalSteps);
        setRunning(false);
        return;
      }
      setSteps(count);
      // adapt interval by speed (lower is faster)
      setTimeout(tick, speed);
    }
    tick();
  }

  // Simulate O(1)
  function runConstant() {
    animateSteps(1, 20);
  }

  // Simulate O(log n) (approx)
  function runLog() {
    const s = Math.max(1, Math.round(Math.log2(size + 1)));
    animateSteps(s, 60);
  }

  // Simulate O(n)
  function runLinear() {
    const s = size;
    animateSteps(s, Math.max(1, Math.floor(600 / Math.max(s, 1))));
  }

  // Simulate O(n log n)
  function runNLogN() {
    const s = Math.round(size * Math.log2(size + 1));
    animateSteps(s, Math.max(1, Math.floor(2000 / Math.max(s, 1))));
  }

  // Simulate O(n^2)
  function runQuadratic() {
    const s = size * size;
    animateSteps(s, Math.max(1, Math.floor(4000 / Math.max(s, 1))));
  }

  // Load an optional external game script from /public/games/big-o-runner/game.js
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/games/big-o-runner/game.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // ignore if already removed
      }
    };
  }, []);

  return (
    <div className={styles.gameContainer || "p-4 max-w-3xl mx-auto"}>
      <h3 className="text-2xl font-bold mb-2">Big-O Runner</h3>
      {reason && <p className={styles.aiReason || "text-sm text-yellow-300 mb-2"}>Reason: {reason}</p>}
      <p className="text-sm text-gray-400 mb-4">
        A small interactive demo to visualize how different time complexities grow as input size
        increases. Use the controls to run different simulated algorithms.
      </p>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-200">Input size:</label>
        <input
          type="range"
          min="5"
          max="200"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-64"
        />
        <div className="text-sm text-gray-200">{size}</div>
        <button
          onClick={() => setSize(20)}
          className="ml-2 px-3 py-1 bg-slate-700 text-white rounded"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <button
          className="px-4 py-3 bg-green-600 hover:bg-green-500 rounded disabled:opacity-60"
          onClick={runConstant}
          disabled={running}
          title="O(1) - Constant time"
        >
          O(1)
        </button>

        <button
          className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded disabled:opacity-60"
          onClick={runLog}
          disabled={running}
          title="O(log n) - Logarithmic time"
        >
          O(log n)
        </button>

        <button
          className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-60"
          onClick={runLinear}
          disabled={running}
          title="O(n) - Linear time"
        >
          O(n)
        </button>

        <button
          className="px-4 py-3 bg-orange-600 hover:bg-orange-500 rounded disabled:opacity-60"
          onClick={runNLogN}
          disabled={running}
          title="O(n log n) - Typical efficient sorts"
        >
          O(n log n)
        </button>

        <button
          className="px-4 py-3 bg-red-600 hover:bg-red-500 rounded disabled:opacity-60 col-span-1 sm:col-span-2"
          onClick={runQuadratic}
          disabled={running}
          title="O(n^2) - Quadratic time"
        >
          O(n^2)
        </button>
      </div>

      <div className="mb-4">
        <div className="h-3 bg-slate-700 rounded overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-indigo-500 to-pink-500"
            style={{ width: `${Math.min(100, (steps / Math.max(1, size * size)) * 100)}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-300">
          Steps: <span className="font-mono">{steps}</span>
          {running ? <span className="ml-2 text-yellow-300"> (running)</span> : null}
        </div>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: Math.min(60, size) }).map((_, i) => (
            <div
              key={i}
              className="h-6 bg-slate-800 rounded flex items-center justify-center text-xs text-gray-300"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-1 bg-gray-600 text-white rounded"
          onClick={() => {
            cancelRef.current = true;
            setRunning(false);
          }}
        >
          Stop
        </button>
        <button
          className="px-3 py-1 bg-slate-700 text-white rounded"
          onClick={reset}
        >
          Reset Steps
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Note: This is a simulation for educational purposes — step counts are approximations to illustrate
        growth rates rather than exact operation counts.
      </p>

      {/* --- External game HTML (selection + canvas) --- */}
      <div className={styles.externalGameWrapper || "mt-8"}>
        <h2 className="text-lg font-semibold mb-2">The Big O Runner (playable)</h2>
        <div id="selectionScreen" className="mb-3">
          <h3 className="font-medium">Select Your Algorithm (Power-Up)</h3>
          <div className="flex gap-2 mt-2">
            <button id="btn-o-n" className="px-3 py-1 bg-slate-700 text-white rounded">O(n) - Linear Search (Slow Run)</button>
            <button id="btn-o-log-n" className="px-3 py-1 bg-slate-700 text-white rounded">O(log n) - Binary Search (Quick Jumps)</button>
            <button id="btn-o-1" className="px-3 py-1 bg-slate-700 text-white rounded">O(1) - Hash Map (Teleport)</button>
          </div>
        </div>

        <div id="gameScreen" style={{ display: 'none' }}>
          <h3 id="gameModeTitle"></h3>
          <canvas id="gameCanvas" width="800" height="400" className="border rounded" />
        </div>
        <div id="gameInfo" className="mt-2 text-sm text-gray-300"></div>
      </div>
    </div>
  );
}
