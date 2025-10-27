import { Card, CardContent } from "./ui/card";
import { SubHeader } from "./sub-header";
import { Layers, Cpu, Database, HardDrive, Network, CircuitBoard } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import SkillTrackCard from "./SkillTrackCard";

export default function CourseSelection() {
	const { t } = useI18n();

	// CSE Skill Tracks (can be fetched per-user later)
		const cseSkillTracks = [
			{ title: "Data Structures", icon: <Layers className="w-6 h-6" />, progress: 60, isRecommended: true, imageSrc: "/courses.img/ds.jpg" },
			{ title: "Algorithms", icon: <Cpu className="w-6 h-6" />, progress: 35, isRecommended: false, imageSrc: "/courses.img/Algorithmr.jpg" },
			{ title: "Database Systems", icon: <Database className="w-6 h-6" />, progress: 20, isRecommended: false, imageSrc: "/courses.img/database-system.jpg" },
			{ title: "Operating Systems", icon: <HardDrive className="w-6 h-6" />, progress: 10, isRecommended: false, imageSrc: "/courses.img/pngtree-operating-system.jpg" },
			{ title: "Computer Networks", icon: <Network className="w-6 h-6" />, progress: 0, isRecommended: false, imageSrc: "/courses.img/CN.png" },
			{ title: "Digital Logic & Microprocessors", icon: <CircuitBoard className="w-6 h-6" />, progress: 0, isRecommended: false, imageSrc: "/courses.img/digital%20logic.png" },
		];

	return (
		<div className="space-y-4">
			<SubHeader showProgress showStreak user={{ streak: 7, xp: 620, xpToNextLevel: 1000, level: 10 }} />

			<Card className="border-2 bg-slate-800 dark:bg-slate-900">
				<CardContent className="p-6">
					<div className="flex items-center justify-between mb-5">
						<div>
							<h2 className="text-xl font-bold text-white">My Engineering Skill Tracks</h2>
							<p className="text-sm text-gray-300">Branch: CSE</p>
						</div>
					</div>

								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
									{cseSkillTracks.map((track) => (
							<SkillTrackCard
								key={track.title}
								title={track.title}
								icon={track.icon}
								progress={track.progress}
								isRecommended={track.isRecommended}
											imageSrc={track.imageSrc}
											variant="image-cover"
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
