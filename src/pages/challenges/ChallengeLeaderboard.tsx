import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChallenge, useChallengeLeaderboard, useChallengeAnalytics } from '../../hooks/queries/useChallenges';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Trophy, ArrowLeft, RefreshCw, BarChart2, Activity, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ChallengeLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('leaderboard');

  const { data: challenge, isLoading: challengeLoading } = useChallenge(id!);
  const { data: leaderboard, isLoading: leaderboardLoading, error: leaderboardError } = useChallengeLeaderboard(id!);
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useChallengeAnalytics(id!);

  const isCreatorOrAdmin = user?.role === 'Faculty' || user?.role === 'Admin';

  if (challengeLoading) {
    return <div className="p-8 flex justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!challenge) {
    return <div className="p-8 text-center text-slate-500">Challenge not found.</div>;
  }

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];
  if (isCreatorOrAdmin) {
    tabs.push({ id: 'analytics', label: 'Analytics', icon: BarChart2 });
  }

  const isSyncPending = challenge.syncStatus === 'Pending' || challenge.syncStatus === 'NotRequired';
  const isSyncing = challenge.syncStatus === 'Syncing';

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-4">
        <Link to={`/challenges/${id}`}>
          <Button variant="ghost" size="sm" className="pl-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Challenge
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{challenge.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-sm">
          <span className="text-slate-500">Status:</span>
          <span className="font-medium capitalize text-slate-700">{challenge.status}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Sync:</span>
          <span className="font-medium capitalize text-slate-700 flex items-center gap-1">
            {challenge.syncStatus}
            {isSyncing && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
          </span>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'leaderboard' && (
        <div className="space-y-4 mt-6">
          {leaderboardLoading ? (
            <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
          ) : leaderboardError ? (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load leaderboard.</div>
          ) : isSyncPending || isSyncing ? (
            <div className="text-center p-12 bg-surface border border-surface-border border-dashed rounded-xl space-y-3">
              <Activity className="h-12 w-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-medium text-slate-900">Leaderboard not available yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                {isSyncing 
                  ? 'Synchronization is currently in progress. The leaderboard will appear shortly.' 
                  : 'The contest results have not been synchronized yet.'}
              </p>
            </div>
          ) : !leaderboard || !leaderboard.entries || leaderboard.entries.length === 0 ? (
            <div className="text-center p-12 bg-surface border border-surface-border rounded-xl">
              <p className="text-slate-500">No participants found for this challenge.</p>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-surface-border overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Name / Roll No</th>
                    <th className="px-6 py-4">Handle</th>
                    <th className="px-6 py-4 text-center">Solved</th>
                    <th className="px-6 py-4 text-center">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.entries.map((entry: any) => (
                    <tr key={entry.participantId || entry.handle} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-bold text-lg", 
                            entry.leaderboardRank === 1 ? "text-yellow-500" :
                            entry.leaderboardRank === 2 ? "text-slate-400" :
                            entry.leaderboardRank === 3 ? "text-amber-700" : "text-slate-700"
                          )}>
                            #{entry.leaderboardRank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{entry.name}</div>
                        <div className="text-xs text-slate-500">{entry.rollNo}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700">
                        {entry.handle}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-primary">
                        {entry.solvedCount}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {entry.penalty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && isCreatorOrAdmin && (
        <div className="space-y-6 mt-6">
          {analyticsLoading ? (
            <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
          ) : analyticsError || !analytics ? (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load analytics or access denied.</div>
          ) : analytics.totalParticipants === 0 ? (
            <div className="text-center p-12 bg-surface border border-surface-border rounded-xl">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No participation data available for analytics.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Registered" value={analytics.totalRegistered} icon={Users} />
                <StatCard title="Participation Rate" value={`${analytics.participationRate}%`} icon={Activity} />
                <StatCard title="Avg Solved" value={analytics.averageSolvedCount.toFixed(1)} icon={Trophy} />
                <StatCard title="Avg Penalty" value={Math.round(analytics.averagePenalty)} icon={BarChart2} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Problem-wise Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
                        <tr>
                          <th className="px-4 py-3">Problem Index</th>
                          <th className="px-4 py-3 text-center">Attempted By</th>
                          <th className="px-4 py-3 text-center">Solved By</th>
                          <th className="px-4 py-3 text-right">Solve Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.problemStats.map((prob: any) => (
                          <tr key={prob.problemIndex} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                            <td className="px-4 py-3 font-semibold text-slate-900">{prob.problemIndex}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{prob.attemptedCount}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{prob.solvedCount}</td>
                            <td className="px-4 py-3 text-right font-medium text-primary">{prob.solveRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
