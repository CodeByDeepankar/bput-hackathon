"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { saveUserRole } from "@/lib/users";
import styles from "./role-select.module.css";

const schoolClasses = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

export default function RoleSelectPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) router.replace("/");
    if (user && !name) {
      setName(user.fullName || user.firstName || "");
    }
  }, [isLoaded, user, router]);

  const canContinue = useMemo(() => !!role, [role]);
  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (role === "student") return !!selectedClass;
    return true;
  }, [name, selectedClass, schoolName, role]);

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      try {
        // Update Clerk unsafeMetadata with role, class, and school
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            role,
            schoolId: schoolName.trim() || undefined,
            class: role === "student" ? selectedClass : undefined,
          },
        });
        if (user.reload) {
          await user.reload().catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to update Clerk unsafeMetadata', e);
      }

      await saveUserRole({
        userId: user.id,
        role,
        name: name.trim(),
        schoolId: schoolName.trim() || undefined,
        class: role === "student" ? selectedClass : undefined,
      });
      router.replace(role === "student" ? "/student" : "/teacher");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles["role-selection-container"]}>
        {step === 1 && (
          <div>
            <h1 className={styles.heading}>Choose your role</h1>
            <div className={styles.roleOptions}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={role === "student"}
                onClick={() => setRole("student")}
                onKeyDown={(e) => (e.key === "Enter" ? setRole("student") : null)}
                className={`${styles.roleCard} ${role === "student" ? styles.selected : ""}`}
              >
                🎓 I am a Student
              </div>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={role === "teacher"}
                onClick={() => setRole("teacher")}
                onKeyDown={(e) => (e.key === "Enter" ? setRole("teacher") : null)}
                className={`${styles.roleCard} ${role === "teacher" ? styles.selected : ""}`}
              >
                👨‍🏫 I am a Teacher
              </div>
            </div>
            <div className={styles.actions}>
              <button className={styles.continueBtn} disabled={!canContinue} onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className={styles.formHeading}>Tell us about yourself</h3>
            <div className={styles.formGrid}>
              <div className={styles.leftContent}>
                <label className={styles.formLabel}>Full Name<span className={styles.requiredStar}>*</span></label>
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              {role === "student" && (
                <>
                  <div>
                    <label className={styles.formLabel}>Which class are you in?<span className={styles.requiredStar}>*</span></label>
                    <select
                      className={styles.select}
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                      <option value="">Select your class</option>
                      {schoolClasses.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.formLabel}>School Name / School ID</label>
                    <input
                      className={styles.input}
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. Government High School"
                    />
                  </div>
                </>
              )}
              {role === "teacher" && (
                <div>
                  <label className={styles.formLabel}>School Name / School ID</label>
                  <input
                    className={styles.input}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Enter school name or code"
                  />
                </div>
              )}
            </div>
            <div className={styles.buttonRow}>
              <button className={styles.backBtn} onClick={() => setStep(1)} type="button">Back</button>
              <button className={styles.finishBtn} disabled={!canSubmit || saving} onClick={submit} type="button">
                {saving ? "Saving..." : "Finish Setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

