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
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    // Build payload — only include non-empty fields
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
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white" id="onboarding-heading">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-slate-400">
          Tell us about yourself so we can personalize your fitness plan.
          All fields are optional — you can always update later.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="onboarding-form">
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

        <Input
          label="Fitness Goal"
          id="onboarding-goal"
          placeholder="e.g. Build muscle, Lose weight"
          maxLength={100}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />

        <Input
          label="Experience Level"
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
