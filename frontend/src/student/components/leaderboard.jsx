import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

export default function Leaderboard() {
	const { t } = useI18n();
	const [leaders, setLeaders] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/leaderboard", { cache: "no-store" })
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data)) {
					setLeaders(data);
				}
			})
			.catch((err) => console.error("Error fetching leaderboard:", err))
			.finally(() => setLoading(false));
	}, []);

	return (
		<Card className="bg-slate-900/90 border-slate-800 text-slate-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-amber-400">
					<Trophy className="w-5 h-5 text-amber-400" /> {t.leaderboard.title()}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{loading ? (
					<p className="text-sm text-slate-400 py-4 text-center">Loading leaderboard...</p>
				) : leaders.length === 0 ? (
					<p className="text-sm text-slate-400 py-4 text-center">No student rankings available yet.</p>
				) : (
					leaders.map((l, i) => (
						<div key={l.studentId || i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
							<div className="flex items-center gap-3">
								<Avatar className="w-8 h-8 bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
									<AvatarFallback>{(l.name || "S").charAt(0).toUpperCase()}</AvatarFallback>
								</Avatar>
								<div>
									<span className="font-medium text-slate-200">{i + 1}. {l.name}</span>
									{l.class && <span className="text-xs text-slate-400 block">{l.class}</span>}
								</div>
							</div>
							<span className="text-sm font-semibold text-amber-400">{l.xp || 0} {t.leaderboard.xpSuffix()}</span>
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}

