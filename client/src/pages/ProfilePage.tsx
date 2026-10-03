import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronRight, Calendar, LineChart, Utensils, LogOut, User as UserIcon } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/user.service";
import { getErrorMessage } from "../services/api";

const formatEnum = (val: string) => {
  return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const ProfileRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-4 px-5 bg-[#FFFFFF] hover:bg-[#F7F8FA] transition">
    <span className="text-[#111827] font-medium text-sm">{label}</span>
    <span className="text-[#6B7280] text-sm font-medium">{value}</span>
  </div>
);

const LinkRow = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <Link to={to} className="flex justify-between items-center py-4 px-5 bg-[#FFFFFF] hover:bg-[#F7F8FA] transition group">
    <div className="flex items-center gap-3">
      <Icon className="text-[#6B7280] group-hover:text-cyan-600 transition" size={18} />
      <span className="text-[#111827] font-bold text-sm">{label}</span>
    </div>
    <ChevronRight className="text-[#9CA3AF] group-hover:text-[#6B7280] transition" size={16} />
  </Link>
);

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [saving, setSaving] = useState(false);

  // React #310 Safety: All hooks execute unconditionally.
  // Pre-populate fields from current user data when entering edit mode
  useEffect(() => {
    if (user && isEditing) {
      setName(user.name);
      setHeight(user.height?.toString() ?? "");
      setWeight(user.weight?.toString() ?? "");
      setAge(user.age?.toString() ?? "");
      setGender(user.gender ?? "");
      setActivityLevel(user.activityLevel ?? "");
      setFitnessGoal(user.fitnessGoal ?? "");
    }
  }, [user, isEditing]);

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
      setIsEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8 pb-12">
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] uppercase tracking-wide">Edit Profile</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Update your personal information</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsEditing(false)} 
            className="text-[#6B7280] hover:text-[#111827] font-bold text-sm bg-transparent px-2 py-1 transition"
          >
            Cancel
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-sm space-y-5">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] pb-3">Identity</h2>
            
            <div className="space-y-2 pt-1">
              <label htmlFor="profile-name" className="block text-sm font-bold text-[#111827]">Full Name</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="profile-email" className="block text-sm font-bold text-[#111827]">Email</label>
              <input
                id="profile-email"
                type="text"
                value={user?.email || ""}
                disabled
                className="w-full bg-[#F1F3F5] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#6B7280] font-medium cursor-not-allowed min-h-[44px]"
              />
              <p className="text-xs text-[#6B7280]">Email address cannot be changed.</p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-sm space-y-5">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] pb-3">Body Metrics</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
              <div className="space-y-2">
                <label htmlFor="profile-height" className="block text-sm font-bold text-[#111827]">Height (cm)</label>
                <input
                  id="profile-height"
                  type="number"
                  min={50}
                  max={300}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 175"
                  className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-weight" className="block text-sm font-bold text-[#111827]">Weight (kg)</label>
                <input
                  id="profile-weight"
                  type="number"
                  min={20}
                  max={500}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 70"
                  className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-age" className="block text-sm font-bold text-[#111827]">Age</label>
                <input
                  id="profile-age"
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-gender" className="block text-sm font-bold text-[#111827]">Gender</label>
                <select
                  id="profile-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
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

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-sm space-y-5">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] pb-3">Preferences</h2>
            
            <div className="space-y-5 pt-1">
              <div className="space-y-2">
                <label htmlFor="profile-activity" className="block text-sm font-bold text-[#111827]">Activity Level</label>
                <select
                  id="profile-activity"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (Little to no exercise)</option>
                  <option value="lightly_active">Lightly Active (Light exercise 1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (Moderate exercise 3-5 days/week)</option>
                  <option value="very_active">Very Active (Hard exercise 6-7 days/week)</option>
                  <option value="extremely_active">Extremely Active (Very hard exercise & physical job)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="profile-fitness-goal" className="block text-sm font-bold text-[#111827]">Fitness Goal</label>
                <select
                  id="profile-fitness-goal"
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                >
                  <option value="">Select fitness goal</option>
                  <option value="lose_fat">Lose Fat</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="build_muscle">Build Muscle</option>
                  <option value="improve_fitness">Improve General Fitness</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3.5 rounded-xl font-bold transition disabled:opacity-50 min-h-[44px] shadow-sm"
          >
            {saving ? (
              <>
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 pb-12">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] uppercase tracking-wide">Profile</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Manage your identity and fitness data</p>
        </div>
        <button 
          onClick={() => setIsEditing(true)} 
          className="bg-[#FFFFFF] border border-[#E5E7EB] text-[#111827] px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#F7F8FA] transition"
        >
          Edit Profile
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
        {/* LEFT COLUMN */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6 sm:space-y-8">
          
          {/* Identity Card */}
          <div className="flex flex-col items-center bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
            <div className="w-24 h-24 bg-cyan-50 border border-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-4xl font-bold mb-5 shadow-sm">
              {user?.name?.charAt(0).toUpperCase() || <UserIcon size={40} />}
            </div>
            <h2 className="text-xl font-bold text-[#111827] text-center">{user?.name || "User"}</h2>
            <p className="text-sm text-[#6B7280] font-medium mt-1 text-center">{user?.email}</p>
          </div>

          {/* App Nav Card */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <h3 className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider bg-[#F7F8FA] border-b border-[#E5E7EB]">
              Application
            </h3>
            <div className="divide-y divide-[#E5E7EB]">
              <LinkRow to="/programs" icon={Calendar} label="Programs" />
              <LinkRow to="/progress" icon={LineChart} label="Progress" />
              <LinkRow to="/nutrition" icon={Utensils} label="Nutrition" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6 sm:space-y-8">
          
          {/* Body & Fitness Card */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <h3 className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider bg-[#F7F8FA] border-b border-[#E5E7EB]">
              Body & Fitness
            </h3>
            <div className="divide-y divide-[#E5E7EB]">
              <ProfileRow label="Height" value={user?.height ? `${user.height} cm` : "Not set"} />
              <ProfileRow label="Weight" value={user?.weight ? `${user.weight} kg` : "Not set"} />
              <ProfileRow label="Age" value={user?.age ? `${user.age} years` : "Not set"} />
              <ProfileRow label="Gender" value={user?.gender ? formatEnum(user.gender) : "Not set"} />
              <ProfileRow label="Activity Level" value={user?.activityLevel ? formatEnum(user.activityLevel) : "Not set"} />
              <ProfileRow label="Fitness Goal" value={user?.fitnessGoal ? formatEnum(user.fitnessGoal) : "Not set"} />
            </div>
          </div>

          {/* Account Card */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden mb-6">
            <h3 className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider bg-[#F7F8FA] border-b border-[#E5E7EB]">
              Account
            </h3>
            <div className="divide-y divide-[#E5E7EB]">
               <button 
                onClick={logout} 
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 transition text-left group"
                aria-label="Log out"
               >
                 <div className="flex items-center gap-3 text-red-600">
                   <LogOut size={18} />
                   <span className="font-bold text-sm">Log Out</span>
                 </div>
                 <ChevronRight className="text-[#9CA3AF] group-hover:text-red-400 transition" size={16} />
               </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
