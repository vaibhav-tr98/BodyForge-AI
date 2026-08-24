import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/user.service";
import { getErrorMessage } from "../services/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-populate fields from current user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setHeight(user.height?.toString() ?? "");
      setWeight(user.weight?.toString() ?? "");
      setAge(user.age?.toString() ?? "");
      setGender(user.gender ?? "");
      setActivityLevel(user.activityLevel ?? "");
      setFitnessGoal(user.fitnessGoal ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, string | number> = {};

    if (name.trim()) {
      if (name.trim().length < 2 || name.trim().length > 50) {
        toast.error("Name must be between 2 and 50 characters");
        setSaving(false);
        return;
      }
      payload.name = name.trim();
    }

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
        toast.error("Age must be between 13 and 120");
        setSaving(false);
        return;
      }
      payload.age = a;
    }

    if (gender) payload.gender = gender;
    if (activityLevel) payload.activityLevel = activityLevel;
    if (fitnessGoal) payload.fitnessGoal = fitnessGoal;

    if (Object.keys(payload).length === 0) {
      toast.error("No changes to save");
      setSaving(false);
      return;
    }

    try {
      await updateProfile(payload);
      await refreshUser();
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white" id="profile-heading">
          Your Profile
        </h1>
        <p className="mt-2 text-slate-400">
          Update your personal information and fitness preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="profile-form">
        {/* PROFILE SECTION */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Profile</h2>
          
          <Input
            label="Full Name"
            id="profile-name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="text-sm text-slate-500">
            Email: <span className="text-slate-300">{user?.email}</span>
            <span className="ml-2 text-slate-600">(cannot be changed)</span>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* BODY METRICS SECTION */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Body Metrics</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Height (cm)"
              type="number"
              id="profile-height"
              placeholder="e.g. 175"
              min={50}
              max={300}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />

            <Input
              label="Weight (kg)"
              type="number"
              id="profile-weight"
              placeholder="e.g. 70"
              min={20}
              max={500}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              id="profile-age"
              placeholder="e.g. 25"
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />

            <div className="space-y-1">
              <label htmlFor="profile-gender" className="block text-sm font-medium text-slate-300">
                Gender
              </label>
              <select
                id="profile-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* FITNESS SECTION */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Fitness</h2>

          <div className="space-y-1">
            <label htmlFor="profile-activity" className="block text-sm font-medium text-slate-300">
              Activity Level
            </label>
            <select
              id="profile-activity"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select activity level</option>
              <option value="sedentary">Sedentary</option>
              <option value="lightly_active">Lightly Active</option>
              <option value="moderately_active">Moderately Active</option>
              <option value="very_active">Very Active</option>
              <option value="extremely_active">Extremely Active</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="profile-fitness-goal" className="block text-sm font-medium text-slate-300">
              Fitness Goal
            </label>
            <select
              id="profile-fitness-goal"
              value={fitnessGoal}
              onChange={(e) => setFitnessGoal(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select fitness goal</option>
              <option value="lose_fat">Lose Fat</option>
              <option value="maintain">Maintain</option>
              <option value="build_muscle">Build Muscle</option>
              <option value="improve_fitness">Improve Fitness</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" loading={saving} id="profile-submit">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
