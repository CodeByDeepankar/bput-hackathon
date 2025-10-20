import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { CheckCircle, XCircle, Star, Trophy, Clock, Target, ChevronLeft, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import questionBank, { 
	getRandomQuestions, 
	getQuestionsByTopic,
	getQuestionsByDifficulty,
	getQuestionBankStats 
} from "@/data/cse-question-bank";

export default function QuizComponent() {
	const { t } = useI18n();
	const router = useRouter();
	const [questions, setQuestions] = useState([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [userAnswers, setUserAnswers] = useState({});
	const [score, setScore] = useState(0);
	const [showResult, setShowResult] = useState(false);
	const [quizStarted, setQuizStarted] = useState(false);
	const [quizType, setQuizType] = useState("random");
	const [quizTopic, setQuizTopic] = useState("");
	const [timeLeft, setTimeLeft] = useState(null);
	const [showAnswer, setShowAnswer] = useState(false);

	const stats = getQuestionBankStats();

	const startQuiz = (type = "random", questionCount = 10) => {
		let selectedQuestions = [];
		let topicName = "";
		
		switch (type) {
			case "random":
				selectedQuestions = getRandomQuestions(questionCount);
				topicName = "Random Topics";
				break;
			case "easy":
				selectedQuestions = getQuestionsByDifficulty("easy").slice(0, questionCount);
				topicName = "Easy Questions";
				break;
			case "medium":
				selectedQuestions = getQuestionsByDifficulty("medium").slice(0, questionCount);
				topicName = "Medium Questions";
				break;
			case "hard":
				selectedQuestions = getQuestionsByDifficulty("hard");
				topicName = "Hard Questions";
				break;
			case "datastructures":
				selectedQuestions = getQuestionsByTopic("Data Structures");
				topicName = "Data Structures";
				break;
			case "algorithms":
				selectedQuestions = getQuestionsByTopic("Algorithms");
				topicName = "Algorithms";
				break;
			case "database":
				selectedQuestions = getQuestionsByTopic("Database Systems");
				topicName = "Database Systems";
				break;
			case "os":
				selectedQuestions = getQuestionsByTopic("Operating Systems");
				topicName = "Operating Systems";
				break;
			default:
				selectedQuestions = getRandomQuestions(questionCount);
				topicName = "Random Topics";
		}
		
		setQuestions(selectedQuestions);
		setQuizTopic(topicName);
		setCurrentQuestionIndex(0);
		setSelectedAnswer(null);
		setUserAnswers({});
		setScore(0);
		setShowResult(false);
		setQuizStarted(true);
		setQuizType(type);
		setShowAnswer(false);
	};

	const handleAnswerSelect = (answer) => {
		if (!showAnswer) {
			setSelectedAnswer(answer);
		}
	};

	const handleSubmitAnswer = () => {
		if (!selectedAnswer) return;
		
		const currentQuestion = questions[currentQuestionIndex];
		const isCorrect = selectedAnswer === currentQuestion.answer;
		
		setUserAnswers({
			...userAnswers,
			[currentQuestionIndex]: {
				selected: selectedAnswer,
				correct: isCorrect
			}
		});
		
		if (isCorrect) {
			setScore(score + 1);
		}
		
		setShowAnswer(true);
	};

	const handleNextQuestion = () => {
		if (currentQuestionIndex + 1 < questions.length) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
			setSelectedAnswer(null);
			setShowAnswer(false);
		} else {
			// Quiz is finished - redirect to results page
			const percentage = ((score / questions.length) * 100).toFixed(1);
			const queryParams = new URLSearchParams({
				score: percentage,
				topic: quizTopic,
				total: questions.length.toString(),
				correct: score.toString()
			});
			router.push(`/student/quiz/results?${queryParams.toString()}`);
		}
	};

	const handlePrevQuestion = () => {
		if (currentQuestionIndex > 0) {
			setCurrentQuestionIndex(currentQuestionIndex - 1);
			const prevAnswer = userAnswers[currentQuestionIndex - 1];
			if (prevAnswer) {
				setSelectedAnswer(prevAnswer.selected);
				setShowAnswer(true);
			} else {
				setSelectedAnswer(null);
				setShowAnswer(false);
			}
		}
	};

	const resetQuiz = () => {
		setQuestions([]);
		setCurrentQuestionIndex(0);
		setSelectedAnswer(null);
		setUserAnswers({});
		setScore(0);
		setShowResult(false);
		setQuizStarted(false);
		setShowAnswer(false);
	};

	const getDifficultyColor = (difficulty) => {
		switch (difficulty) {
			case "easy": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
			case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
			case "hard": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
			default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
		}
	};

	// Quiz Selection Screen
	if (!quizStarted) {
		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Trophy className="w-6 h-6" />
							{t.quiz?.title ? t.quiz.title() : "CSE Quiz System"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<div className="text-center">
								<p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
								<p className="text-2xl font-bold">{stats.total}</p>
							</div>
							<div className="text-center">
								<p className="text-sm text-gray-600 dark:text-gray-400">Topics</p>
								<p className="text-2xl font-bold">{stats.topics.length}</p>
							</div>
							<div className="text-center">
								<p className="text-sm text-gray-600 dark:text-gray-400">Easy</p>
								<p className="text-2xl font-bold text-green-600">{stats.byDifficulty.easy}</p>
							</div>
							<div className="text-center">
								<p className="text-sm text-gray-600 dark:text-gray-400">Hard</p>
								<p className="text-2xl font-bold text-red-600">{stats.byDifficulty.hard}</p>
							</div>
						</div>

						<h3 className="text-lg font-semibold mb-4">Choose Your Quiz:</h3>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<Button
								onClick={() => startQuiz("random", 10)}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">🎲 Random Quiz</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">10 random questions</span>
							</Button>

							<Button
								onClick={() => startQuiz("easy", 10)}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">🟢 Easy Quiz</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">Perfect for beginners</span>
							</Button>

							<Button
								onClick={() => startQuiz("medium", 10)}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">🟡 Medium Quiz</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">Intermediate level</span>
							</Button>

							<Button
								onClick={() => startQuiz("hard")}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">🔴 Hard Quiz</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">Advanced concepts</span>
							</Button>

							<Button
								onClick={() => startQuiz("datastructures")}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">📊 Data Structures</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">Arrays, Lists, Big O</span>
							</Button>

							<Button
								onClick={() => startQuiz("algorithms")}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">🔄 Algorithms</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">Sorting, Recursion</span>
							</Button>

							<Button
								onClick={() => startQuiz("database")}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">💾 Database Systems</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">SQL, Normalization</span>
							</Button>

							<Button
								onClick={() => startQuiz("os")}
								className="h-auto py-4 flex flex-col items-start gap-1"
								variant="outline"
							>
								<span className="font-bold">💻 Operating Systems</span>
								<span className="text-xs text-gray-600 dark:text-gray-400">Process, Threads</span>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Results Screen
	if (showResult) {
		const percentage = ((score / questions.length) * 100).toFixed(1);
		const passed = percentage >= 60;

		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Trophy className="w-6 h-6" />
						Quiz Complete!
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className={`p-8 rounded-lg text-center ${passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
						<div className="text-6xl font-bold mb-2">{percentage}%</div>
						<div className="text-2xl mb-1">{score} / {questions.length}</div>
						<div className="text-lg">
							{passed ? '✅ Excellent Work!' : '❌ Keep Practicing!'}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
							<CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
							<div className="text-2xl font-bold text-green-600">{score}</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
						</div>
						<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
							<XCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
							<div className="text-2xl font-bold text-red-600">{questions.length - score}</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">Incorrect</div>
						</div>
					</div>

					<div className="flex gap-3">
						<Button onClick={() => startQuiz(quizType)} className="flex-1 gap-2">
							<RotateCcw className="w-4 h-4" />
							Try Again
						</Button>
						<Button onClick={resetQuiz} variant="outline" className="flex-1 gap-2">
							<ChevronLeft className="w-4 h-4" />
							Choose Another Quiz
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Quiz Question Screen
	const currentQuestion = questions[currentQuestionIndex];
	const isAnswered = userAnswers[currentQuestionIndex] !== undefined;

	return (
		<Card>
			<CardHeader>
				<div className="flex justify-between items-center mb-2">
					<CardTitle className="text-lg">
						Question {currentQuestionIndex + 1} of {questions.length}
					</CardTitle>
					<Badge className={getDifficultyColor(currentQuestion.difficulty)}>
						{currentQuestion.difficulty.toUpperCase()}
					</Badge>
				</div>
				<Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
			</CardHeader>
			
			<CardContent className="space-y-4">
				<div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
					<Target className="w-4 h-4" />
					<span>{currentQuestion.topic} → {currentQuestion.subTopic}</span>
				</div>

				<div className="text-xl font-semibold mb-4">
					{currentQuestion.question}
				</div>

				<div className="space-y-2">
					{currentQuestion.options.map((option, index) => {
						const isSelected = selectedAnswer === option;
						const isCorrectAnswer = option === currentQuestion.answer;
						const showCorrect = showAnswer && isCorrectAnswer;
						const showWrong = showAnswer && isSelected && !isCorrectAnswer;

						return (
							<Button
								key={index}
								onClick={() => handleAnswerSelect(option)}
								variant="outline"
								className={`w-full justify-start text-left h-auto py-3 px-4 ${
									isSelected && !showAnswer ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''
								} ${showCorrect ? 'border-green-600 bg-green-50 dark:bg-green-900/20' : ''} ${
									showWrong ? 'border-red-600 bg-red-50 dark:bg-red-900/20' : ''
								}`}
								disabled={showAnswer}
							>
								<div className="flex items-center gap-2 w-full">
									<span className="font-semibold">{String.fromCharCode(65 + index)}.</span>
									<span className="flex-1">{option}</span>
									{showCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
									{showWrong && <XCircle className="w-5 h-5 text-red-600" />}
								</div>
							</Button>
						);
					})}
				</div>

				<div className="flex items-center justify-between pt-4 border-t">
					<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
						<Star className="w-4 h-4" />
						<span>Score: {score}/{currentQuestionIndex + (showAnswer ? 1 : 0)}</span>
					</div>
					
					<div className="flex gap-2">
						{currentQuestionIndex > 0 && (
							<Button onClick={handlePrevQuestion} variant="outline" size="sm">
								<ChevronLeft className="w-4 h-4 mr-1" />
								{t.common?.prev ? t.common.prev() : "Prev"}
							</Button>
						)}
						
						{!showAnswer ? (
							<Button 
								onClick={handleSubmitAnswer} 
								disabled={!selectedAnswer}
								size="sm"
							>
								Submit Answer
							</Button>
						) : (
							<Button onClick={handleNextQuestion} size="sm">
								{currentQuestionIndex + 1 === questions.length ? 'Finish' : t.common?.next ? t.common.next() : "Next"}
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
