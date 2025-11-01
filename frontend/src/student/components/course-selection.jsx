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

	return (
		<div className="space-y-4">
			<SubHeader showProgress showStreak user={{ streak: 7, xp: 620, xpToNextLevel: 1000, level: 10 }} />

			<Card className="border-2 bg-slate-800 dark:bg-slate-900">
				<CardContent className="p-6">
					<div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
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
		</div>
	);
}
