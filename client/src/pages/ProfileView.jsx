import React, { useState, useEffect } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import { useAuth } from "../contexts/AuthContext";
import { getAllProgressData } from "../services/progressService";
import { Link } from "react-router-dom";

export function ProfileView() {
    const { user, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || user?.name?.split(' ')[0] || '',
        lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        targetBand: user?.targetBand || 7.5,
        profilePicture: user?.photoURL || null
    });
    
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [preferences, setPreferences] = useState(() => {
        if (typeof window === 'undefined') {
            return {
                darkMode: false,
                emailNotifications: true,
                studyReminders: true,
                language: 'en'
            };
        }
        return {
            darkMode: localStorage.getItem('darkMode') === 'true',
            emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
            studyReminders: localStorage.getItem('studyReminders') !== 'false',
            language: localStorage.getItem('language') || 'en'
        };
    });
    
    const [progressData, setProgressData] = useState({});
    
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Update profile data when user loads
    useEffect(() => {
        if (user) {
            const nameParts = (user?.name || '').split(' ').filter(Boolean);
            setProfileData({
                firstName: user?.firstName || nameParts[0] || '',
                lastName: user?.lastName || nameParts.slice(1).join(' ') || '',
                email: user?.email || '',
                phone: user?.phone || '',
                bio: user?.bio || '',
                targetBand: user?.targetBand || 7.5,
                profilePicture: user?.photoURL || null
            });
        }
    }, [user]);

    // Load progress data for account age calculation only
    useEffect(() => {
        const loadData = () => {
            try {
                const userId = user?.email || user?.id || null;
                const data = getAllProgressData(userId);
                setProgressData(data);
            } catch (error) {
                console.error("Error loading progress data:", error);
            }
        };
        
        loadData();
        
        // Listen for progress updates
        const handleProgressUpdate = () => {
            loadData();
        };
        
        window.addEventListener('progressUpdated', handleProgressUpdate);
        const storageListener = () => handleProgressUpdate();
        window.addEventListener('storage', storageListener);
        
        return () => {
            window.removeEventListener('progressUpdated', handleProgressUpdate);
            window.removeEventListener('storage', storageListener);
        };
    }, []);

    const handleProfileChange = (field, value) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePasswordChange = (field, value) => {
        setPasswordData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePreferenceChange = (field, value) => {
        const newPreferences = {
            ...preferences,
            [field]: value
        };
        setPreferences(newPreferences);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem(field, value.toString());
            
            if (field === 'darkMode') {
                document.documentElement.classList.toggle('dark', value);
            }
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        
        try {
            // Validate
            if (!profileData.firstName.trim() || !profileData.email.trim()) {
                setMessage({ type: 'error', text: 'First name and email are required' });
                setSaving(false);
                return;
            }
            
            if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
                setMessage({ type: 'error', text: 'Please enter a valid email address' });
                setSaving(false);
                return;
            }
            
            // Simulate API call (replace with actual API call)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update localStorage auth data
            if (typeof window !== 'undefined') {
                const authData = JSON.parse(localStorage.getItem('auth') || '{}');
                authData.user = {
                    ...authData.user,
                    ...profileData,
                    name: `${profileData.firstName} ${profileData.lastName}`.trim()
                };
                localStorage.setItem('auth', JSON.stringify(authData));
            }
            
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
            
            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordSaving(true);
        setMessage({ type: '', text: '' });
        
        try {
            // Validate
            if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                setMessage({ type: 'error', text: 'All password fields are required' });
                setPasswordSaving(false);
                return;
            }
            
            if (passwordData.newPassword.length < 6) {
                setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
                setPasswordSaving(false);
                return;
            }
            
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                setMessage({ type: 'error', text: 'New passwords do not match' });
                setPasswordSaving(false);
                return;
            }
            
            // Simulate API call (replace with actual API call to /api/auth/change-password)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setMessage({ type: 'success', text: 'Password changed successfully! Please login again.' });
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            
            // Logout after password change
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleProfilePictureUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file' });
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
            return;
        }
        
        setUploading(true);
        setMessage({ type: '', text: '' });
        
        try {
            // Convert to base64 for preview (in production, upload to server)
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setProfileData(prev => ({
                    ...prev,
                    profilePicture: base64String
                }));
                
                // Update localStorage
                if (typeof window !== 'undefined') {
                    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
                    authData.user = {
                        ...authData.user,
                        photoURL: base64String
                    };
                    localStorage.setItem('auth', JSON.stringify(authData));
                }
                
                setMessage({ type: 'success', text: 'Profile picture updated!' });
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to upload profile picture' });
            setUploading(false);
        }
    };

    const getInitials = () => {
        const first = profileData.firstName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
        const last = profileData.lastName?.charAt(0)?.toUpperCase() || user?.name?.split(' ')[1]?.charAt(0)?.toUpperCase() || '';
        return `${first}${last}`.toUpperCase();
    };

    const calculateAccountAge = () => {
        // Estimate from first test entry
        const allEntries = [
            ...(progressData.reading || []),
            ...(progressData.writing || []),
            ...(progressData.listening || []),
            ...(progressData.speaking || [])
        ];
        
        if (allEntries.length === 0) return 'New member';
        
        const firstEntry = allEntries.sort((a, b) => 
            new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0)
        )[0];
        
        if (!firstEntry?.submittedAt) return 'New member';
        
        const days = Math.floor((new Date() - new Date(firstEntry.submittedAt)) / (1000 * 60 * 60 * 24));
        if (days < 30) return `${days} days`;
        if (days < 365) return `${Math.floor(days / 30)} months`;
        return `${Math.floor(days / 365)} years`;
    };

    const accountAge = calculateAccountAge();

    return (
        <AppLayout>
            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-sky-700">Profile Settings</h1>
                        <p className="text-slate-600 mt-2">Manage your account settings and preferences</p>
                    </div>
                </div>

                {/* Message Alert */}
                {message.text && (
                    <div className={`rounded-xl p-4 ${
                        message.type === 'success' 
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Information */}
                    <Panel title="Profile Information" className="lg:col-span-2">
                        <div className="space-y-6">
                            {/* Profile Picture */}
                            <div className="flex items-start gap-6">
                                <div className="relative">
                                    {profileData.profilePicture ? (
                                        <img 
                                            src={profileData.profilePicture} 
                                            alt="Profile" 
                                            className="w-24 h-24 rounded-full object-cover border-4 border-sky-100"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-sky-100">
                                            {getInitials()}
                                        </div>
                                    )}
                                    <label className="absolute bottom-0 right-0 bg-sky-600 text-white rounded-full p-2 cursor-pointer hover:bg-sky-700 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleProfilePictureUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </label>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-600 mb-1">Profile Picture</p>
                                    <p className="text-xs text-slate-500">Click the camera icon to upload a new picture</p>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        First Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.firstName}
                                        onChange={(e) => handleProfileChange('firstName', e.target.value)}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                        placeholder="First Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.lastName}
                                        onChange={(e) => handleProfileChange('lastName', e.target.value)}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                        placeholder="Last Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    onChange={(e) => handleProfileChange('email', e.target.value)}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={profileData.phone}
                                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Bio
                                </label>
                                <textarea
                                    value={profileData.bio}
                                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                                    disabled={!isEditing}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Target IELTS Band
                                </label>
                                <select
                                    value={profileData.targetBand}
                                    onChange={(e) => handleProfileChange('targetBand', parseFloat(e.target.value))}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                    {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(band => (
                                        <option key={band} value={band}>{band}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                // Reset to original values
                                                setProfileData({
                                                    firstName: user?.firstName || user?.name?.split(' ')[0] || '',
                                                    lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
                                                    email: user?.email || '',
                                                    phone: user?.phone || '',
                                                    bio: user?.bio || '',
                                                    targetBand: user?.targetBand || 7.5,
                                                    profilePicture: user?.photoURL || null
                                                });
                                            }}
                                            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </Panel>

                    {/* Account Information */}
                    <Panel title="Account Information">
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Member Since</p>
                                <p className="text-sm font-semibold text-slate-700">{accountAge}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Account Status</p>
                                <p className="text-sm font-semibold text-emerald-600">Active</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Email Verified</p>
                                <p className="text-sm font-semibold text-slate-700">
                                    {user?.emailVerified ? '✓ Verified' : '⚠ Not Verified'}
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-200">
                                <Link
                                    to="/dashboard"
                                    className="block w-full text-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* Security and Preferences */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Security */}
                    <Panel title="Security">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                    placeholder="Enter new password"
                                />
                                <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <button
                                onClick={handleChangePassword}
                                disabled={passwordSaving}
                                className="w-full px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {passwordSaving ? 'Changing Password...' : 'Change Password'}
                            </button>
                            <p className="text-xs text-slate-500">
                                You will be logged out after changing your password for security.
                            </p>
                        </div>
                    </Panel>

                    {/* Preferences */}
                    <Panel title="Preferences">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Dark Mode</p>
                                    <p className="text-xs text-slate-500">Toggle dark theme</p>
                                </div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.darkMode}
                                        onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-sky-600 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Email Notifications</p>
                                    <p className="text-xs text-slate-500">Receive email updates</p>
                                </div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailNotifications}
                                        onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-sky-600 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Study Reminders</p>
                                    <p className="text-xs text-slate-500">Get reminders to practice</p>
                                </div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.studyReminders}
                                        onChange={(e) => handlePreferenceChange('studyReminders', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-sky-600 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                                </label>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Language
                                </label>
                                <select
                                    value={preferences.language}
                                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                >
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="zh">Chinese</option>
                                </select>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </AppLayout>
    );
}
