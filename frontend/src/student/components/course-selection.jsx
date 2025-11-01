
"use client";
import { useState, useEffect } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { Card, CardContent } from "./ui/card";
import { SubHeader } from "./sub-header";
import {
	Layers,
	Cpu,
	Database,
	HardDrive,
	Network,
	CircuitBoard,
	BookOpen,
	PenTool,
	Cog,
	FlaskConical
} from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { useSubjects } from "@/hooks/useApi";
import { fetchUserRole } from "@/lib/users";
import { getSubjectsForBranch, formatBranchName } from "@/student/data/branchSubjects";
import SkillTrackCard from "./SkillTrackCard";
import { useUser } from '@clerk/nextjs';
import { FaArrowLeft } from 'react-icons/fa';
import styles from "./Courses.module.css";

// Static mapping of course content: subject -> topic -> lessons[]
const courseContentMap = {
	"Data Structures": {
		"Array": [
			{ id: "l1", title: "Array Lecture 1: Intro to Arrays", youtubeUrl: "https://www.youtube.com/embed/bR0NYdmMg94?si=9WUSxLbc0fvKYpB5" },
			{ id: "l2", title: "Array Lecture 2", youtubeUrl: "https://www.youtube.com/embed/-sktNalfrE0?si=rCRvcZhdlOxGyEFa" },
			{ id: "l3", title: "L-3: Array Operations", youtubeUrl: "" },
			{ id: "l4", title: "L-4: 2D Arrays", youtubeUrl: "" },
			{ id: "l5", title: "L-5: Dynamic Arrays", youtubeUrl: "" },
			{ id: "l6", title: "L-6: Practice Problems", youtubeUrl: "" },
			{ id: "l7", title: "L-7: Conclusion", youtubeUrl: "" }
		],
		"LinkedList": [
			{ id: "l1", title: "L-1: Intro to LinkedLists", youtubeUrl: "" }
		]
		// add other topics/lessons as needed
	}
};

const ICON_PALETTE = [
	Layers,
	Cpu,
	Database,
	HardDrive,
	Network,
	CircuitBoard,
	BookOpen,
	PenTool,
	Cog,
	FlaskConical
];

function parseClassValue(value) {
	if (!value) return null;
	const match = String(value).match(/^([A-Za-z]+)[-_\s]*Sem(?:ester)?\s*(\d{1,2})$/i);
	if (!match) return null;
	const rawBranch = match[1];
	const semesterNumber = Number(match[2]);
	if (!Number.isFinite(semesterNumber)) return null;
	const branchKey = rawBranch.toUpperCase();
	const branchDisplay = formatBranchName(rawBranch);
	return {
		branchKey,
		branchDisplay,
		branchForClass: branchDisplay,
		semester: semesterNumber
	};
}

function normalizeSemester(value) {
	const numeric = Number(value);
	return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export default function CourseSelection() {

	const { t } = useI18n();

	 
	const { user: clerkUser } = useUser();
	const userBranch = clerkUser?.publicMetadata?.branch || 'CSE';

	 

	 
 	const [selectedSubject, setSelectedSubject] = useState(null);
 	const [selectedTopic, setSelectedTopic] = useState(null);
 	const [userSubjects, setUserSubjects] = useState([]);
 	const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

	const cseSkillTracks = [
		{ title: "Data Structures", icon: <Layers className="w-6 h-6" />, progress: 60, isRecommended: true, imageSrc: "/courses.img/ds.jpg" },
		{ title: "Algorithms", icon: <Cpu className="w-6 h-6" />, progress: 35, isRecommended: false, imageSrc: "/courses.img/Algorithmr.jpg" },
		{ title: "Database Systems", icon: <Database className="w-6 h-6" />, progress: 20, isRecommended: false, imageSrc: "/courses.img/database-system.jpg" },
		{ title: "Operating Systems", icon: <HardDrive className="w-6 h-6" />, progress: 10, isRecommended: false, imageSrc: "/courses.img/pngtree-operating-system.jpg" },
		{ title: "Computer Networks", icon: <Network className="w-6 h-6" />, progress: 0, isRecommended: false, imageSrc: "/courses.img/CN.png" },
		{ title: "Digital Logic & Microprocessors", icon: <CircuitBoard className="w-6 h-6" />, progress: 0, isRecommended: false, imageSrc: "/courses.img/digital%20logic.png" },
	];

	 
	const subTopicMap = {
		"Data Structures": [
			{ id: "array", title: "Array", youtubeUrl: "https://www.youtube.com/embed/bR0NYdmMg94" },
			{ id: "linkedlist", title: "LinkedList", youtubeUrl: "https://www.youtube.com/embed/3alv1t6dQmM" },
			{ id: "stack", title: "Stack", youtubeUrl: "https://www.youtube.com/embed/5h4jYj3A9h8" },
			{ id: "queue", title: "Queue", youtubeUrl: "https://www.youtube.com/embed/9X0m3C1Q2ZM" },
			{ id: "trees", title: "Trees", youtubeUrl: "https://www.youtube.com/embed/X2LU6m7e3EY" },
			{ id: "graph", title: "Graph", youtubeUrl: "https://www.youtube.com/embed/8j0UDiN7my4" }
		],
		"Algorithms": [
			{ id: "sorting", title: "Sorting", youtubeUrl: "https://www.youtube.com/embed/ZZuD6iUe3Pc" },
			{ id: "recursion", title: "Recursion", youtubeUrl: "https://www.youtube.com/embed/3uKXlRjQwTQ" },
			{ id: "dp", title: "Dynamic Programming", youtubeUrl: "https://www.youtube.com/embed/oBt53YbR9Kk" }
		],
		"Database Systems": [
			{ id: "sql", title: "SQL Basics", youtubeUrl: "https://www.youtube.com/embed/7uGZy0Cq1xk" },
			{ id: "joins", title: "SQL Joins", youtubeUrl: "https://www.youtube.com/embed/9Pzj7Aj25lw" }
		],
		"Operating Systems": [
			{ id: "process", title: "Process vs Thread", youtubeUrl: "https://www.youtube.com/embed/3D9nD2Y6g6s" },
			{ id: "scheduling", title: "Scheduling Algos", youtubeUrl: "https://www.youtube.com/embed/7a4kWk0g0zs" }
		],
		"Computer Networks": [
			{ id: "tcpip", title: "TCP/IP Basics", youtubeUrl: "https://www.youtube.com/embed/ee5gq8w3ZfA" },
			{ id: "routing", title: "Routing", youtubeUrl: "https://www.youtube.com/embed/2y2Bf1t6Iks" }
		],
		"Digital Logic & Microprocessors": [
			{ id: "boolean", title: "Boolean Algebra", youtubeUrl: "https://www.youtube.com/embed/1gkVjQw3PzE" },
			{ id: "micro", title: "Microprocessor Basics", youtubeUrl: "https://www.youtube.com/embed/6h3Gz3e4d7A" }
		]
	};

	useEffect(() => {
		 
		setUserSubjects(cseSkillTracks.map((s) => s.title));
	}, []);
 
	const VideoModal = ({ url, onClose }) => {
		if (!url) return null;
		// Render modal using CSS module classes. Unmounting the iframe when url is cleared stops playback.
		return (
			<div className={styles.videoModalBackdrop} onClick={onClose}>
				<div className={styles.videoModalContent} onClick={(e) => e.stopPropagation()}>
					<button aria-label="Close video" className={styles.modalCloseButton} onClick={onClose}>×</button>
					<div className={styles.videoWrapper}>
						<iframe
							src={url}
							title="YouTube video player"
							frameBorder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
						></iframe>
					</div>
				</div>
			</div>
		);
	};

	// Build the main content for the card to avoid deeply nested JSX/ternaries
	const mainContent = !selectedSubject ? (
		<div className={styles.skillTracksGrid}>
			{cseSkillTracks.map((track) => (
				<div
					key={track.title}
					onClick={() => setSelectedSubject(track.title)}
					className="cursor-pointer"
				>
					<SkillTrackCard
						title={track.title}
						icon={track.icon}
						progress={track.progress}
						isRecommended={track.isRecommended}
						imageSrc={track.imageSrc}
						variant="image-cover"
					/>
				</div>
			))}
		</div>
	) : (
		<section>
			{!selectedTopic ? (
				<>
					<button
						onClick={() => setSelectedSubject(null)}
						className="inline-flex items-center gap-2 mb-4 text-sm text-gray-300"
					>
						<FaArrowLeft /> Back to Courses
					</button>
					<h3 className="text-lg font-semibold text-white mb-2">{selectedSubject}</h3>
					<p className="text-sm text-gray-400 mb-4">Choose a topic to start learning.</p>
					<div className={styles.subTopicGrid}>
						{Array.isArray(subTopicMap[selectedSubject]) ? (
							subTopicMap[selectedSubject].map((topic) => (
								<button
									key={topic.id}
									onClick={() => setSelectedTopic(topic)}
									className={styles.subTopicCard}
								>
									{topic.title}
								</button>
							))
						) : (
							<p className="text-sm text-gray-400">No sub-topics found for {selectedSubject}.</p>
						)}
					</div>
				</>
			) : (
				<div className={styles.lessonView}>
					<button
						onClick={() => setSelectedTopic(null)}
						className="inline-flex items-center gap-2 mb-4 text-sm text-gray-300"
					>
						<FaArrowLeft /> Back to Topics
					</button>
					<h3 className="text-lg font-semibold text-white mb-2">{selectedTopic?.title}</h3>
					<p className="text-sm text-gray-400 mb-4">Select a lesson to play.</p>
					<div className={styles.lessonList}>
						{(courseContentMap[selectedSubject]?.[selectedTopic?.title] || []).map((lesson) => (
							<button
								key={lesson.id}
								className={styles.lessonItem}
								onClick={() => setSelectedVideoUrl(lesson.youtubeUrl)}
							>
								{lesson.title}
							</button>
						))}
					</div>
				</div>
			)}
		</section>
	);

		const { t } = useI18n();
		const translate = useCallback(
			(path, fallback) => {
				if (!path) return fallback;
				const segments = path.split(".");
				let cursor = t;

				for (const segment of segments) {
					if (cursor == null) break;
					cursor = cursor[segment];
				}

				if (typeof cursor === "function") {
					try {
						const value = cursor();
						return value == null ? fallback : value;
					} catch (error) {
						console.warn("translate() failed for", path, error);
						return fallback;
					}
				}

				if (cursor != null) {
					return String(cursor);
				}

				return fallback;
			},
			[t]
		);
	const { user: clerkUser, isLoaded } = useUser();
	const [roleDoc, setRoleDoc] = useState(null);
	const [roleError, setRoleError] = useState(null);
	const [roleLoading, setRoleLoading] = useState(true);

	useEffect(() => {
		if (!isLoaded) return;

		if (!clerkUser?.id) {
			setRoleDoc(null);
			setRoleError(null);
			setRoleLoading(false);
			return;
		}

		let cancelled = false;
		setRoleLoading(true);
		fetchUserRole(clerkUser.id)
			.then((doc) => {
				if (cancelled) return;
				setRoleDoc(doc);
				setRoleError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				setRoleDoc(null);
				setRoleError(err?.message || "Unable to load student profile");
			})
			.finally(() => {
				if (cancelled) return;
				setRoleLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [isLoaded, clerkUser?.id]);

	const parsedClass = useMemo(() => parseClassValue(roleDoc?.class), [roleDoc?.class]);

	const metadataBranchRaw = clerkUser?.publicMetadata?.branch
		? String(clerkUser.publicMetadata.branch)
		: null;
	const metadataSemester = clerkUser?.publicMetadata?.semester
		? normalizeSemester(clerkUser.publicMetadata.semester)
		: null;

	const branchKey = useMemo(() => {
		if (parsedClass?.branchKey) return parsedClass.branchKey;
		if (metadataBranchRaw) return metadataBranchRaw.toUpperCase();
		return "CSE";
	}, [parsedClass?.branchKey, metadataBranchRaw]);

	const branchForDisplay = useMemo(() => {
		if (parsedClass?.branchDisplay) return parsedClass.branchDisplay;
		if (metadataBranchRaw) return formatBranchName(metadataBranchRaw);
		return formatBranchName(branchKey);
	}, [parsedClass?.branchDisplay, metadataBranchRaw, branchKey]);

	const branchForClass = useMemo(() => {
		if (parsedClass?.branchForClass) return parsedClass.branchForClass;
		if (metadataBranchRaw) return formatBranchName(metadataBranchRaw);
		return formatBranchName(branchKey);
	}, [parsedClass?.branchForClass, metadataBranchRaw, branchKey]);

	const semesterNumber = useMemo(() => {
		if (parsedClass?.semester) return parsedClass.semester;
		if (metadataSemester) return metadataSemester;
		return 1;
	}, [parsedClass?.semester, metadataSemester]);

		const semesterDisplay = useMemo(
			() => `${translate("student.courses.semesterLabel", "Semester")} ${semesterNumber}`,
			[translate, semesterNumber]
		);

	const classFilter = useMemo(
		() => `${branchForClass}-Sem${semesterNumber}`,
		[branchForClass, semesterNumber]
	);

	const schoolId = roleDoc?.schoolId || roleDoc?.school_id || null;

	const {
		subjects,
		loading: subjectsLoading,
		error: subjectsError
	} = useSubjects({
		classFilter,
		schoolId,
		enabled: Boolean(branchForClass && semesterNumber)
	});

	const fallbackSubjects = useMemo(
		() => getSubjectsForBranch(branchKey, semesterNumber),
		[branchKey, semesterNumber]
	);

	const normalizedSubjects = useMemo(() => {
		if (!Array.isArray(subjects) || subjects.length === 0) return [];
		return subjects.map((subject) => ({
			id: subject.id,
			name: subject.name,
			summary:
				subject.description ||
				fallbackSubjects.find((item) => item.name === subject.name)?.summary ||
				""
		}));
	}, [subjects, fallbackSubjects]);

		const usingFallback = useMemo(
			() => !subjectsLoading && normalizedSubjects.length === 0,
			[subjectsLoading, normalizedSubjects]
		);

	const subjectLineup = useMemo(
		() => (normalizedSubjects.length > 0 ? normalizedSubjects : fallbackSubjects),
		[normalizedSubjects, fallbackSubjects]
	);

	const subjectCards = useMemo(() => {
		return subjectLineup.map((subject, index) => {
			const Icon = ICON_PALETTE[index % ICON_PALETTE.length];
			const progress = Math.min(95, 35 + index * 12);
			return {
				key: subject.id || `${subject.name}-${index}`,
				title: subject.name,
				icon: <Icon className="w-6 h-6" />,
				progress,
				isRecommended: index === 0,
				summary: subject.summary || ""
			};
		});
	}, [subjectLineup]);

		const headingLabel = translate("student.courses.subjectTracks", "My Engineering Subject Tracks");
		const branchLabel = translate("student.courses.branchLabel", "Branch");
		const loadingLabel = translate("student.courses.loading", "Loading personalized subjects...");
		const fallbackNotice = translate(
			"student.courses.fallbackNotice",
			"Showing standard curriculum preview until your teacher publishes subjects."
		);
		const emptyStateLabel = translate(
			"student.courses.empty",
			"Subjects will appear here once your teacher assigns them."
		);
>>>>

	return (
		<div className="space-y-4">
			<SubHeader showProgress showStreak user={{ streak: 7, xp: 620, xpToNextLevel: 1000, level: 10 }} />

			<Card className="border-2 bg-slate-800 dark:bg-slate-900">
				<CardContent className="p-6">
					<div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>

							<h2 className="text-xl font-bold text-white">My Engineering Skill Tracks</h2>
							<p className="text-sm text-gray-300">Branch: {userBranch}</p>
						</div>
					</div>

					{mainContent}

							<h2 className="text-xl font-bold text-white">{headingLabel}</h2>
							<p className="text-sm text-gray-300">
								{branchLabel}: {branchForDisplay} • {semesterDisplay}
							</p>
						</div>
					</div>

					{roleError && (
						<div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
							{roleError}
						</div>
					)}

					{subjectsError && (
						<div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
							{subjectsError}
						</div>
					)}

					{(roleLoading || subjectsLoading) && (
						<div className="mb-4 text-sm text-gray-300">{loadingLabel}</div>
					)}

					{subjectCards.length === 0 && !subjectsLoading ? (
						<div className="rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-sm text-gray-300">
							{emptyStateLabel}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
							{subjectCards.map((track) => (
								<SkillTrackCard
									key={track.key}
									title={track.title}
									icon={track.icon}
									progress={track.progress}
									isRecommended={track.isRecommended}
									footer={
										track.summary ? (
											<p className="mt-3 text-xs leading-relaxed text-gray-300">{track.summary}</p>
										) : null
									}
								/>
							))}
						</div>
					)}

					{usingFallback && subjectCards.length > 0 && (
						<div className="mt-4 text-xs text-gray-400">{fallbackNotice}</div>
					)}

				</CardContent>
			</Card>
			{selectedVideoUrl && (
				<VideoModal url={selectedVideoUrl} onClose={() => setSelectedVideoUrl(null)} />
			)}
		</div>
	);
}
