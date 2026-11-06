import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/user.service";
import { getErrorMessage } from "../services/api";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    // Build payload — only include valid non-empty fields
    const payload: Record<string, string | number> = {};

    if (height.trim()) {
      const h = Number(height);
      if (!Number.isFinite(h) || h < 50 || h > 300) {
        toast.error("Height must be between 50 and 300 cm");
        setSaving(false);
        return;
      }
      payload.height = h;
    }

    if (weight.trim()) {
      const w = Number(weight);
      if (!Number.isFinite(w) || w < 20 || w > 500) {
        toast.error("Weight must be between 20 and 500 kg");
        setSaving(false);
        return;
      }
      payload.weight = w;
    }

    if (age.trim()) {
      const a = Number(age);
      if (!Number.isInteger(a) || a < 13 || a > 120) {
        toast.error("Age must be an integer between 13 and 120");
        setSaving(false);
        return;
      }
      payload.age = a;
    }

    if (gender) {
      payload.gender = gender;
    }

    if (activityLevel) {
      payload.activityLevel = activityLevel;
    }

    if (fitnessGoal) {
      payload.fitnessGoal = fitnessGoal;
    }

    if (goal.trim()) {
      if (goal.trim().length > 100) {
        toast.error("Goal must be at most 100 characters");
        setSaving(false);
        return;
      }
      payload.goal = goal.trim();
    }

    if (experience.trim()) {
      if (experience.trim().length > 100) {
        toast.error("Experience must be at most 100 characters");
        setSaving(false);
        return;
      }
      payload.experience = experience.trim();
    }

    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      const resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolvedTz) {
        payload.timezone = resolvedTz;
      }
    }

    if (Object.keys(payload).length === 0) {
      toast("No fields to save — heading to the dashboard!", { icon: "👋" });
      navigate("/dashboard");
      return;
    }

    try {
      await updateProfile(payload);
      await refreshUser();
      toast.success("Profile updated!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-[#111827]" id="onboarding-heading">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-[#6B7280]">
          Tell us about yourself so we can personalize your training plan and calculate your daily nutrition targets.
          All fields are optional — you can always update them later in your profile.
        </p>
      </div>

      <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 text-xs font-medium text-cyan-800 leading-relaxed">
        💡 Completing your <strong>height</strong>, <strong>weight</strong>, <strong>age</strong>, <strong>gender</strong>, <strong>activity level</strong>, and <strong>fitness goal</strong> automatically calculates your personalized daily calorie and protein targets.
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="onboarding-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Height (cm)"
            type="number"
            id="onboarding-height"
            placeholder="e.g. 175"
            min={50}
            max={300}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />

          <Input
            label="Weight (kg)"
            type="number"
            id="onboarding-weight"
            placeholder="e.g. 70"
            min={20}
            max={500}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Age"
            type="number"
            id="onboarding-age"
            placeholder="e.g. 25"
            min={13}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <div className="w-full">
            <label htmlFor="onboarding-gender" className="mb-2 block text-sm font-medium text-[#111827]">
              Gender
            </label>
            <select
              id="onboarding-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[#111827] outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 min-h-[48px]"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="w-full">
          <label htmlFor="onboarding-activity" className="mb-2 block text-sm font-medium text-[#111827]">
            Activity Level
          </label>
          <select
            id="onboarding-activity"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[#111827] outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 min-h-[48px]"
          >
            <option value="">Select activity level</option>
            <option value="sedentary">Sedentary (Little to no exercise)</option>
            <option value="lightly_active">Lightly Active (Light exercise 1-3 days/week)</option>
            <option value="moderately_active">Moderately Active (Moderate exercise 3-5 days/week)</option>
            <option value="very_active">Very Active (Hard exercise 6-7 days/week)</option>
            <option value="extremely_active">Extremely Active (Very hard exercise & physical job)</option>
          </select>
        </div>

        <div className="w-full">
          <label htmlFor="onboarding-fitness-goal" className="mb-2 block text-sm font-medium text-[#111827]">
            Primary Fitness Goal
          </label>
          <select
            id="onboarding-fitness-goal"
            value={fitnessGoal}
            onChange={(e) => setFitnessGoal(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[#111827] outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 min-h-[48px]"
          >
            <option value="">Select fitness goal</option>
            <option value="lose_fat">Lose Fat</option>
            <option value="maintain">Maintain Weight</option>
            <option value="build_muscle">Build Muscle</option>
            <option value="improve_fitness">Improve General Fitness</option>
          </select>
        </div>

        <Input
          label="Specific Goal / Notes (Optional)"
          id="onboarding-goal"
          placeholder="e.g. Bench press 100kg, Run a 5k"
          maxLength={100}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />

        <Input
          label="Experience Level (Optional)"
          id="onboarding-experience"
          placeholder="e.g. Beginner, Intermediate, Advanced"
          maxLength={100}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        />

        <div className="flex gap-4 pt-2">
          <Button type="submit" loading={saving} id="onboarding-submit">
            Save & Continue
          </Button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:border-slate-500"
            id="onboarding-skip"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
