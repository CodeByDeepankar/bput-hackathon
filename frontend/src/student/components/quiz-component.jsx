import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { CheckCircle, XCircle, Star, Trophy, Target, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { fetchUserRole } from "@/lib/users";
import { getQuizzes, getQuizQuestions, recordQuizCompletion } from "@/lib/api";

const DEFAULT_QUESTION_COUNT = 10;

function shuffleAndSlice(list, count) {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	if (typeof count === "number") {
		const limit = Math.max(1, Math.min(copy.length, count));
		return copy.slice(0, limit);
	}
	return copy;
}

function formatDifficulty(value) {
	const normalized = typeof value === "string" ? value.toLowerCase() : "medium";
	if (normalized === "easy") return "Easy";
	if (normalized === "hard") return "Hard";
	return "Medium";
}

function getDifficultyColor(difficulty) {
	switch ((difficulty || "medium").toLowerCase()) {
		case "easy":
			return "bg-green-100 text-green-800";
		case "hard":
			return "bg-rose-100 text-rose-800";
		case "medium":
		default:
			return "bg-yellow-100 text-yellow-800";
	}
}

export default function QuizComponent() {
	const router = useRouter();
	const { t } = useI18n();
	const { user, isLoaded } = useUser();

	const [roleDoc, setRoleDoc] = useState(null);
	const [roleLoading, setRoleLoading] = useState(true);
	const [roleError, setRoleError] = useState(null);

	const [questionPool, setQuestionPool] = useState([]);
	const [availableQuizzes, setAvailableQuizzes] = useState([]);
	const [dataLoading, setDataLoading] = useState(false);
	const [dataError, setDataError] = useState(null);

	const [questions, setQuestions] = useState([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [userAnswers, setUserAnswers] = useState({});
	const [score, setScore] = useState(0);
	const [quizStarted, setQuizStarted] = useState(false);
	const [quizTopic, setQuizTopic] = useState("");
	const [quizType, setQuizType] = useState("random");
	const [showAnswer, setShowAnswer] = useState(false);
	const [activeQuizId, setActiveQuizId] = useState(null);
	const [selectionError, setSelectionError] = useState(null);

	useEffect(() => {
		if (!isLoaded) return;
		if (!user?.id) {
			setRoleDoc(null);
			setRoleError(null);
			setRoleLoading(false);
			return;
		}

		let active = true;
		setRoleLoading(true);
		setRoleError(null);
		fetchUserRole(user.id)
			.then((doc) => {
				if (!active) return;
				setRoleDoc(doc);
			})
			.catch((error) => {
				if (!active) return;
				setRoleError(error?.message || "Unable to load profile");
			})
			.finally(() => {
				if (active) setRoleLoading(false);
			});

		return () => {
			active = false;
		};
	}, [isLoaded, user?.id]);

	const schoolId = roleDoc?.schoolId || roleDoc?.school_id || null;

	useEffect(() => {
		if (!schoolId) {
			setQuestionPool([]);
			setAvailableQuizzes([]);
			setDataLoading(false);
			return;
		}

		let active = true;
		setDataLoading(true);
		setDataError(null);
		Promise.all([
			getQuizzes({ schoolId }),
			getQuizQuestions({ schoolId, includeAnswers: true }),
		])
			.then(([quizList, questionList]) => {
				if (!active) return;
				setAvailableQuizzes(Array.isArray(quizList) ? quizList : []);
				setQuestionPool(Array.isArray(questionList) ? questionList : []);
			})
			.catch((error) => {
				if (!active) return;
				setDataError(error?.message || "Unable to load quizzes yet");
				setAvailableQuizzes([]);
				setQuestionPool([]);
			})
			.finally(() => {
				if (active) setDataLoading(false);
			});

		return () => {
			active = false;
		};
	}, [schoolId]);

	const stats = useMemo(() => {
		const byDifficulty = { easy: 0, medium: 0, hard: 0 };
		const topicCounts = {};
		const quizCounts = {};

		questionPool.forEach((question) => {
			const diff = typeof question.difficulty === "string" ? question.difficulty.toLowerCase() : "medium";
			const bucket = ["easy", "medium", "hard"].includes(diff) ? diff : "medium";
			byDifficulty[bucket] += 1;

			if (question.topic) {
				topicCounts[question.topic] = (topicCounts[question.topic] || 0) + 1;
			}

			if (question.quizId) {
				quizCounts[question.quizId] = (quizCounts[question.quizId] || 0) + 1;
			}
		});

		const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);

		return {
			total: questionPool.length,
			topics,
			byDifficulty,
			quizCounts,
		};
	}, [questionPool]);

	const topTopics = useMemo(() => stats.topics.slice(0, 4), [stats]);

	const resetQuiz = () => {
		setQuestions([]);
		setCurrentQuestionIndex(0);
		setSelectedAnswer(null);
		setUserAnswers({});
		setScore(0);
		setQuizStarted(false);
		setQuizTopic("");
		setQuizType("random");
		setShowAnswer(false);
		setActiveQuizId(null);
		setSelectionError(null);
	};

	const startQuiz = (type = "random", options = {}) => {
		if (!questionPool.length) {
			setSelectionError("No questions available yet.");
			return;
		}

		let selected = [];
		let topicName = "";
		let quizId = null;

		if (type === "random") {
			selected = shuffleAndSlice(questionPool, options.count ?? DEFAULT_QUESTION_COUNT);
			topicName = "Random Practice";
		} else if (type.startsWith("difficulty:")) {
			const diff = type.split(":")[1];
			const filtered = questionPool.filter((question) => {
				const normalized = typeof question.difficulty === "string" ? question.difficulty.toLowerCase() : "medium";
				return normalized === diff;
			});
			selected = shuffleAndSlice(filtered, options.count ?? DEFAULT_QUESTION_COUNT);
			topicName = `${formatDifficulty(diff)} Difficulty`;
		} else if (type.startsWith("topic:")) {
			const topic = type.slice(6);
			const filtered = questionPool.filter((question) => question.topic === topic);
			selected = shuffleAndSlice(filtered, options.count ?? DEFAULT_QUESTION_COUNT);
			topicName = topic;
		} else if (type.startsWith("quiz:")) {
			quizId = type.slice(5);
			const filtered = questionPool.filter((question) => question.quizId === quizId);
			selected = shuffleAndSlice(filtered, filtered.length);
			const quizMeta = availableQuizzes.find((quiz) => quiz.id === quizId);
			topicName = quizMeta?.title || "Quiz";
		} else {
			selected = shuffleAndSlice(questionPool, options.count ?? DEFAULT_QUESTION_COUNT);
			topicName = "Random Practice";
		}

		if (!selected.length) {
			setSelectionError("No questions available for this selection yet.");
			return;
		}

		setQuestions(selected);
		setQuizTopic(topicName);
		setQuizType(type);
		setActiveQuizId(quizId);
		setCurrentQuestionIndex(0);
		setSelectedAnswer(null);
		setUserAnswers({});
		setScore(0);
		setQuizStarted(true);
		setShowAnswer(false);
		setSelectionError(null);
	};

	const handleAnswerSelect = (answer) => {
		if (!showAnswer) {
			setSelectedAnswer(answer);
		}
	};

	const handleSubmitAnswer = () => {
		const currentQuestion = questions[currentQuestionIndex];
		if (!currentQuestion || !selectedAnswer) return;

		const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

		setUserAnswers((prev) => ({
			...prev,
			[currentQuestionIndex]: {
				selected: selectedAnswer,
				correct: isCorrect,
				correctAnswer: currentQuestion.correctAnswer,
			},
		}));

		if (isCorrect) {
			setScore((prev) => prev + 1);
		}

		setShowAnswer(true);
	};

	const handleNextQuestion = () => {
		if (currentQuestionIndex + 1 < questions.length) {
			setCurrentQuestionIndex((prev) => prev + 1);
			const nextAnswer = userAnswers[currentQuestionIndex + 1];
			setSelectedAnswer(nextAnswer ? nextAnswer.selected : null);
			setShowAnswer(Boolean(nextAnswer));
		} else {
			const total = questions.length || 1;
			const finalScore = score;
			const percent = ((finalScore / total) * 100).toFixed(1);
			const params = new URLSearchParams({
				score: percent,
				topic: quizTopic || "Quiz",
				total: total.toString(),
				correct: finalScore.toString(),
			});
			if (activeQuizId) {
				params.append("quizId", activeQuizId);
			}

			router.push(`/student/quiz/results?${params.toString()}`);

			if (user?.id && total > 0) {
				const quizMeta = activeQuizId ? availableQuizzes.find((quiz) => quiz.id === activeQuizId) : null;
				recordQuizCompletion({
					userId: user.id,
					quizId: activeQuizId || `practice:${quizType}`,
					score: Math.round((finalScore / total) * 100),
					timeSpent: 0,
					subject: quizMeta?.subjectId || "general",
				}).catch(() => {});
			}

			resetQuiz();
		}
	};

	const handlePrevQuestion = () => {
		if (currentQuestionIndex === 0) return;
		const prevIndex = currentQuestionIndex - 1;
		setCurrentQuestionIndex(prevIndex);
		const prevAnswer = userAnswers[prevIndex];
		setSelectedAnswer(prevAnswer ? prevAnswer.selected : null);
		setShowAnswer(Boolean(prevAnswer));
	};

	if (!quizStarted) {
		if (roleLoading || dataLoading) {
			return (
				<div className="space-y-6">
					<Card>
						<CardContent className="flex flex-col items-center justify-center gap-3 py-12">
							<Loader2 className="w-6 h-6 animate-spin text-blue-600" />
							<div className="text-sm text-slate-600">Loading your school quiz bank...</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		if (roleError || dataError) {
			return (
				<div className="space-y-6">
					<Card>
						<CardContent className="py-10 text-center space-y-3">
							<AlertCircle className="w-6 h-6 mx-auto text-red-500" />
							<div className="text-sm text-slate-600">{roleError || dataError}</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		if (!schoolId) {
			return (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<AlertCircle className="w-5 h-5 text-amber-500" />
								No school assigned yet
							</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-slate-600 space-y-2">
							<p>We could not find a school assignment for this account. Ask your teacher to add you to their school in the dashboard.</p>
						</CardContent>
					</Card>
				</div>
			);
		}

		if (!questionPool.length) {
			return (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Trophy className="w-5 h-5" />
								Quizzes coming soon
							</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-slate-600 space-y-2">
							<p>Your teachers have not published any quiz questions yet. Check back later!</p>
						</CardContent>
					</Card>
				</div>
			);
		}

		const quickStartOptions = [
			{
				type: "random",
				label: "🎲 Random Mix",
				description: "10-question blend across subjects",
				count: Math.min(DEFAULT_QUESTION_COUNT, stats.total),
				enabled: stats.total > 0,
			},
			{
				type: "difficulty:easy",
				label: "🟢 Easy Warm-up",
				description: "Build confidence with easier questions",
				count: Math.min(DEFAULT_QUESTION_COUNT, stats.byDifficulty.easy),
				enabled: stats.byDifficulty.easy > 0,
			},
			{
				type: "difficulty:medium",
				label: "🟡 Medium Challenge",
				description: "Stay sharp with core topics",
				count: Math.min(DEFAULT_QUESTION_COUNT, stats.byDifficulty.medium),
				enabled: stats.byDifficulty.medium > 0,
			},
			{
				type: "difficulty:hard",
				label: "🔴 Hard Mode",
				description: "Tackle advanced problems",
				count: Math.min(DEFAULT_QUESTION_COUNT, stats.byDifficulty.hard),
				enabled: stats.byDifficulty.hard > 0,
			},
		].filter((option) => option.enabled);

		const topicButtons = topTopics.map(([topicName, count]) => ({
			type: `topic:${topicName}`,
			label: topicName,
			description: `${count} question${count === 1 ? "" : "s"}`,
			count: Math.min(DEFAULT_QUESTION_COUNT, count),
		}));

		const limitedQuizzes = availableQuizzes
			.filter((quiz) => (stats.quizCounts[quiz.id] || 0) > 0)
			.slice(0, 6);

		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Trophy className="w-6 h-6" />
							{t.quiz?.title ? t.quiz.title() : "Adaptive Quiz Practice"}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg bg-blue-50/80 p-4">
							<div className="text-center">
								<p className="text-xs text-slate-600">Total Questions</p>
								<p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
							</div>
							<div className="text-center">
								<p className="text-xs text-slate-600">Topics Covered</p>
								<p className="text-2xl font-semibold text-slate-900">{stats.topics.length}</p>
							</div>
							<div className="text-center">
								<p className="text-xs text-slate-600">Easy Level</p>
								<p className="text-2xl font-semibold text-emerald-600">{stats.byDifficulty.easy}</p>
							</div>
							<div className="text-center">
								<p className="text-xs text-slate-600">Hard Level</p>
								<p className="text-2xl font-semibold text-rose-600">{stats.byDifficulty.hard}</p>
							</div>
						</div>

						{selectionError && (
							<div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
								{selectionError}
							</div>
						)}

						{!!quickStartOptions.length && (
							<div>
								<h3 className="text-sm font-semibold mb-3 text-slate-900">Quick start</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{quickStartOptions.map((option) => (
										<Button
											key={option.type}
											onClick={() => startQuiz(option.type, { count: option.count })}
											className="h-auto py-4 flex flex-col items-start gap-1"
											variant="outline"
										>
											<span className="font-semibold">{option.label}</span>
											<span className="text-xs text-slate-500">{option.description}</span>
										</Button>
									))}
								</div>
							</div>
						)}

						{!!topicButtons.length && (
							<div>
								<h3 className="text-sm font-semibold mb-3 text-slate-900">By topic</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{topicButtons.map((topic) => (
										<Button
											key={topic.type}
											onClick={() => startQuiz(topic.type, { count: topic.count })}
											className="h-auto py-4 flex flex-col items-start gap-1"
											variant="outline"
										>
											<span className="font-semibold">{topic.label}</span>
											<span className="text-xs text-slate-500">{topic.description}</span>
										</Button>
									))}
								</div>
							</div>
						)}

						{!!limitedQuizzes.length && (
							<div>
								<h3 className="text-sm font-semibold mb-3 text-slate-900">Teacher curated quizzes</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												{limitedQuizzes.map((quiz) => {
													const count = stats.quizCounts[quiz.id] || 0;
													return (
														<Card key={quiz.id} className="border border-slate-200">
															<CardContent className="p-4 space-y-2">
																<div className="flex items-start justify-between gap-2">
																	<div>
																		<div className="font-semibold text-slate-900">{quiz.title}</div>
																										{quiz.description && (
																											<p className="text-xs text-slate-500 mt-1">{quiz.description}</p>
																										)}
																	</div>
																	<Badge className="bg-violet-100 text-violet-700 border border-violet-200 uppercase">
																		{formatDifficulty(quiz.difficulty)}
																	</Badge>
																</div>
																<div className="flex items-center justify-between text-xs text-slate-500">
																	<span>
																		{count} question{count === 1 ? "" : "s"}
																	</span>
																	<Button
																		size="sm"
																		onClick={() => startQuiz(`quiz:${quiz.id}`)}
																		className="bg-violet-600 hover:bg-violet-700"
																	>
																		Start
																	</Button>
																</div>
															</CardContent>
														</Card>
													);
												})}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	const currentQuestion = questions[currentQuestionIndex];
	if (!currentQuestion) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex justify-between items-center mb-2">
					<CardTitle className="text-lg">
						Question {currentQuestionIndex + 1} of {questions.length}
					</CardTitle>
					<Badge className={getDifficultyColor(currentQuestion.difficulty)}>
						{formatDifficulty(currentQuestion.difficulty)}
					</Badge>
				</div>
				<Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="flex items-center gap-2 text-xs text-slate-500">
					<Target className="w-4 h-4" />
					<span>
						{currentQuestion.topic || "General practice"}
						{currentQuestion.subTopic ? ` → ${currentQuestion.subTopic}` : ""}
					</span>
				</div>

				<div className="text-base md:text-lg font-semibold text-slate-900 whitespace-pre-wrap">
					{currentQuestion.text}
				</div>

				<div className="space-y-2">
					{(currentQuestion.options || []).map((option, index) => {
						const key = `${index}-${option}`;
						const isSelected = selectedAnswer === option;
						const isCorrectAnswer = option === currentQuestion.correctAnswer;
						const showCorrect = showAnswer && isCorrectAnswer;
						const showWrong = showAnswer && isSelected && !isCorrectAnswer;

						return (
							<Button
								key={key}
								onClick={() => handleAnswerSelect(option)}
								variant="outline"
								className={`w-full justify-start text-left h-auto py-3 px-4 ${
									isSelected && !showAnswer ? "border-blue-600 bg-blue-50" : ""
								} ${showCorrect ? "border-emerald-500 bg-emerald-50" : ""} ${
									showWrong ? "border-rose-500 bg-rose-50" : ""
								}`}
								disabled={showAnswer}
							>
								<div className="flex items-center gap-2 w-full">
									<span className="font-semibold">{String.fromCharCode(65 + index)}.</span>
									<span className="flex-1">{option}</span>
									{showCorrect && <CheckCircle className="w-5 h-5 text-emerald-600" />}
									{showWrong && <XCircle className="w-5 h-5 text-rose-600" />}
								</div>
							</Button>
						);
					})}
				</div>

				{showAnswer && currentQuestion.explanation && (
					<div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
						{currentQuestion.explanation}
					</div>
				)}

				<div className="flex items-center justify-between pt-4 border-t">
					<div className="flex items-center gap-2 text-sm text-slate-600">
						<Star className="w-4 h-4" />
						<span>
							Score: {score}/{currentQuestionIndex + (showAnswer ? 1 : 0)}
						</span>
					</div>

					<div className="flex gap-2">
						{currentQuestionIndex > 0 && (
							<Button onClick={handlePrevQuestion} variant="outline" size="sm">
								<ChevronLeft className="w-4 h-4 mr-1" />
								{t.common?.prev ? t.common.prev() : "Prev"}
							</Button>
						)}

						{!showAnswer ? (
							<Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} size="sm">
								Submit Answer
							</Button>
						) : (
							<Button onClick={handleNextQuestion} size="sm">
								{currentQuestionIndex + 1 === questions.length
									? "Finish"
									: t.common?.next ? t.common.next() : "Next"}
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
