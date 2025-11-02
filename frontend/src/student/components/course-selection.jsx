"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { FaArrowLeft } from "react-icons/fa";
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
import { Card, CardContent } from "./ui/card";
import { SubHeader } from "./sub-header";
import styles from "./Courses.module.css";

// Static mapping of course content: subject -> topic -> lessons[]
const courseContentMap = {
	"Data Structures": {
		"Array": [
			{ id: "l1", title: "Array Lecture 1: Intro to Arrays", youtubeUrl: "https://www.youtube.com/embed/bR0NYdmMg94?si=9WUSxLbc0fvKYpB5" },
			{ id: "l2", title: "Array Lecture 2", youtubeUrl: "https://www.youtube.com/embed/-sktNalfrE0?si=rCRvcZhdlOxGyEFa" },
			{ id: "l3", title: "L-3: Array Operations", youtubeUrl: "https://www.youtube.com/embed/Bnjbun-hiBk?si=1_sH_OqvXk3g9cj7" },
			{ id: "l4", title: "L-4: 2D Arrays", youtubeUrl: "https://www.youtube.com/embed/sEiMDFdbPGo?si=GcUjpgKPcLJNn_BO" },
			{ id: "l5", title: "L-5: Dynamic Arrays", youtubeUrl: "https://www.youtube.com/embed/q8j8EqCZcWM?si=2IClfzZ3J-8pGj_6" },
			{ id: "l6", title: "L-6: Practice Problems", youtubeUrl: "https://www.youtube.com/embed/J7EhXvnixRM?si=E7IU5LaLaZa7xNCv" },
			{ id: "l7", title: "L-7: Conclusion", youtubeUrl: "https://www.youtube.com/embed/aWKJ5lRgI3U?si=SBTYTXxe4w2cprR2" }
		],
		"LinkedList": [
			{ id: "l1", title: "L-1: Intro to LinkedLists", youtubeUrl: "https://www.youtube.com/embed/TWMCMvfEAv4?si=xtbqm092tF2R-HhV" },
			{ id: "l2", title: "L-2:  Creation and Traversal ", youtubeUrl: "https://www.youtube.com/embed/BHphhqL9EOE?si=BPplOKOeo1RHmMDN" },
			{ id: "l3", title: "L-3: Insertion of a Node in a Linked List", youtubeUrl: "https://www.youtube.com/embed/ewCc7O2K5SM?si=ccNOwn6qe_4zKlxc" },
			{ id: "l4", title: "L-4: Insertion in a Linked List", youtubeUrl: "https://www.youtube.com/embed/_PuIzVqJJbA?si=WwKpY7btPPS-BUHR" },
			{ id: "l5", title: "L-5: Deletion in a Linked List", youtubeUrl: "https://www.youtube.com/embed/R_7qJzAWrMg?si=RfghT1ZT5VWxNe7b" },
			{ id: "l6", title: "L-6: Delete a Node from Linked List ", youtubeUrl: "https://www.youtube.com/embed/UQIJNobtzVY?si=SaypDPcYEl3Rgpp6" },
			{ id: "l7", title: "L-7: Circular Linked List and Operations in Data Structures", youtubeUrl: "https://www.youtube.com/embed/41lXYJID3OQ?si=mOl9KfYbzcEWKkaR" },
			{ id: "l8", title: "L-8: Circular Linked Lists part 2", youtubeUrl: "https://www.youtube.com/embed/UclZxvnOQZc?si=g0gcZ21vGSStl9OO" },
			{ id: "l9", title: "L-9: Practice Problems on Linked Lists", youtubeUrl: "https://www.youtube.com/embed/6wXZ_m3SbEs?si=c2cQLK42OthRn6fL" },
			{ id: "l10", title: "L-10: Conclusion", youtubeUrl: "https://www.youtube.com/embed/APbaAIRzQns?si=_r0meJfjxPXfDLGZ" },
		],
		"Stack": [
			{ id: "l1", title: "L-1: Introduction to Stack in Data Structures", youtubeUrl: "https://www.youtube.com/embed/-n2rVJE4vto?si=LTyBpQ83zYClJh2k" },
			{ id: "l2", title: "L-2: LIFO Principle", youtubeUrl: "https://www.youtube.com/embed/VmsTAVpz0xo?si=4DjWPNO6HiUdJvyc" },
			{ id: "l3", title: "L-3: Basic Operations", youtubeUrl: "https://www.youtube.com/embed/Flk5yrlx5Qo?si=v8TnLaQIi3z-kS38" },
			{ id: "l4", title: "L-4: Auxiliary Operations", youtubeUrl: "https://www.youtube.com/embed/V4Wwuu05_t4?si=adKTcpGxSSEfQCCW" },
			{ id: "l5", title: "L-5: Implementation", youtubeUrl: "https://www.youtube.com/embed/r2yHEW8HmBE?si=Q2Tb5DprEKIxdLSR" },
			{ id: "l6", title: "L-6: Applications of Stack", youtubeUrl: "https://www.youtube.com/embed/7jLR-al8RaM?si=dJF1jPMlHxNnFjP2" },
			{ id: "l7", title: "L-7: Practice Problems on Stack", youtubeUrl: "https://www.youtube.com/embed/ztsxdI-jCk4?si=N1jf30gXMDQWdRTV" },


		],
		"Queue": [
			{id : "l1", title: "L-1: Introduction to Queue in Data Structures", youtubeUrl: "https://www.youtube.com/embed/zp6pBNbUB2U?si=DzN64Tj1KxMhxHKJ" },
			{id : "l2", title: "L-2: Array implementation of Queue", youtubeUrl: "https://www.youtube.com/embed/JlZX7xIBjl0?si=gByymFHStp4CPPXx" },
			{id : "l3", title: "L-3: Introduction to Circular Queue", youtubeUrl: "https://www.youtube.com/embed/KqTJ5MAUj80?si=wp-mfLPxKm4G2ocB" },
			{id : "l4", title: "L-4: operations on Circular Queue", youtubeUrl: "https://www.youtube.com/embed/rtxjrVpWVmI?si=Y7j5Set5_8JmUdqO" },
			{id : "l5", title: "L-5: Double ended Queue", youtubeUrl: "https://www.youtube.com/embed/OnlgK0gjtB8?si=sClXsJdj4qIlIa0s" },
			
			
		],
		"Trees": [
			{id : "l1", title: "L-1: introduction to trees", youtubeUrl: "https://www.youtube.com/embed/oI0QhFzBSRo?si=i6nhtHc7MTJDrhKy" },
			{id : "l2", title: "L-2: Binary trees and its types", youtubeUrl: "https://www.youtube.com/embed/SCjfVE3bFik?si=kad79rIt1BfrK9mb" },
			{id : "l3", title: "L-3: traversal in Binary tree", youtubeUrl: "https://www.youtube.com/embed/UbwkQmCWcDM?si=WzYNGAOZ4iJcun_t" },
			{id : "l4", title: "L-4: Preorder/Postorder/Inorder traversal in Binary trees", youtubeUrl: "https://www.youtube.com/embed/VNegW_7OLS4?si=Err6MFTLB-JaMDoV" },
		],
		 
		// add other topics/lessons as needed
	}
	,
	"Algorithms": {
		"Sorting": [
			{ id: "l1", title: "L-1: Sorting - Intro to Sorting", youtubeUrl: "https://www.youtube.com/embed/ByLlEk7zmyw?si=Y7UjH5LU0EiC24Mc" },
			{ id: "l2", title: "L-2: Bubble sort algorithm", youtubeUrl: "https://www.youtube.com/embed/BJkpnxf5cfY?si=m7oBYDUHDmqo7GyS" },
			{ id: "l3", title: "L-3: Selection sort algorithm", youtubeUrl: "https://www.youtube.com/embed/Jb8AYaYMxq4?si=HUmPBBxYrzOgNsnO" },
			{ id: "l4", title: "L-4: quick sort algorithm", youtubeUrl: "https://www.youtube.com/embed/SN4x87ZdhGg?si=dCdomN7HelunO4c2" },
			{ id: "l5", title: "L-5: mergesort sorting Algorithm", youtubeUrl: "https://www.youtube.com/embed/6Aqxv29RGPc?si=k4KCsE5DqkDIgkb5" },

		],
		"Recursion": [
			{ id: "l1", title: "L-1: Recursion - Intro", youtubeUrl: "https://www.youtube.com/embed/3uKXlRjQwTQ" }
		],
		"Dynamic Programming": [
			{ id: "l1", title: "L-1: Dynamic Programming - Intro", youtubeUrl: "https://www.youtube.com/embed/BJkpnxf5cfY?si=m7oBYDUHDmqo7GyS" }
		]
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
    const router = useRouter();
	const searchParams = useSearchParams();
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
	const userBranch = clerkUser?.publicMetadata?.branch || "CSE";

	const [selectedSubject, setSelectedSubject] = useState(null);
	const [selectedTopic, setSelectedTopic] = useState(null);
	const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

	const cseSkillTracks = useMemo(
		() => [
			{ title: "Data Structures", icon: <Layers className="w-6 h-6" />, progress: 60, isRecommended: true, imageSrc: "/courses.img/ds.jpg" },
			{ title: "Algorithms", icon: <Cpu className="w-6 h-6" />, progress: 35, isRecommended: false, imageSrc: "/courses.img/Algorithmr.jpg" },
			{ title: "Database Systems", icon: <Database className="w-6 h-6" />, progress: 20, isRecommended: false, imageSrc: "/courses.img/database-system.jpg" },
			{ title: "Operating Systems", icon: <HardDrive className="w-6 h-6" />, progress: 10, isRecommended: false, imageSrc: "/courses.img/pngtree-operating-system.jpg" },
			{ title: "Computer Networks", icon: <Network className="w-6 h-6" />, progress: 0, isRecommended: false, imageSrc: "/courses.img/CN.png" },
			{ title: "Digital Logic & Microprocessors", icon: <CircuitBoard className="w-6 h-6" />, progress: 0, isRecommended: false, imageSrc: "/courses.img/digital%20logic.png" }
		],
		[]
	);

	const subTopicMap = useMemo(
		() => ({
			"Data Structures": [
				{ id: "array", title: "Array", youtubeUrl: "https://www.youtube.com/embed/bR0NYdmMg94" },
				{ id: "linkedlist", title: "LinkedList", youtubeUrl: "https://www.youtube.com/embed/3alv1t6dQmM" },
				{ id: "stack", title: "Stack", youtubeUrl: "https://www.youtube.com/embed/5h4jYj3A9h8" },
				{ id: "queue", title: "Queue", youtubeUrl: "https://www.youtube.com/embed/9X0m3C1Q2ZM" },
				{ id: "trees", title: "Trees", youtubeUrl: "https://www.youtube.com/embed/X2LU6m7e3EY" },
				 
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
		}),
		[]
	);

	const VideoModal = ({ url, onClose }) => {
		if (!url) return null;

		return (
			<div className={styles.videoModalBackdrop} onClick={onClose}>
				<div className={styles.videoModalContent} onClick={(event) => event.stopPropagation()}>
					<button aria-label="Close video" className={styles.modalCloseButton} onClick={onClose}>
						×
					</button>
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

	const mainContent = !selectedSubject ? (
		<div className={styles.skillTracksGrid}>
			{cseSkillTracks.map((track) => (
				<div key={track.title}>
					<SkillTrackCard
						title={track.title}
						icon={track.icon}
						progress={track.progress}
						isRecommended={track.isRecommended}
						imageSrc={track.imageSrc}
						variant="image-cover"
						onContinueClick={() => setSelectedSubject(track.title)}
					/>
				</div>
			))}
		</div>
	) : (
		<section>
			{!selectedTopic ? (
				<>
					<button
						onClick={() => {
							// If user arrived via deep link (subject query) or has history, prefer real browser back
							const cameFromDeepLink = Boolean(searchParams?.get('subject'));
							if (cameFromDeepLink && typeof window !== 'undefined' && window.history.length > 1) {
								router.back();
								return;
							}
							// Otherwise just go back to the subjects list inside this page
							setSelectedSubject(null);
						}}
						className="mb-4 inline-flex items-center gap-2 text-sm text-gray-300"
					>
						<FaArrowLeft /> Back to Courses
					</button>
					<h3 className="mb-2 text-lg font-semibold text-white">{selectedSubject}</h3>
					<p className="mb-4 text-sm text-gray-400">Choose a topic to start learning.</p>
					<div className={styles.subTopicGrid}>
						{Array.isArray(subTopicMap[selectedSubject]) ? (
							subTopicMap[selectedSubject].map((topic) => (
								<button key={topic.id} onClick={() => setSelectedTopic(topic)} className={styles.subTopicCard}>
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
					<button onClick={() => setSelectedTopic(null)} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-300">
						<FaArrowLeft /> Back to Topics
					</button>
					<h3 className="mb-2 text-lg font-semibold text-white">{selectedTopic?.title}</h3>
					<p className="mb-4 text-sm text-gray-400">Select a lesson to play.</p>
					<div className={styles.lessonList}>
						{(courseContentMap[selectedSubject]?.[selectedTopic?.title] || []).map((lesson) => (
							<button key={lesson.id} className={styles.lessonItem} onClick={() => setSelectedVideoUrl(lesson.youtubeUrl)}>
								{lesson.title}
							</button>
						))}
					</div>
				</div>
			)}
		</section>
	);

	// (preselect moved below subjectLineup definition)

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

		// Preselect subject when arriving from Dashboard links: /student/courses?subject=Algorithms
		useEffect(() => {
			const subjectParam = searchParams?.get('subject');
			if (!subjectParam || selectedSubject) return;
			const paramLower = subjectParam.toLowerCase();
			const lineupMatch = subjectLineup.find((s) => (s.name || s.title)?.toLowerCase() === paramLower);
			if (lineupMatch) {
				setSelectedSubject(lineupMatch.name || lineupMatch.title);
				return;
			}
			const fallbackMatch = cseSkillTracks.find((t) => t.title.toLowerCase() === paramLower);
			if (fallbackMatch) {
				setSelectedSubject(fallbackMatch.title);
			}
		}, [searchParams, selectedSubject, subjectLineup, cseSkillTracks]);

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

	const skillTracksHeading = translate("student.courses.skillTracksHeading", "My Engineering Skill Tracks");
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

	return (
		<div className="space-y-4">
			<SubHeader showProgress showStreak user={{ streak: 7, xp: 620, xpToNextLevel: 1000, level: 10 }} />

			<Card className="border-2 bg-slate-800 dark:bg-slate-900">
				<CardContent className="space-y-8 p-6">
					<section>
						<div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-xl font-bold text-white">{skillTracksHeading}</h2>
								<p className="text-sm text-gray-300">
									{branchLabel}: {userBranch}
								</p>
							</div>
						</div>

						{mainContent}
					</section>

					{/* Subject Tracks section removed per request (cards removed) */}
				</CardContent>
			</Card>

			{selectedVideoUrl && <VideoModal url={selectedVideoUrl} onClose={() => setSelectedVideoUrl(null)} />}
		</div>
	);
}
