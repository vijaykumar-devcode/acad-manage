import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChallenge, usePublishChallenge, useRegisterChallenge, useSyncChallenge, useChallengeLeaderboard } from '../../hooks/queries/useChallenges';
import { useCodingAccounts } from '../../hooks/queries/useCodingAccounts';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Trophy, Clock, Activity, Calendar, AlertCircle, RefreshCw, BarChart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { data: challenge, isLoading, error } = useChallenge(id!);
  const { data: accounts, isLoading: accountsLoading } = useCodingAccounts();
  const { data: leaderboard } = useChallengeLeaderboard(id!);
  const [knownRegistered, setKnownRegistered] = useState(false);

  const isStudent = user?.role === 'Student';
  const isCreatorOrAdmin = user?.role === 'Faculty' || user?.role === 'Admin';

  const publishMutation = usePublishChallenge();
  const registerMutation = useRegisterChallenge();
  const syncMutation = useSyncChallenge();

  const handlePublishToggle = async () => {
    if (!challenge) return;
    const newStatus = challenge.publicationStatus === 'Draft';
    try {
      await publishMutation.mutateAsync({ id: challenge._id, publish: newStatus });
      toast.success(newStatus ? 'Challenge published' : 'Challenge unpublished');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update publication status');
    }
  };

  const handleRegister = async () => {
    if (!challenge) return;
    try {
      await registerMutation.mutateAsync(challenge._id);
      toast.success('Successfully registered for the challenge!');
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('already registered')) {
        setKnownRegistered(true);
        toast.success('You are already registered for this challenge.');
      } else {
        toast.error(error.message || 'Failed to register');
      }
    }
  };

  const handleForceSync = async () => {
    if (!challenge) return;
    try {
      await syncMutation.mutateAsync(challenge._id);
      toast.success('Synchronization triggered successfully');
    } catch (error: any) {
      toast.error(error.message || 'Sync failed');
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !challenge) {
    return <div className="p-8 text-center text-red-500 text-lg">Failed to load challenge details.</div>;
  }

  const hasLinkedAccount = accounts?.some(acc => acc.provider === challenge.provider && acc.isVerified);
  const canRegister = isStudent && (challenge.status === 'Upcoming' || challenge.status === 'Active');
  const isSyncing = challenge.syncStatus === 'Syncing';
  
  const isRegisteredInLeaderboard = !!leaderboard?.entries?.some((e: any) => 
    e.rollNo === (user as any)?.rollNumber || e.rollNo === (user as any)?.rollNo
  );
  const isRegistered = knownRegistered || isRegisteredInLeaderboard;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 bg-surface p-6 rounded-xl border border-surface-border">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md",
              challenge.status === 'Active' ? 'bg-green-100 text-green-700' : 
              challenge.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
            )}>
              {challenge.status}
            </span>
            {isCreatorOrAdmin && challenge.publicationStatus === 'Draft' && (
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Draft</span>
            )}
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-md capitalize flex items-center gap-1",
              challenge.provider === 'codeforces' ? 'bg-blue-50 text-blue-700' :
              challenge.provider === 'atcoder' ? 'bg-slate-800 text-white' :
              challenge.provider === 'codechef' ? 'bg-orange-50 text-orange-700' :
              'bg-blue-50 text-blue-700'
            )}>
              <Trophy className="h-3 w-3" /> {challenge.provider}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{challenge.title}</h1>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            <Activity className="h-4 w-4" /> External Contest ID: <span className="font-mono text-slate-700">{challenge.externalContestId}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link to={`/challenges/${challenge._id}/leaderboard`}>
            <Button variant="secondary" className="w-full">
              <BarChart className="h-4 w-4 mr-2" /> Leaderboard & Analytics
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-canvas-alt rounded-lg border border-surface-border">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Calendar className="h-4 w-4" /> <span className="text-sm font-medium">Start Time</span>
                </div>
                <div className="text-slate-900 font-semibold">{new Date(challenge.startTime).toLocaleString()}</div>
              </div>
              <div className="p-4 bg-canvas-alt rounded-lg border border-surface-border">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock className="h-4 w-4" /> <span className="text-sm font-medium">End Time</span>
                </div>
                <div className="text-slate-900 font-semibold">{new Date(challenge.endTime).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          {isCreatorOrAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Administration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-canvas-alt rounded-lg border border-surface-border">
                  <div>
                    <h4 className="font-semibold text-slate-900">Visibility</h4>
                    <p className="text-sm text-slate-500">Toggle whether students can see this challenge.</p>
                  </div>
                  <Button 
                    variant={challenge.publicationStatus === 'Draft' ? 'primary' : 'outline'}
                    onClick={handlePublishToggle}
                    isLoading={publishMutation.isPending}
                  >
                    {challenge.publicationStatus === 'Draft' ? 'Publish Now' : 'Unpublish to Draft'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-canvas-alt rounded-lg border border-surface-border">
                  <div>
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      Synchronization 
                      {isSyncing && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                    </h4>
                    <p className="text-sm text-slate-500">
                      Status: <span className="font-medium capitalize">{challenge.syncStatus}</span>
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleForceSync}
                    isLoading={syncMutation.isPending || isSyncing}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                    Force Sync Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {isStudent && (
            <Card>
              <CardHeader>
                <CardTitle>Registration</CardTitle>
              </CardHeader>
              <CardContent>
                {!canRegister ? (
                  <div className="p-4 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-sm text-center">
                    Registration is only available for Upcoming or Active challenges.
                  </div>
                ) : accountsLoading ? (
                  <div className="flex justify-center p-4"><RefreshCw className="h-5 w-5 animate-spin text-primary" /></div>
                ) : !hasLinkedAccount ? (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-800 font-medium">
                      <AlertCircle className="h-5 w-5" /> Account Required
                    </div>
                    <p className="text-sm text-yellow-700">
                      You need a verified <strong>{challenge.provider}</strong> account linked to your profile to register.
                    </p>
                    <Link to="/profile/accounts">
                      <Button className="w-full" size="sm" variant="secondary">Link Account</Button>
                    </Link>
                  </div>
                ) : isRegistered ? (
                  <Button 
                    className="w-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-default" 
                    size="lg"
                  >
                    Already Registered
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleRegister}
                    isLoading={registerMutation.isPending}
                  >
                    Register for Challenge
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", 
                  challenge.syncStatus === 'Synced' ? 'bg-green-500' :
                  challenge.syncStatus === 'Syncing' ? 'bg-blue-500 animate-pulse' :
                  challenge.syncStatus === 'Failed' ? 'bg-red-500' : 'bg-slate-300'
                )} />
                <span className="font-medium capitalize">{challenge.syncStatus}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Leaderboards are updated automatically in the background.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
