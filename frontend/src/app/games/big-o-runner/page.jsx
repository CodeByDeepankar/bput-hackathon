import { Suspense } from "react";
import BigORunnerGame from "./BigORunnerGame";
import styles from "../../../student/components/Courses.module.css";

export default function Page() {
  return (
    <div className={styles.pageContainer || "p-4"}>
      <Suspense fallback={<p className={styles.loading || "text-sm text-gray-400"}>Loading Game...</p>}>
        <BigORunnerGame />
      </Suspense>
    </div>
  );
}
