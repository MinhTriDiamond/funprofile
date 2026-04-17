import { Card, CardContent } from '@/components/ui/card';
import { Vault, Shield, Award, Heart, GraduationCap, Vote, Coins } from 'lucide-react';

const VAULTS = [
  { key: 'identity_vault_hash', label: 'Identity', icon: Vault, color: 'text-emerald-500' },
  { key: 'trust_vault_hash', label: 'Trust', icon: Shield, color: 'text-sky-500' },
  { key: 'reputation_vault_hash', label: 'Reputation', icon: Award, color: 'text-violet-500' },
  { key: 'contribution_vault_hash', label: 'Contribution', icon: Heart, color: 'text-rose-500' },
  { key: 'credential_vault_hash', label: 'Credential', icon: GraduationCap, color: 'text-amber-500' },
  { key: 'governance_vault_hash', label: 'Governance', icon: Vote, color: 'text-indigo-500' },
  { key: 'economic_access_hash', label: 'Economic Access', icon: Coins, color: 'text-yellow-500' },
] as const;

export function DIBVaultPanel({ dib }: { dib: any }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {VAULTS.map((v) => {
        const Icon = v.icon;
        const hash = dib?.[v.key];
        return (
          <Card key={v.key} className="border-0 shadow-sm">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${v.color}`} />
                <span className="text-xs font-medium">{v.label}</span>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground truncate">
                {hash ? `${hash.slice(0, 16)}…` : 'chưa snapshot'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
