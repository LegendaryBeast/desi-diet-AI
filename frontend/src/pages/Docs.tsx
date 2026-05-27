import React, { useState, useEffect } from 'react';
import { 
  Settings, Lock, Unlock, Calendar, Edit3, Save, Plus, Trash2, 
  ArrowUp, ArrowDown, Layers, Globe, Users, CheckCircle, Clock, 
  TrendingUp, Database, Cpu, BookOpen, Award, FileText, ChevronRight,
  Shield, AlertTriangle, Play, Check, Search, Download, RefreshCw
} from 'lucide-react';
import { docsApi, DocsConfigResponse, LiveStatsResponse, TeamMember, DocSection } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export const Docs: React.FC = () => {
  const { isLoggedIn, user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<DocsConfigResponse | null>(null);
  const [stats, setStats] = useState<LiveStatsResponse | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'pitch' | 'tech' | 'dashboard' | 'admin'>('pitch');
  const [selectedPitchSec, setSelectedPitchSec] = useState<string>('pitch_problem');
  const [selectedTechSec, setSelectedTechSec] = useState<string>('tech_overview');

  // Admin login overlay (if 403 restricted)
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin Panel states
  const [editingSectionId, setEditingSectionId] = useState<string>('pitch_problem');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  // Admin Settings states
  const [adminVisibility, setAdminVisibility] = useState(true);
  const [adminOverrideSchedule, setAdminOverrideSchedule] = useState(true);
  const [adminStartDate, setAdminStartDate] = useState('2026-06-10T00:00:00');
  const [adminEndDate, setAdminEndDate] = useState('2026-06-14T23:59:59');
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Team states
  const [adminTeamName, setAdminTeamName] = useState('');
  const [adminTeamMembers, setAdminTeamMembers] = useState<TeamMember[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  // API Search State
  const [apiSearchQuery, setApiSearchQuery] = useState('');

  // Load documentation configuration and live stats
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const configRes = await docsApi.getConfig();
      setConfig(configRes);
      
      // Load default edit panel values
      if (configRes.sections && configRes.sections.length > 0) {
        const firstSec = configRes.sections[0];
        setEditingSectionId(firstSec.id);
        setEditTitle(firstSec.title);
        setEditContent(firstSec.content);
      }
      setAdminVisibility(configRes.visibility);
      setAdminOverrideSchedule(configRes.override_schedule);
      setAdminStartDate(configRes.start_date.substring(0, 19));
      setAdminEndDate(configRes.end_date.substring(0, 19));
      setAdminTeamName(configRes.team_name);
      setAdminTeamMembers(configRes.team_members || []);

      // If authorized, load stats
      const statsRes = await docsApi.getLiveStats();
      setStats(statsRes);
    } catch (err: any) {
      if (err.status === 403) {
        setError("restricted");
      } else {
        setError(err.message || "Failed to load documentation configuration.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isLoggedIn]);

  // Handle Admin Login Bypass
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await login(adminEmail, adminPassword);
      setShowAdminLogin(false);
      setError(null);
      fetchData();
    } catch (err: any) {
      setAuthError(err.message || "Invalid administrator credentials.");
    }
  };

  // Handle Visibility Settings Update
  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await docsApi.updateSettings({
        visibility: adminVisibility,
        override_schedule: adminOverrideSchedule,
        start_date: adminStartDate,
        end_date: adminEndDate
      });
      alert(res.message);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update visibility settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Section Content Update
  const handleUpdateSection = async () => {
    setSavingSection(true);
    try {
      const res = await docsApi.updateSection({
        id: editingSectionId,
        title: editTitle,
        content: editContent
      });
      alert(res.message);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update section content.");
    } finally {
      setSavingSection(false);
    }
  };

  // Select section to edit in Admin Panel
  const handleSelectEditingSection = (id: string) => {
    if (!config) return;
    const sec = config.sections.find(s => s.id === id);
    if (sec) {
      setEditingSectionId(id);
      setEditTitle(sec.title);
      setEditContent(sec.content);
    }
  };

  // Handle Section Reordering
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const sections = [...config.sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    // Swap
    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;

    try {
      await docsApi.reorderSections(sections.map(s => s.id));
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to reorder sections.");
    }
  };

  // Admin Team modifications
  const handleAddTeamMember = () => {
    setAdminTeamMembers([
      ...adminTeamMembers,
      { name: 'New Member', role: 'Developer', email: 'developer@desidiet.com', image_url: '' }
    ]);
  };

  const handleRemoveTeamMember = (idx: number) => {
    setAdminTeamMembers(adminTeamMembers.filter((_, i) => i !== idx));
  };

  const handleUpdateMemberField = (idx: number, field: keyof TeamMember, val: string) => {
    const updated = [...adminTeamMembers];
    updated[idx] = { ...updated[idx], [field]: val };
    setAdminTeamMembers(updated);
  };

  const handleSaveTeam = async () => {
    setSavingTeam(true);
    try {
      const res = await docsApi.updateTeam({
        team_name: adminTeamName,
        members: adminTeamMembers
      });
      alert(res.message);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update team members.");
    } finally {
      setSavingTeam(false);
    }
  };

  // Export options
  const handleExportMarkdown = () => {
    if (!config) return;
    let md = `# ${config.team_name} - Project Documentation\n\n`;
    md += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    md += `## YC Pitch Deck\n\n`;
    config.sections.filter(s => s.category === 'pitch').forEach(s => {
      md += `### ${s.title}\n\n${s.content}\n\n`;
    });

    md += `## Technical Whitepaper\n\n`;
    config.sections.filter(s => s.category === 'tech').forEach(s => {
      md += `### ${s.title}\n\n${s.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DesiDiet_PustiAI_Documentation.md`;
    a.click();
  };

  // Render Loader
  if (loading && !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-teal-400">
        <RefreshCw className="w-12 h-12 animate-spin mb-4" />
        <span className="text-lg font-medium font-sans">Syncing system docs state...</span>
      </div>
    );
  }

  // 403 Restricted Access Screen
  if (error === "restricted") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
          
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-3">Documentation Private</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The live documentation is scheduled to publish for the judging window from 
            <span className="text-teal-400 font-semibold block mt-1">June 10 (00:00) to June 14 (23:59), 2026.</span>
          </p>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-3 text-left">
              <Clock className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Current System Date</span>
                <span className="text-sm font-mono text-slate-300 block">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {!showAdminLogin ? (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 px-6 rounded-2xl transition duration-200 shadow-lg shadow-teal-900/20 flex items-center justify-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Override Access</span>
            </button>
          ) : (
            <form onSubmit={handleAdminLoginSubmit} className="text-left space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Admin Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@pustiai.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500 transition duration-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500 transition duration-200"
                />
              </div>
              {authError && <div className="text-xs text-red-500">{authError}</div>}
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl transition duration-200 flex items-center justify-center space-x-1"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Authenticate</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-100 mb-2 font-sans">Failed to Connect</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error || "Connection timed out."}</p>
          <button 
            onClick={fetchData} 
            className="bg-teal-600 hover:bg-teal-500 text-white py-2 px-6 rounded-xl font-medium transition duration-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const pitchSections = config.sections.filter(s => s.category === 'pitch');
  const techSections = config.sections.filter(s => s.category === 'tech');

  const currentPitchSec = pitchSections.find(s => s.id === selectedPitchSec) || pitchSections[0];
  const currentTechSec = techSections.find(s => s.id === selectedTechSec) || techSections[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* ─── Premium Header ─── */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 py-12 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center text-teal-400 shadow-inner">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Pushti AI Hub</h1>
                <span className="bg-teal-500/10 text-teal-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-teal-500/20">
                  Live Docs v2.0
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">YC Pitch Deck, Live Metrics & Clinical Technical Specifications</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Status:</span>
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">Public Access Live</span>
            </div>

            {/* Export Markdown */}
            <button
              onClick={handleExportMarkdown}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold py-2 px-4 rounded-xl transition duration-200 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export MD</span>
            </button>

            {/* Admin Bypass Toggle */}
            {config.is_admin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`text-xs font-semibold py-2 px-4 rounded-xl border transition duration-200 flex items-center space-x-1.5 ${
                  activeTab === 'admin' 
                    ? 'bg-teal-600 border-teal-500 text-white' 
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-teal-400'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex border-b border-slate-800/80 space-x-6 overflow-x-auto scrollbar-none pb-px">
          
          <button
            onClick={() => setActiveTab('pitch')}
            className={`py-3.5 border-b-2 font-semibold text-sm tracking-wide transition duration-150 flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'pitch' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>YC Pitch Deck</span>
          </button>

          <button
            onClick={() => setActiveTab('tech')}
            className={`py-3.5 border-b-2 font-semibold text-sm tracking-wide transition duration-150 flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'tech' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Technical Whitepaper</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3.5 border-b-2 font-semibold text-sm tracking-wide transition duration-150 flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'dashboard' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Live System Dashboard</span>
          </button>

          {config.is_admin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-3.5 border-b-2 font-semibold text-sm tracking-wide transition duration-150 flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'admin' 
                  ? 'border-teal-500 text-teal-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin Edit Board</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Layout ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* TAB 1: YC Pitch Deck */}
        {activeTab === 'pitch' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar Sections List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold px-3 mb-3">Pitch Highlights</h3>
              <div className="space-y-1">
                {pitchSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedPitchSec(sec.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition duration-150 flex items-center justify-between group ${
                      selectedPitchSec === sec.id 
                        ? 'bg-teal-600/10 border border-teal-500/20 text-teal-300 font-medium' 
                        : 'hover:bg-slate-900 border border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{sec.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 ${
                      selectedPitchSec === sec.id ? 'text-teal-400' : 'text-slate-600'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Presenter Card */}
            <div className="lg:col-span-3 space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl relative min-h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 blur-3xl rounded-full"></div>
                
                <div>
                  <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest block mb-2">YC PITCH DECK SLIDE</span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 mb-6 border-b border-slate-800 pb-4">{currentPitchSec.title}</h2>
                  
                  {/* Markdown Renderer simulation */}
                  <div className="prose prose-invert max-w-none text-slate-300 text-sm md:text-base leading-relaxed space-y-4 font-sans">
                    {currentPitchSec.content.split('\n\n').map((paragraph, index) => {
                      if (paragraph.startsWith('### ')) {
                        return <h3 key={index} className="text-xl font-bold text-teal-400 mt-6 mb-2">{paragraph.replace('### ', '')}</h3>;
                      }
                      if (paragraph.startsWith('- ')) {
                        return (
                          <ul key={index} className="list-disc pl-6 space-y-2 my-4">
                            {paragraph.split('\n').map((li, i) => (
                              <li key={i}>{li.replace('- ', '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={index}>{paragraph}</p>;
                    })}
                  </div>
                </div>

                {/* Footer Slider Navigation */}
                <div className="flex items-center justify-between border-t border-slate-800 mt-10 pt-6">
                  <div className="text-xs text-slate-500 font-medium">
                    Slide {pitchSections.indexOf(currentPitchSec) + 1} of {pitchSections.length}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      disabled={pitchSections.indexOf(currentPitchSec) === 0}
                      onClick={() => setSelectedPitchSec(pitchSections[pitchSections.indexOf(currentPitchSec) - 1].id)}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition duration-150"
                    >
                      Back
                    </button>
                    <button
                      disabled={pitchSections.indexOf(currentPitchSec) === pitchSections.length - 1}
                      onClick={() => setSelectedPitchSec(pitchSections[pitchSections.indexOf(currentPitchSec) + 1].id)}
                      className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition duration-150"
                    >
                      Next Slide
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── MANDATORY TEAM SHOWCASE SECTION ─── */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">{config.team_name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Founding builders and clinical specialists</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-bold px-3 py-1 rounded-full">
                    {config.team_members.length} Members
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {config.team_members.map((member, index) => (
                    <div 
                      key={index} 
                      className="bg-slate-950 border border-slate-800/85 hover:border-slate-700/80 rounded-2xl p-5 flex items-center space-x-4 shadow-sm transition duration-200"
                    >
                      {/* Consistent styling image frame with fallbacks */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 flex items-center justify-center relative">
                        {member.image_url ? (
                          <img 
                            src={member.image_url} 
                            alt={member.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Replace image with dicebear avatar if error loading
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}&backgroundColor=0d9488`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center text-teal-400 font-bold uppercase text-lg">
                            {member.name.substring(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-200 truncate text-base">{member.name}</h4>
                        <p className="text-xs text-teal-400 font-medium mt-0.5">{member.role}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1.5 truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Technical Whitepaper */}
        {activeTab === 'tech' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar Sections List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold px-3 mb-3">System Blueprint</h3>
              <div className="space-y-1">
                {techSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedTechSec(sec.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition duration-150 flex items-center justify-between group ${
                      selectedTechSec === sec.id 
                        ? 'bg-teal-600/10 border border-teal-500/20 text-teal-300 font-medium' 
                        : 'hover:bg-slate-900 border border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{sec.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 ${
                      selectedTechSec === sec.id ? 'text-teal-400' : 'text-slate-600'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Document Content Display */}
            <div className="lg:col-span-3 space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl">
                
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest block mb-2">TECHNICAL WHITEPAPER</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 mb-6 border-b border-slate-800 pb-4">{currentTechSec.title}</h2>
                
                {/* Custom SVG Architecture Diagram for 'tech_architecture' */}
                {currentTechSec.id === 'tech_architecture' && (
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 mb-8 flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 block">Interactive Architecture Flow (SVG)</span>
                    
                    <svg viewBox="0 0 800 320" className="w-full max-w-2xl h-auto">
                      <defs>
                        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0284c7" />
                          <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                      </defs>

                      {/* Connection Paths */}
                      <path d="M140,160 L240,160" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M360,160 L460,160" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M580,160 L660,160" stroke="#334155" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                      
                      {/* Pulse Data Line Animation */}
                      <circle r="4" fill="#2dd4bf">
                        <animateMotion dur="4s" repeatCount="indefinite" path="M140,160 L240,160" />
                      </circle>
                      <circle r="4" fill="#0ea5e9">
                        <animateMotion dur="4s" repeatCount="indefinite" path="M360,160 L460,160" />
                      </circle>

                      {/* Component Nodes */}
                      {/* Client App */}
                      <rect x="20" y="110" width="120" height="100" rx="16" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                      <text x="80" y="150" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">React Native App</text>
                      <text x="80" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">(Expo Client)</text>

                      {/* API Gateway */}
                      <rect x="240" y="110" width="120" height="100" rx="16" fill="url(#tealGrad)" stroke="#0d9488" strokeWidth="1" />
                      <text x="300" y="150" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">FastAPI Gateway</text>
                      <text x="300" y="170" fill="#ccfbf1" fontSize="10" textAnchor="middle">(Uvicorn Router)</text>

                      {/* GraphRAG Planner */}
                      <rect x="460" y="110" width="120" height="100" rx="16" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                      <text x="520" y="150" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">GraphRAG Planner</text>
                      <text x="520" y="170" fill="#94a3b8" fontSize="10" textAnchor="middle">(Context Compiler)</text>

                      {/* Neo4j Database */}
                      <rect x="660" y="110" width="120" height="100" rx="16" fill="url(#purpleGrad)" stroke="#0284c7" strokeWidth="1" />
                      <text x="720" y="150" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">Neo4j Database</text>
                      <text x="720" y="170" fill="#e0f2fe" fontSize="10" textAnchor="middle">(Knowledge Graph)</text>
                    </svg>
                  </div>
                )}

                {/* Custom SVG Data Flow Diagram for 'tech_data_flow' */}
                {currentTechSec.id === 'tech_data_flow' && (
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 mb-8 flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 block">Execution Pipeline (SVG)</span>
                    
                    <svg viewBox="0 0 800 240" className="w-full max-w-2xl h-auto">
                      <path d="M120,120 L220,120" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M340,120 L440,120" stroke="#334155" strokeWidth="2" fill="none" />
                      <path d="M560,120 L660,120" stroke="#334155" strokeWidth="2" fill="none" />

                      {/* Steps */}
                      {/* Step 1: Input */}
                      <circle cx="70" cy="120" r="50" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                      <text x="70" y="115" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">1. INPUT</text>
                      <text x="70" y="132" fill="#94a3b8" fontSize="9" textAnchor="middle">User food log</text>

                      {/* Step 2: Extraction */}
                      <circle cx="280" cy="120" r="60" fill="#0d9488" stroke="#14b8a6" strokeWidth="1.5" />
                      <text x="280" y="115" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">2. EXTRACTION</text>
                      <text x="280" y="132" fill="#e2fcf7" fontSize="9" textAnchor="middle">NLP Token mapping</text>

                      {/* Step 3: Graph Audit */}
                      <circle cx="500" cy="120" r="60" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                      <text x="500" y="115" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">3. GRAPH AUDIT</text>
                      <text x="500" y="132" fill="#94a3b8" fontSize="9" textAnchor="middle">Check compatibility</text>

                      {/* Step 4: Stream response */}
                      <circle cx="720" cy="120" r="50" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
                      <text x="720" y="115" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">4. STREAM</text>
                      <text x="720" y="132" fill="#0ea5e9" fontSize="9" textAnchor="middle">Safe tokens</text>
                    </svg>
                  </div>
                )}

                {/* Markdown text body */}
                <div className="prose prose-invert max-w-none text-slate-300 text-sm md:text-base leading-relaxed space-y-4">
                  {currentTechSec.content.split('\n\n').map((paragraph, index) => {
                    // Skip codeblocks rendering as text
                    if (paragraph.includes('```')) return null;

                    if (paragraph.startsWith('### ')) {
                      return <h3 key={index} className="text-xl font-bold text-teal-400 mt-6 mb-2">{paragraph.replace('### ', '')}</h3>;
                    }
                    if (paragraph.startsWith('#### ')) {
                      return <h4 key={index} className="text-lg font-semibold text-slate-200 mt-4 mb-2">{paragraph.replace('#### ', '')}</h4>;
                    }
                    if (paragraph.startsWith('- ')) {
                      return (
                        <ul key={index} className="list-disc pl-6 space-y-2 my-4">
                          {paragraph.split('\n').map((li, i) => (
                            <li key={i}>{li.replace('- ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={index}>{paragraph}</p>;
                  })}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Live System Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-8">
            
            {/* Pulsing Sync Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-100">Live In-Memory Statistics</h3>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Metrics synced automatically with PostgreSQL production states and Neo4j nodes.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Last Heartbeat</span>
                <span className="text-xs font-mono text-slate-300">{new Date(stats.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Metrics Counters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Registered Patients</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-100 mt-1 block">
                    {stats.database_counts.registered_patients}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Active users in local clinic systems</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Diet Plans Generated</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-100 mt-1 block">
                    {stats.database_counts.custom_meal_plans_generated}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">GraphRAG optimized profiles</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">AI Conversations</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-100 mt-1 block">
                    {stats.database_counts.ai_consultation_turns}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Safe nutrition audit sessions</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Meals Logged</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-100 mt-1 block">
                    {stats.database_counts.tracked_meals_logged}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Daily local Bangladeshi food items</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Health Trackings</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-100 mt-1 block">
                    {stats.database_counts.patient_health_logs}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Blood pressure, hba1c, weight updates</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Active Reminders</span>
                  <span className="text-2xl font-extrabold font-mono text-slate-100 mt-1 block">
                    {stats.database_counts.prescribed_medicine_reminders}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Daily medicine schedules saved</span>
                </div>
              </div>

            </div>

            {/* Knowledge Graph Status Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="font-bold text-slate-100 mb-4 flex items-center space-x-2">
                  <Database className="w-4 h-4 text-teal-400" />
                  <span>Knowledge Graph Status</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl">
                    <span className="text-xs text-slate-400">Connection status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      stats.knowledge_graph.status === 'connected' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {stats.knowledge_graph.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl">
                    <span className="text-xs text-slate-400">Food Nodes Loaded</span>
                    <span className="text-xs font-mono font-bold text-slate-200">{stats.knowledge_graph.food_nodes_loaded}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl">
                    <span className="text-xs text-slate-400">Disease Constraints</span>
                    <span className="text-xs font-mono font-bold text-slate-200">{stats.knowledge_graph.clinical_disease_nodes}</span>
                  </div>
                </div>
              </div>

              {/* API Exposure Matrix */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-teal-400" />
                    <span>Exposed Gateway Endpoints</span>
                  </h3>
                  
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter API paths..."
                      value={apiSearchQuery}
                      onChange={(e) => setApiSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition duration-200 w-full sm:w-48"
                    />
                  </div>
                </div>

                <div className="max-h-[190px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-950 divide-y divide-slate-850">
                  {stats.api_exposures
                    .filter(api => api.path.toLowerCase().includes(apiSearchQuery.toLowerCase()))
                    .map((api, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 text-xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className={`px-2 py-0.5 rounded font-bold font-mono text-[9px] ${
                            api.method === 'POST' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                            : api.method === 'GET' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-yellow-600/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {api.method}
                          </span>
                          <span className="font-mono text-slate-300 truncate">{api.path}</span>
                        </div>
                        <span className="text-slate-500 text-[10px] hidden sm:inline ml-4">{api.desc}</span>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: Admin Edit Board */}
        {activeTab === 'admin' && config.is_admin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Access Control Config & Scheduling */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Access Control Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Toggle visibility and scheduling parameters instantly</p>
              </div>

              {/* Visibility Switch */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-850 rounded-2xl">
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">Publish Publicly</span>
                    <span className="text-[10px] text-slate-500">Toggle raw route visibility</span>
                  </div>
                  <button
                    onClick={() => setAdminVisibility(!adminVisibility)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${
                      adminVisibility ? 'bg-teal-600' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      adminVisibility ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </button>
                </div>

                {/* Schedule Override Switch */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-850 rounded-2xl">
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">Override Scheduling</span>
                    <span className="text-[10px] text-slate-500">Ignore date window limits</span>
                  </div>
                  <button
                    onClick={() => setAdminOverrideSchedule(!adminOverrideSchedule)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${
                      adminOverrideSchedule ? 'bg-teal-600' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      adminOverrideSchedule ? 'translate-x-6' : 'translate-x-0'
                    }`}></div>
                  </button>
                </div>
              </div>

              {/* Date pickers (disabled if override schedule is true) */}
              <div className={`space-y-4 p-4 bg-slate-950 border border-slate-850 rounded-2xl transition-opacity duration-200 ${
                adminOverrideSchedule ? 'opacity-40 pointer-events-none' : 'opacity-100'
              }`}>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Start Availability Date</label>
                  <input
                    type="datetime-local"
                    value={adminStartDate}
                    onChange={(e) => setAdminStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">End Availability Date</label>
                  <input
                    type="datetime-local"
                    value={adminEndDate}
                    onChange={(e) => setAdminEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateSettings}
                disabled={savingSettings}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition duration-200"
              >
                {savingSettings ? "Updating..." : "Save Visibility Settings"}
              </button>

              {/* Section Reorder Matrix */}
              <div className="border-t border-slate-850 pt-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">Reorder Navigation Layout</h4>
                <div className="space-y-1 max-h-[160px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-950 p-2">
                  {config.sections.map((sec, idx) => (
                    <div key={sec.id} className="flex items-center justify-between p-2 text-xs hover:bg-slate-900 rounded-lg group">
                      <span className="truncate text-slate-400 group-hover:text-slate-200 max-w-[140px]">{sec.title}</span>
                      <div className="flex space-x-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(idx, 'up')}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-400"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === config.sections.length - 1}
                          onClick={() => handleMoveSection(idx, 'down')}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-400"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right side: Editor & Markdown WYSIWYG */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-100 flex items-center space-x-2">
                    <Edit3 className="w-4 h-4 text-teal-400" />
                    <span>Interactive Section Editor</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-sans">Modify contents of any document or pitch slide</p>
                </div>
                
                {/* Selector */}
                <select
                  value={editingSectionId}
                  onChange={(e) => handleSelectEditingSection(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition duration-200"
                >
                  {config.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                  ))}
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Section Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition duration-200"
                />
              </div>

              {/* Textarea */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Markdown Content</label>
                <textarea
                  rows={10}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500 transition duration-200"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUpdateSection}
                  disabled={savingSection}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition duration-200 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSection ? "Saving..." : "Save Section"}</span>
                </button>
              </div>

              {/* Team profile showcase configuration */}
              <div className="border-t border-slate-850 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 flex items-center space-x-2 text-sm">
                      <Users className="w-4 h-4 text-teal-400" />
                      <span>Team Showcase Settings</span>
                    </h3>
                  </div>
                  <button
                    onClick={handleAddTeamMember}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-400 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center space-x-1 transition duration-150"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Member</span>
                  </button>
                </div>

                {/* Team Name */}
                <div>
                  <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Team/Group Name</label>
                  <input
                    type="text"
                    value={adminTeamName}
                    onChange={(e) => setAdminTeamName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Members list */}
                <div className="space-y-4 max-h-[220px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-950 p-3">
                  {adminTeamMembers.map((member, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-850 rounded-xl p-3 space-y-3 relative">
                      <button
                        onClick={() => handleRemoveTeamMember(idx)}
                        className="absolute top-2.5 right-2.5 p-1 bg-red-950 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">Name</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleUpdateMemberField(idx, 'name', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">Role</label>
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) => handleUpdateMemberField(idx, 'role', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">Email</label>
                          <input
                            type="text"
                            value={member.email}
                            onChange={(e) => handleUpdateMemberField(idx, 'email', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Image URL (Optional)</label>
                        <input
                          type="text"
                          placeholder="Leave blank for fallback initial avatar"
                          value={member.image_url || ''}
                          onChange={(e) => handleUpdateMemberField(idx, 'image_url', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveTeam}
                    disabled={savingTeam}
                    className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl text-xs transition duration-200 flex items-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingTeam ? "Saving Team..." : "Save Team Showcase"}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
