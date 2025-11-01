"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { SubHeader } from "./sub-header";
import { Layers, Cpu, Database, HardDrive, Network, CircuitBoard } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
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
				</CardContent>
			</Card>
			{selectedVideoUrl && (
				<VideoModal url={selectedVideoUrl} onClose={() => setSelectedVideoUrl(null)} />
			)}
		</div>
	);
}
