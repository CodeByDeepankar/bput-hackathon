// Example Quiz Component using CSE Question Bank
// This demonstrates how to integrate the question bank into your quiz system

"use client";
import { useState, useEffect } from "react";
import questionBank, { 
  getRandomQuestions, 
  getQuestionsByTopic,
  getQuestionsByDifficulty,
  getQuestionBankStats 
} from "@/data/cse-question-bank";

export default function ExampleQuizComponent() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizType, setQuizType] = useState("random");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Get question bank statistics
    const bankStats = getQuestionBankStats();
    setStats(bankStats);
  }, []);

  const startQuiz = (type = "random") => {
    let selectedQuestions = [];
    
    switch (type) {
      case "random":
        selectedQuestions = getRandomQuestions(10);
        break;
      case "easy":
        selectedQuestions = getQuestionsByDifficulty("easy").slice(0, 10);
        break;
      case "medium":
        selectedQuestions = getQuestionsByDifficulty("medium").slice(0, 10);
        break;
      case "hard":
        selectedQuestions = getQuestionsByDifficulty("hard");
        break;
      case "datastructures":
        selectedQuestions = getQuestionsByTopic("Data Structures");
        break;
      case "algorithms":
        selectedQuestions = getQuestionsByTopic("Algorithms");
        break;
      case "database":
        selectedQuestions = getQuestionsByTopic("Database Systems");
        break;
      case "os":
        selectedQuestions = getQuestionsByTopic("Operating Systems");
        break;
      default:
        selectedQuestions = getRandomQuestions(10);
    }
    
    setQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setQuizStarted(true);
    setQuizType(type);
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === questions[currentQuestionIndex].answer) {
      setScore(score + 1);
    }

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setQuizStarted(false);
  };

  if (!quizStarted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">CSE Quiz System</h1>
        
        {stats && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Question Bank Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Topics</p>
                <p className="text-2xl font-bold">{stats.topics.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Easy</p>
                <p className="text-2xl font-bold text-green-600">{stats.byDifficulty.easy}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Hard</p>
                <p className="text-2xl font-bold text-red-600">{stats.byDifficulty.hard}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Quiz Type:</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => startQuiz("random")}
              className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <h3 className="font-bold">🎲 Random Quiz</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">10 random questions</p>
            </button>

            <button
              onClick={() => startQuiz("easy")}
              className="p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <h3 className="font-bold">🟢 Easy Quiz</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Perfect for beginners</p>
            </button>

            <button
              onClick={() => startQuiz("medium")}
              className="p-4 border-2 border-yellow-500 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            >
              <h3 className="font-bold">🟡 Medium Quiz</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Intermediate level</p>
            </button>

            <button
              onClick={() => startQuiz("hard")}
              className="p-4 border-2 border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <h3 className="font-bold">🔴 Hard Quiz</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Advanced concepts</p>
            </button>

            <button
              onClick={() => startQuiz("datastructures")}
              className="p-4 border-2 border-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              <h3 className="font-bold">📊 Data Structures</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Arrays, Lists, Big O</p>
            </button>

            <button
              onClick={() => startQuiz("algorithms")}
              className="p-4 border-2 border-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            >
              <h3 className="font-bold">🔄 Algorithms</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sorting, Recursion</p>
            </button>

            <button
              onClick={() => startQuiz("database")}
              className="p-4 border-2 border-pink-500 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20"
            >
              <h3 className="font-bold">💾 Database Systems</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">SQL, Normalization</p>
            </button>

            <button
              onClick={() => startQuiz("os")}
              className="p-4 border-2 border-teal-500 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20"
            >
              <h3 className="font-bold">💻 Operating Systems</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Process, Threads</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResult) {
    const percentage = ((score / questions.length) * 100).toFixed(1);
    const passed = percentage >= 60;

    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-6">Quiz Complete! 🎉</h1>
        
        <div className={`p-8 rounded-lg ${passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
          <p className="text-6xl font-bold mb-4">{percentage}%</p>
          <p className="text-2xl mb-2">
            {score} out of {questions.length} correct
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {passed ? '✅ Passed!' : '❌ Keep practicing!'}
          </p>
        </div>

        <div className="mt-8 space-x-4">
          <button
            onClick={() => startQuiz(quizType)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={resetQuiz}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Choose Another Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-semibold px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            {currentQuestion.difficulty.toUpperCase()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentQuestion.topic} → {currentQuestion.subTopic}
        </span>
      </div>

      <h2 className="text-2xl font-bold mb-6">{currentQuestion.question}</h2>

      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(option)}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              selectedAnswer === option
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }`}
          >
            <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
            {option}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Score: {score}/{currentQuestionIndex}
        </span>
        <button
          onClick={handleNextQuestion}
          disabled={!selectedAnswer}
          className={`px-6 py-3 rounded-lg ${
            selectedAnswer
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {currentQuestionIndex + 1 === questions.length ? 'Finish' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
