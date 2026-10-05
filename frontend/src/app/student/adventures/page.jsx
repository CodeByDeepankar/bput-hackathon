"use client";

import { useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import Link from "next/link";
import styles from "./Adventures.module.css";
import { FaBook, FaPuzzlePiece, FaGamepad, FaTrophy, FaArrowLeft, FaLightbulb } from "react-icons/fa";

// Mock data for adventures
const adventures = [
  {
    id: "ds_adventure",
    title: "The Data Structure Dungeon",
    description: "Master arrays, lists, and trees to defeat the Bug King.",
    icon: <FaTrophy />,
    stages: [
      { id: 1, title: "Introduction to Arrays", type: "lesson", status: "completed" },
      { id: 2, title: "Array Basics Quiz", type: "quiz", status: "unlocked" },
      { id: 3, title: "The 'Big O Runner' Game", type: "game", status: "locked" },
      { id: 4, title: "Linked Lists Lesson", type: "lesson", status: "locked" },
      { id: 5, title: "Boss Battle: The Bug King", type: "quiz", status: "locked" },
    ],
  },
  {
    id: "algo_adventure",
    title: "The Algorithm Apprentice",
    description: "Forge the Blade of Efficiency by mastering sorting and search.",
    icon: <FaTrophy />,
    stages: [
      { id: 1, title: "Intro to Sorting", type: "lesson", status: "unlocked" },
      { id: 2, title: "Sorting Quiz", type: "quiz", status: "locked" },
    ],
  },
];

const stageIcons = {
  lesson: <FaBook />,
  quiz: <FaPuzzlePiece />,
  game: <FaGamepad />,
};

function AdventuresUI() {
  const [selectedAdventure, setSelectedAdventure] = useState(null);

  // mock AI recommendation
  const aiRecommendation = "I see you're ready for the 'Array Basics Quiz'. Good luck!";

  const renderAdventureSelection = () => (
    <div className={styles.adventureGrid}>
      {adventures.map((adv) => (
        <button
          key={adv.id}
          className={styles.adventureCard}
          onClick={() => setSelectedAdventure(adv)}
          aria-label={`Open ${adv.title}`}
        >
          <div className={styles.advIcon}>{adv.icon}</div>
          <h3 className={styles.advTitle}>{adv.title}</h3>
          <p className={styles.advDesc}>{adv.description}</p>
        </button>
      ))}
    </div>
  );

  const renderQuestPath = () => {
    if (!selectedAdventure) return null;
    return (
      <div className={styles.questContainer}>
        <div className={styles.headerRow}>
          <button className={styles.backButton} onClick={() => setSelectedAdventure(null)}>
            <FaArrowLeft />
            <span>Back to Adventures</span>
          </button>
        </div>

        <h2 className={styles.adventureHeading}>{selectedAdventure.title}</h2>

        <div className={styles.aiGuideBox}>
          <div className={styles.aiIcon}><FaLightbulb /></div>
          <div>
            <strong>Gyan-Bot's Advice:</strong>
            <p className={styles.aiText}>{aiRecommendation}</p>
          </div>
        </div>

        <div className={styles.questPath}>
          {selectedAdventure.stages.map((stage) => (
            <div key={stage.id} className={`${styles.questStage} ${styles[stage.status]}`}>
              <div className={styles.stageIcon}>{stageIcons[stage.type] || <FaTrophy />}</div>
              <div className={styles.stageInfo}>
                <h4 className={styles.stageTitle}>{stage.title}</h4>
                <div className={styles.stageMeta}>Type: {stage.type}</div>
              </div>
              <div className={styles.stageActions}>
                {stage.status === "unlocked" && (
                  <Link href={`/student/${stage.type}/${stage.id}`} className={styles.startButton}>
                    Start
                  </Link>
                )}
                {stage.status === "completed" && <span className={styles.completedMark}>✔</span>}
                {stage.status === "locked" && <span className={styles.lockedMark}>🔒</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className={styles.pageContainer}>
      <div className={styles.headingRow}>
        <h1 className={styles.pageTitle}>Adventures</h1>
        <p className={styles.subtitle}>Main Story Quest — choose an adventure and follow its path</p>
      </div>
      {!selectedAdventure ? renderAdventureSelection() : renderQuestPath()}
    </main>
  );
}

export default function AdventuresPage() {
  return (
    <>
      <SignedIn>
        <AdventuresUI />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
