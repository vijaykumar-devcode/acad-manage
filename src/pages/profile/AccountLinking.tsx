import React, { useState } from 'react';
import { useCodingAccounts, useLinkAccount, useVerifyAccount, useUnlinkAccount } from '../../hooks/queries/useCodingAccounts';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { CheckCircle2, AlertCircle, Trash2, Copy, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AccountLinking() {
  const { data: accounts, isLoading } = useCodingAccounts();
  const linkMutation = useLinkAccount();
  const verifyMutation = useVerifyAccount();
  const unlinkMutation = useUnlinkAccount();

  const [provider, setProvider] = useState('codeforces');
  const [handle, setHandle] = useState('');
  const [activeToken, setActiveToken] = useState<{ id: string; token: string; instructions?: string } | null>(null);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) {
      toast.error('Handle is required');
      return;
    }
    
    try {
      const result = await linkMutation.mutateAsync({ provider, handle });
      if (result.verificationToken) {
        setActiveToken({ id: result._id, token: result.verificationToken, instructions: result.verificationInstructions });
        setHandle('');
        toast.success('Account linked! Please complete verification.');
      } else {
        setHandle('');
        toast.success('Account linked successfully!');
        // React Query's useLinkAccount mutation usually invalidates the accounts query, 
        // so the list will refresh automatically.
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to link account');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await verifyMutation.mutateAsync(id);
      setActiveToken(null);
      toast.success('Account successfully verified!');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed. Did you follow the instructions?');
    }
  };

  const handleUnlink = async (id: string) => {
    if (!window.confirm('Are you sure you want to unlink this account?')) return;
    try {
      await unlinkMutation.mutateAsync(id);
      if (activeToken?.id === id) setActiveToken(null);
      toast.success('Account unlinked');
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink account');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Linked Accounts</h1>
        <p className="text-slate-500 mt-1">Connect your competitive programming profiles to participate in class challenges.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Link New Provider</CardTitle>
          <CardDescription>Enter your handle to start the verification process.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLink} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">Provider</label>
              <select 
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="codeforces">Codeforces</option>
                <option value="atcoder">AtCoder</option>
                <option value="codechef">CodeChef</option>
              </select>
            </div>
            <div className="flex-2 space-y-2 w-full">
              <label className="text-sm font-medium text-slate-700">Handle / Username</label>
              <input 
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. tourist"
                className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button type="submit" isLoading={linkMutation.isPending}>
              Link Account
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Your Connected Accounts</h2>
        
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
        ) : accounts?.length === 0 ? (
          <div className="text-center p-8 bg-surface border border-surface-border border-dashed rounded-xl">
            <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No accounts linked yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {accounts?.map((acc) => {
              const isActiveVerification = activeToken?.id === acc._id;
              
              return (
                <Card key={acc._id} className={acc.isVerified ? 'border-green-200 bg-green-50/30' : 'border-yellow-200 bg-yellow-50/30'}>
                  <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg capitalize flex items-center gap-2">
                        {acc.provider} 
                        {acc.isVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-base font-medium text-slate-900 mt-1">
                        @{acc.handle}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleUnlink(acc._id)} isLoading={unlinkMutation.isPending && unlinkMutation.variables === acc._id}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </CardHeader>
                  
                  {!acc.isVerified && (
                    <CardContent>
                      {isActiveVerification ? (
                        <div className="bg-white p-4 rounded-lg border border-yellow-200 space-y-3">
                          <p className="text-sm font-medium text-slate-700">Action Required: Verify Ownership</p>
                          <p className="text-sm text-slate-600">
                            {activeToken.instructions || `Complete verification on ${acc.provider}.`}
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="px-3 py-2 bg-slate-100 rounded text-sm flex-1 font-mono">{activeToken.token}</code>
                            <Button variant="outline" size="sm" onClick={() => copyToClipboard(activeToken.token)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button 
                            className="w-full mt-2" 
                            onClick={() => handleVerify(acc._id)}
                            isLoading={verifyMutation.isPending && verifyMutation.variables === acc._id}
                          >
                            Verify Now
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                          onClick={() => {
                            // If token is lost, they might need to unlink and re-link, or we just instruct them
                            toast.error("Verification token not found in current session. Please unlink and link again.");
                          }}
                        >
                          Verification Pending (Token Lost)
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
