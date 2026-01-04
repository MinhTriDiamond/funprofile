import React from 'react';

interface MermaidDiagramProps {
  title?: string;
  children: React.ReactNode;
}

// Simple visual representation without mermaid library
export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ title, children }) => {
  return (
    <div className="my-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-border">
      {title && (
        <h4 className="text-lg font-semibold text-foreground mb-4 text-center">{title}</h4>
      )}
      {children}
    </div>
  );
};

// Architecture diagram component
export const ArchitectureDiagram: React.FC = () => {
  return (
    <MermaidDiagram title="🏗️ Kiến Trúc FUN Ecosystem">
      <div className="flex flex-col items-center gap-6">
        {/* Fun Profile - Center Hub */}
        <div className="relative">
          <div className="w-48 h-24 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/30">
            <div className="text-center">
              <div className="text-lg">🎯 FUN Profile</div>
              <div className="text-xs opacity-80">Auth Hub + SSO</div>
            </div>
          </div>
        </div>

        {/* Arrows */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>↑↓</span>
          <span className="text-xs">OAuth 2.0 + Webhooks</span>
          <span>↑↓</span>
        </div>

        {/* Other Platforms */}
        <div className="flex flex-wrap justify-center gap-4">
          <div className="w-36 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/30">
            <div className="text-center">
              <div>🌾 FUN Farm</div>
              <div className="text-xs opacity-80">Farming Game</div>
            </div>
          </div>
          <div className="w-36 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
            <div className="text-center">
              <div>🎮 FUN Play</div>
              <div className="text-xs opacity-80">Mini Games</div>
            </div>
          </div>
          <div className="w-36 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            <div className="text-center">
              <div>🌍 FUN Planet</div>
              <div className="text-xs opacity-80">Metaverse</div>
            </div>
          </div>
        </div>

        {/* Shared Resources */}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <div className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-full text-sm">
            👤 Unified Account
          </div>
          <div className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-full text-sm">
            💰 Shared Wallet
          </div>
          <div className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-full text-sm">
            🏆 Cross-Platform Rewards
          </div>
        </div>
      </div>
    </MermaidDiagram>
  );
};

// OAuth Flow diagram
export const OAuthFlowDiagram: React.FC = () => {
  return (
    <MermaidDiagram title="🔐 OAuth 2.0 Authorization Flow">
      <div className="space-y-4">
        {[
          { step: 1, from: 'User', to: 'Fun Farm', action: 'Click "Đăng nhập bằng Fun Profile"' },
          { step: 2, from: 'Fun Farm', to: 'Fun Profile', action: 'Redirect → /auth/authorize?client_id=fun_farm' },
          { step: 3, from: 'User', to: 'Fun Profile', action: 'Đăng nhập (nếu chưa login)' },
          { step: 4, from: 'Fun Profile', to: 'Fun Farm', action: 'Redirect với authorization code' },
          { step: 5, from: 'Fun Farm', to: 'Fun Profile', action: 'Exchange code → tokens (Backend)' },
          { step: 6, from: 'Fun Profile', to: 'Fun Farm', action: 'Trả về access_token + user data' },
        ].map((item) => (
          <div key={item.step} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-border">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
              {item.step}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{item.from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium text-foreground">{item.to}</span>
              </div>
              <div className="text-xs text-muted-foreground">{item.action}</div>
            </div>
          </div>
        ))}
      </div>
    </MermaidDiagram>
  );
};

// Proxy Sign Up Flow diagram
export const ProxySignUpDiagram: React.FC = () => {
  return (
    <MermaidDiagram title="📝 Proxy Sign Up Flow (Đăng ký từ Platform khác)">
      <div className="space-y-4">
        {[
          { step: 1, from: 'User', to: 'Fun Farm', action: 'Điền form đăng ký tại Fun Farm' },
          { step: 2, from: 'Fun Farm', to: 'Fun Profile API', action: 'POST /sso-register với user data' },
          { step: 3, from: 'Fun Profile', to: 'Database', action: 'Tạo user + profile + tokens' },
          { step: 4, from: 'Fun Profile', to: 'Fun Farm', action: 'Trả về access_token + user info' },
          { step: 5, from: 'Fun Farm', to: 'User', action: 'Tự động đăng nhập user' },
        ].map((item) => (
          <div key={item.step} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-border">
            <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              {item.step}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{item.from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium text-foreground">{item.to}</span>
              </div>
              <div className="text-xs text-muted-foreground">{item.action}</div>
            </div>
          </div>
        ))}
      </div>
    </MermaidDiagram>
  );
};
