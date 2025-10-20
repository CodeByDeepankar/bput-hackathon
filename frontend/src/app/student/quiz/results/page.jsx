"use client";

// TASK: Automatically redirect user to a game if their quiz score is low.
// GOAL:
// 1. Get the user's score and the quiz topic (e.g., from URL search params).
// 2. Define a score threshold (e.g., 60%).
// 3. Define a map of which game to play for which topic.
// 4. Use a `useEffect` hook to check the score when the page loads.
// 5. If the score is low for a specific topic (like "Data Structures"),
//    automatically redirect the user to the correct game page.
// 6. Pass a "reason" message in the URL query to tell the user *why* they were redirected.

// 1. Import dependencies
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/student/components/ui/card";
import { Button } from "@/student/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Target, ArrowRight } from "lucide-react";
import Link from "next/link";

// 2. Create the Game Map
const gameRecommendationMap = {
  "Data Structures": {
    gameUrl: "/games/big-o-runner",
    gameName: "Big O Runner",
    description: "Learn Big O notation and algorithm efficiency through an interactive runner game!"
  },
  "Algorithms": {
    gameUrl: "/games/big-o-runner",
    gameName: "Big O Runner",
    description: "Practice sorting and searching algorithms with visual gameplay!"
  },
  "Database Systems": {
    gameUrl: "/student/games/stem-quiz",
    gameName: "STEM Quiz",
    description: "Reinforce your database concepts with interactive quizzes!"
  },
  "Operating Systems": {
    gameUrl: "/student/games/stem-quiz",
    gameName: "STEM Quiz",
    description: "Practice OS concepts with challenging questions!"
  }
};

// 3. Define the component
export default function QuizResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 4. Get score and topic from URL (e.g., /results?score=55&topic=Data%20Structures)
  const userScore = searchParams.get('score');
  const quizTopic = searchParams.get('topic');
  const totalQuestions = searchParams.get('total');
  const correctAnswers = searchParams.get('correct');
  
  const score = parseInt(userScore, 10);
  const suggestionThreshold = 60; // Set your "low score" threshold here

  // 5. Add the useEffect hook for automatic redirection
  useEffect(() => {
    if (!quizTopic || isNaN(score)) {
      // Data is not ready, do nothing
      return;
    }

    // Check if score is low
    if (score < suggestionThreshold) {
      // Check if we have a game for this topic
      const recommendedGame = gameRecommendationMap[quizTopic];
      
      if (recommendedGame) {
        // We have a match! Redirect the user after a short delay to show the recommendation
        const timer = setTimeout(() => {
          // Create a message to show on the game page
          const message = `Your score in ${quizTopic} was ${score}%. Play this game to improve your skills!`;
          
          // Construct the redirect URL
          const redirectUrl = `${recommendedGame.gameUrl}?reason=${encodeURIComponent(message)}&from=quiz`;
          
          // Redirect!
          router.push(redirectUrl);
        }, 3000); // 3 second delay to show the recommendation first

        return () => clearTimeout(timer);
      }
    }
  }, [userScore, quizTopic, score, router]); // Run this effect when data changes

  // 6. Render the page content
  //    If the score is low, the user will be redirected.
  //    If the score is high, they will see this results page.

  // Show a loading state while the check is happening
  if (!quizTopic || isNaN(score)) {
    return <LoadingSpinner text="Calculating your results..." />;
  }

  const recommendedGame = score < suggestionThreshold ? gameRecommendationMap[quizTopic] : null;
  const passed = score >= suggestionThreshold;
  
  // This is what the user sees
  return (
    <div className="min-h-screen p-4 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-7 h-7" />
              Quiz Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className={`p-8 rounded-lg text-center ${
              passed 
                ? 'bg-green-100 dark:bg-green-900/20' 
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <div className="text-6xl font-bold mb-2">{score}%</div>
              {totalQuestions && correctAnswers && (
                <div className="text-2xl mb-1">{correctAnswers} / {totalQuestions}</div>
              )}
              <div className="text-lg font-semibold">
                {passed ? '✅ Excellent Work!' : '❌ Keep Practicing!'}
              </div>
            </div>

            {/* Topic Display */}
            <div className="flex items-center justify-center gap-2 text-lg">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Topic:</span>
              <span className="text-blue-600 dark:text-blue-400">{quizTopic}</span>
            </div>

            {/* Success Message */}
            {passed && (
              <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-6 h-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-green-800 dark:text-green-400 mb-1">
                        🎉 Great job!
                      </h3>
                      <p className="text-green-700 dark:text-green-300">
                        You've shown a strong understanding of {quizTopic}. Keep up the excellent work!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Recommendation for Low Score */}
            {!passed && recommendedGame && (
              <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <TrendingDown className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-1">
                        🤖 Gyanaratna AI Recommendation
                      </h3>
                      <p className="text-blue-700 dark:text-blue-300 mb-3">
                        Your score was {score}%. We recommend playing <strong>{recommendedGame.gameName}</strong> to improve your understanding of {quizTopic}!
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        {recommendedGame.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                      <span className="text-lg">⏳</span>
                      <span>Redirecting you to <strong>{recommendedGame.gameName}</strong> in a few seconds...</span>
                    </p>
                  </div>

                  <Button asChild className="w-full gap-2" size="lg">
                    <Link href={`${recommendedGame.gameUrl}?from=quiz&topic=${encodeURIComponent(quizTopic)}`}>
                      Play {recommendedGame.gameName} Now
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Generic Recommendation for Low Score (No Game Available) */}
            {!passed && !recommendedGame && (
              <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="w-6 h-6 text-orange-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-orange-800 dark:text-orange-400 mb-1">
                        🤖 Gyanaratna AI Recommendation
                      </h3>
                      <p className="text-orange-700 dark:text-orange-300">
                        Your score was {score}%. We recommend reviewing your course materials for {quizTopic} and trying the quiz again.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/student/quiz">
                  Take Another Quiz
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/student">
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
