import React from 'react';
import type { CustomerProfile } from '../types';
import { XIcon, SparklesIcon } from './Icons';

interface CustomerProfileFormProps {
  profile: CustomerProfile;
  setProfile: React.Dispatch<React.SetStateAction<CustomerProfile>>;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const CustomerProfileForm: React.FC<CustomerProfileFormProps> = ({ profile, setProfile, onClose, onSubmit, isLoading }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onSubmit();
    }
  };

  const inputClasses = "w-full p-3 bg-purple-light/60 border border-purple-secondary/50 rounded-md focus:ring-2 focus:ring-accent-yellow focus:outline-none text-white placeholder-gray-400";
  const labelClasses = "block text-sm font-medium text-white/80 mb-2";

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between mb-8">
         <h2 className="text-2xl font-bold text-white">Customer Profile</h2>
         <button onClick={onClose} className="md:hidden p-1 text-white/70 hover:text-white" aria-label="Close customer profile menu">
            <XIcon className="w-6 h-6" />
         </button>
       </div>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-6 flex-1 overflow-y-auto pr-2 -mr-2">
          <div>
            <label htmlFor="merchantCategory" className={labelClasses}>Favourite Merchant Category</label>
            <input type="text" name="merchantCategory" id="merchantCategory" value={profile.merchantCategory} onChange={handleChange} className={inputClasses} placeholder="e.g., Online Shopping" />
          </div>
          <div>
            <label htmlFor="age" className={labelClasses}>Age</label>
            <input type="number" name="age" id="age" value={profile.age} onChange={handleChange} className={inputClasses} placeholder="e.g., 35" />
          </div>
          <div>
            <label htmlFor="gender" className={labelClasses}>Gender</label>
            <select name="gender" id="gender" value={profile.gender} onChange={handleChange} className={inputClasses}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="userType" className={labelClasses}>Type of User</label>
            <select name="userType" id="userType" value={profile.userType} onChange={handleChange} className={inputClasses}>
              <option value="">Select Type</option>
              <option value="Power">Power</option>
              <option value="Regular">Regular</option>
              <option value="At Risk">At Risk</option>
            </select>
          </div>
          <div>
            <label htmlFor="incomeBracket" className={labelClasses}>Income Bracket (Annum)</label>
            <input type="text" name="incomeBracket" id="incomeBracket" value={profile.incomeBracket} onChange={handleChange} className={inputClasses} placeholder="e.g., 10-15 LPA" />
          </div>
          <div>
            <label htmlFor="daysOnboarded" className={labelClasses}>Days Onboarded</label>
            <input type="number" name="daysOnboarded" id="daysOnboarded" value={profile.daysOnboarded} onChange={handleChange} className={inputClasses} placeholder="e.g., 90" />
          </div>
        </div>
        <div className="mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 p-3 bg-accent-yellow text-purple-deep font-bold rounded-lg hover:opacity-90 disabled:bg-accent-yellow/50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <SparklesIcon className="w-5 h-5"/>
              Generate Campaign
            </button>
        </div>
      </form>
    </div>
  );
};